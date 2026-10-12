// @vitest-environment node
// Covers: SEC-09 (least privilege, pinned actions, no long-lived npm token), QA-09 (tags never move,
// dist/ is never committed), SEC-19 (publish is verified against the CDN before the Release).
// Text checks on .github/workflows. `actionlint` and `zizmor` run in security.yml.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const DIR = '.github/workflows';
const workflows = Object.fromEntries(readdirSync(DIR).filter(name => name.endsWith('.yml')).map(name => [name, readFileSync(`${DIR}/${name}`, 'utf8')]));
const release = workflows['release.yml'] ?? '';
const nightly = workflows['nightly-live.yml'] ?? '';
const all = Object.entries(workflows);

/** Job id -> job text, split on the two-space keys under `jobs:`. */
function jobs(text: string): Record<string, string> {
  const body = text.slice(text.indexOf('\njobs:\n') + 6);
  const parts = body.split(/^ {2}([a-z0-9-]+):\n/m);
  return Object.fromEntries(Array.from({ length: (parts.length - 1) / 2 }, (_, i) => [parts[1 + 2 * i], parts[2 + 2 * i]]));
}
const releaseJobs = jobs(release);

describe('SEC-09: workflow files', () => {
  it('SEC-09: the old build-and-release workflow is gone and release.yml and nightly-live.yml exist', () => {
    expect(Object.keys(workflows)).toEqual(expect.arrayContaining(['release.yml', 'nightly-live.yml']));
    expect(Object.keys(workflows)).not.toContain('build-and-release.yml');
  });

  it.each(all)('SEC-09: %s pins every external action by commit SHA with a version comment', (_name, text) => {
    const uses = [...text.matchAll(/^\s*(?:- )?uses: (\S.*)$/gm)].map(match => match[1] ?? '').filter(value => !value.startsWith('./'));
    expect(uses.filter(value => !/^[\w./-]+@[0-9a-f]{40} # v\d+(\.\d+)*$/.test(value))).toEqual([]);
  });

  it.each(all)('SEC-09: %s sets top-level permissions', (_name, text) => {
    expect(text).toMatch(/^permissions:/m);
  });

  it.each(all)('SEC-09: %s gives every job a timeout', (_name, text) => {
    const missing = Object.entries(jobs(text)).filter(([, job]) => !/^\s+uses: \.\//m.test(job) && !/^ {4}timeout-minutes: \d+$/m.test(job));
    expect(missing.map(([id]) => id)).toEqual([]);
  });

  it.each(all)('SEC-09: %s checkouts do not persist credentials', (_name, text) => {
    const checkouts = text.match(/actions\/checkout@/g)?.length ?? 0;
    expect(text.match(/persist-credentials: false/g)?.length ?? 0).toBe(checkouts);
  });

  it.each(all)('SEC-09: %s has no long-lived npm token', (_name, text) => {
    expect(text).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|registry-url/);
  });

  it.each(all.filter(([name]) => name !== 'release.yml'))('SEC-09: %s has no OIDC token and no write permission', (_name, text) => {
    expect(text).not.toMatch(/id-token: write|contents: write/);
  });
});

describe('SEC-09: release.yml jobs', () => {
  it('SEC-09: runs on v* tags only', () => {
    expect(release).toMatch(/on:\n {2}push:\n {4}tags:\n {6}- 'v\*'\n/);
  });

  it('SEC-09: the first job requires the tag commit to be an ancestor of origin/main', () => {
    expect(releaseJobs['verify-tag']).toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main');
  });

  it('SEC-09: ci and e2e run again on the tag and the build waits for them', () => {
    expect(releaseJobs['build']).toMatch(/needs: \[verify-tag, ci, e2e\]/);
  });

  it('SEC-09: the build job is read-only and installs without scripts', () => {
    expect([releaseJobs['build']?.includes('permissions:\n      contents: read\n'), releaseJobs['build']?.includes('npm ci --ignore-scripts')]).toEqual([true, true]);
  });

  it('SEC-09: only publish can mint an OIDC token, and it runs under the release environment', () => {
    const withToken = Object.entries(releaseJobs).filter(([, job]) => job.includes('id-token: write')).map(([id]) => id);
    expect([withToken, releaseJobs['publish']?.includes('environment: release')]).toEqual([['publish'], true]);
  });

  it('SEC-09: publish runs no repository code: no checkout, no npm scripts', () => {
    expect(releaseJobs['publish']).not.toMatch(/actions\/checkout|npm (ci|run|install)|npx /);
  });

  it('SEC-09: publish uses provenance and publishes the built tarball', () => {
    expect(releaseJobs['publish']).toContain('npm publish "$tarball" --access public --provenance --tag "$NPM_TAG"');
  });

  it('SEC-09: only the Release job can write to the repository', () => {
    const writers = Object.entries(releaseJobs).filter(([, job]) => job.includes('contents: write')).map(([id]) => id);
    expect(writers).toEqual(['release']);
  });

  it('SEC-09: publish and the CDN check are skipped unless NPM_PUBLISH is true', () => {
    expect([releaseJobs['publish'], releaseJobs['verify-cdn']].map(job => job?.includes("needs.build.outputs.npm_publish == 'true'"))).toEqual([true, true]);
  });

  it('SEC-09: publish uses the Node major from .nvmrc', () => {
    expect(releaseJobs['publish']).toContain(`node-version: ${readFileSync('.nvmrc', 'utf8').trim()}\n`);
  });
});

describe('QA-09: tags never move and dist/ is never committed', () => {
  it('QA-09: release.yml has no git write command and no force flag', () => {
    expect(release).not.toMatch(/git (push|tag|add|commit|config)|--force|-f "/);
  });

  it('QA-09: the catalog is stamped in the build job from the tag', () => {
    expect(releaseJobs['build']).toContain('node scripts/stamp-catalog.mjs --mode "$MODE" --tag "$TAG"');
  });

  it('QA-09: the stamped catalog is checked by a script that cannot pass by running nothing', () => {
    expect(releaseJobs['build']).toContain('node scripts/release-verify-stamp.mjs --mode "$MODE" --tag "$TAG"');
  });

  it('QA-09: release.yml has no vitest call with a name filter that can match zero tests', () => {
    expect(release).not.toMatch(/vitest|RELEASE_STAMPED/);
  });

  it('QA-09: the stamp check runs after the stamp and before the artifact is packed', () => {
    const build = releaseJobs['build'] ?? '';
    const [stamped, checked, packed] = ['stamp-catalog.mjs', 'release-verify-stamp.mjs', 'release-hashes.mjs'].map(text => build.indexOf(text));
    expect(stamped !== undefined && checked !== undefined && packed !== undefined && stamped >= 0 && stamped < checked && checked < packed).toBe(true);
  });

  it.each(['ci.yml', 'release.yml'])('QA-09: %s fails when dist/ is tracked', name => {
    expect(workflows[name]).toContain('test -z "$(git ls-files dist)"');
  });

  it('QA-09: ci.yml can be called from release.yml', () => {
    expect(workflows['ci.yml']).toMatch(/^ {2}workflow_call:$/m);
  });
});

describe('SEC-09: fallback (NPM_PUBLISH is not true) and dry run', () => {
  it('SEC-09: can be run by hand with a dry_run input that defaults to true', () => {
    expect(release).toMatch(/workflow_dispatch:\n {4}inputs:\n {6}dry_run:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: true\n/);
  });

  it('SEC-09: a dry run turns publish off and skips the Release', () => {
    const buildJob = releaseJobs['build'] ?? '';
    expect([
      buildJob.includes('DRY_RUN: ${{ inputs.dry_run }}'),
      /if \[ "\$DRY_RUN" = 'true' \]; then[\s\S]*?publish=false/.test(buildJob),
      releaseJobs['release']?.includes("needs.build.outputs.dry_run != 'true'"),
    ]).toEqual([true, true, true]);
  });

  it('SEC-09: without npm the Release is always a prerelease and never Latest', () => {
    expect(releaseJobs['release']).toMatch(/if \[ "\$NPM_PUBLISHED" = 'true' \] && \[ "\$NPM_TAG" = 'latest' \]; then\n\s+flags=\(\)\n\s+else\n\s+flags=\(--prerelease --latest=false\)\n/);
  });

  it('SEC-09: the flags also apply when the Release already exists', () => {
    expect(releaseJobs['release']).toContain('gh release edit "$TAG" --repo "$GITHUB_REPOSITORY" "${flags[@]}"');
  });

  it('SEC-09: the fallback notes say it is not on npm or a CDN', () => {
    expect(releaseJobs['release']).toContain('This version is not on npm and not on a CDN.');
  });
});

describe('SEC-19: publish is verified before the Release', () => {
  it('SEC-19: the CDN check runs after publish with the build hashes', () => {
    expect([releaseJobs['verify-cdn']?.includes('needs: [verify-tag, build, publish]'), releaseJobs['verify-cdn']?.includes('--hashes')]).toEqual([true, true]);
  });

  it('SEC-19: the Release waits for the CDN check', () => {
    expect(releaseJobs['release']).toMatch(/needs: \[verify-tag, build, publish, verify-cdn\]/);
  });

  it('SEC-19: the Release attaches every file of the build artifact', () => {
    expect(releaseJobs['release']).toContain('gh release create "$TAG" "$out"/*');
  });

  it('SEC-19: the build makes an SBOM, a dist archive and hashes', () => {
    expect(['npm sbom --sbom-format cyclonedx', 'dist.tar.gz', 'release-hashes.mjs'].filter(text => !releaseJobs['build']?.includes(text))).toEqual([]);
  });
});

describe('ci.yml Node matrix', () => {
  const unit = jobs(workflows['ci.yml'] ?? '')['unit'] ?? '';
  const nvmrc = readFileSync('.nvmrc', 'utf8').trim();

  it('unit tests run on the .nvmrc major and on Node 26', () => {
    expect(unit).toContain(`node: ['${nvmrc}', '26']`);
  });

  it('only the .nvmrc leg can fail the workflow', () => {
    expect(unit).toContain(`continue-on-error: \${{ matrix.node != '${nvmrc}' }}`);
  });
});

describe('SEC-09: nightly-live.yml', () => {
  it('SEC-09: runs on a schedule and by hand', () => {
    expect([nightly.includes('schedule:'), nightly.includes('workflow_dispatch:')]).toEqual([true, true]);
  });

  it('SEC-09: is read-only, uses no secrets and opens no issues', () => {
    const code = nightly.replace(/^\s*#.*$/gm, '');
    expect(code).not.toMatch(/secrets\.|issues|gh issue|: write/);
  });

  it('SEC-09: checks the CDN and the Unisphere loader', () => {
    expect(['verify-cdn.mjs --latest', 'release-unisphere-smoke.mjs'].filter(text => !nightly.includes(text))).toEqual([]);
  });
});
