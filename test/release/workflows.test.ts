// @vitest-environment node
// Covers: SEC-09 (least privilege, pinned actions, no npm), QA-09 (tags never move, dist/ is only in
// the release commit), SEC-19 (jsDelivr bytes are checked against the build).
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
  it('SEC-09: runs by hand only, with a version input', () => {
    expect(release).toMatch(/\non:\n {2}workflow_dispatch:\n {4}inputs:\n {6}version:\n(?: {8}.*\n)*? {8}type: string\n {8}required: true\n/);
  });

  it('SEC-09: has no push or tag trigger', () => {
    expect(release.slice(release.indexOf('\non:\n'), release.indexOf('\npermissions:'))).not.toMatch(/^ {2}(push|pull_request|release|schedule):/m);
  });

  it('SEC-09: one release at a time, never cancelled', () => {
    expect(release).toContain('concurrency:\n  group: release\n  cancel-in-progress: false\n');
  });

  it('SEC-09: the first job requires main and the head of origin/main', () => {
    const job = releaseJobs['verify-inputs'] ?? '';
    expect([job.includes(`[ "$GITHUB_REF" = 'refs/heads/main' ]`), job.includes('[ "$head" = "$GITHUB_SHA" ]')]).toEqual([true, true]);
  });

  it('SEC-09: the first job checks the version and that the tag exists neither locally nor on GitHub', () => {
    const job = releaseJobs['verify-inputs'] ?? '';
    expect(['node scripts/release-check.mjs "$VERSION"', 'git rev-parse -q --verify "refs/tags/${TAG}"', 'git ls-remote --tags origin "refs/tags/${TAG}"'].filter(text => !job.includes(text))).toEqual([]);
  });

  it('SEC-09: ci and e2e run again and the build waits for them', () => {
    expect(releaseJobs['build']).toMatch(/needs: \[verify-inputs, ci, e2e\]/);
  });

  it('SEC-09: the build job is read-only and installs without scripts', () => {
    expect([releaseJobs['build']?.includes('permissions:\n      contents: read\n'), releaseJobs['build']?.includes('npm ci --ignore-scripts')]).toEqual([true, true]);
  });

  it.each(['contents: write', 'id-token: write', 'attestations: write', 'environment: release'])('SEC-09: only the release job has %s', text => {
    expect(Object.entries(releaseJobs).filter(([, job]) => job.includes(text)).map(([id]) => id)).toEqual(['release']);
  });

  it('SEC-09: the release job runs no repository code', () => {
    expect(releaseJobs['release']).not.toMatch(/npm |npx |node /);
  });

  it('SEC-09: the release job checks the artifact against SHA256SUMS and hashes.json before it commits', () => {
    const job = releaseJobs['release'] ?? '';
    const order = ['sha256sum --check --strict SHA256SUMS', 'openssl dgst -sha384 -binary', 'git commit'].map(text => job.indexOf(text));
    expect([order.includes(-1), order.join() === [...order].sort((x, y) => x - y).join()]).toEqual([false, true]);
  });

  it('SEC-09: the release job attests the bundles, the catalog and the archive', () => {
    expect(['actions/attest-build-provenance@', 'dist/kaltura-wc.js', 'dist/kaltura-react.mjs', 'dist/html-element-stub.mjs', 'src/catalog/kaltura_catalog.json', 'dist.tar.gz'].filter(text => !releaseJobs['release']?.includes(text))).toEqual([]);
  });

  it('F32: the release job also attests the SBOM, hashes.json, SHA256SUMS and the notices', () => {
    expect(['assets/sbom.cdx.json', 'assets/hashes.json', 'assets/SHA256SUMS', 'dist/THIRD_PARTY_NOTICES.txt'].filter(text => !releaseJobs['release']?.includes(text))).toEqual([]);
  });

  it('F32: release assets are never replaced', () => {
    expect(release).not.toContain('--clobber');
  });

  it('F32: a new Release is a draft, compared with the build, then published', () => {
    const job = releaseJobs['release'] ?? '';
    const order = ['--verify-tag --draft', 'gh release download', 'diff -r', '--draft=false'].map(text => job.indexOf(text));
    expect([order.includes(-1), order.join() === [...order].sort((x, y) => x - y).join()]).toEqual([false, true]);
  });

  it('F33: the build copies the notices into the assets before the hashes are made', () => {
    const build = releaseJobs['build'] ?? '';
    const [copied, hashed] = ['cp dist/THIRD_PARTY_NOTICES.txt', 'release-hashes.mjs'].map(text => build.indexOf(text));
    expect(copied !== undefined && hashed !== undefined && copied >= 0 && copied < hashed).toBe(true);
  });

  it('SEC-19: the release job checks all three catalog SRI values against hashes.json', () => {
    const job = releaseJobs['release'] ?? '';
    expect(['.webcomponent.integrity == $h[0].cdn["dist/kaltura-wc.js"]', '.react.integrity == $h[0].cdn["dist/kaltura-react.mjs"]', '.react.stubIntegrity == $h[0].cdn["dist/html-element-stub.mjs"]'].filter(text => !job.includes(text))).toEqual([]);
  });

  it('SEC-09: the tag is pushed over SSH with the release deploy key, which is read only in that step', () => {
    const job = releaseJobs['release'] ?? '';
    expect([job.includes('StrictHostKeyChecking=yes'), job.includes('git push "$origin" "refs/tags/$TAG"'), release.match(/RELEASE_TAG_KEY/g)?.length]).toEqual([true, true, 1]);
  });

  it('SEC-09: there is no npm publish, no npm token and no registry', () => {
    expect(release).not.toMatch(/npm publish|NPM_TOKEN|NPM_PUBLISH|registry/);
  });

  it('SEC-09: package.json is private, so npm publish refuses to run', () => {
    expect((JSON.parse(readFileSync('package.json', 'utf8')) as { private?: unknown }).private).toBe(true);
  });
});

describe('QA-09: tags never move and dist/ is never committed to main', () => {
  it('QA-09: the only push is the tag', () => {
    expect([...release.matchAll(/git push[^\n]*/g)].map(match => match[0])).toEqual(['git push "$origin" "refs/tags/$TAG"']);
  });

  it('QA-09: release.yml has no force flag and never names main in a git write', () => {
    expect(release).not.toMatch(/--force|\bpush -f\b|\+refs\/|git push[^\n]*main|git tag -f/);
  });

  it('QA-09: dist/ is force-added only in the release job', () => {
    expect(Object.entries(releaseJobs).filter(([, job]) => job.includes('git add -f dist')).map(([id]) => id)).toEqual(['release']);
  });

  it('QA-09: an existing tag on another commit fails the run instead of moving', () => {
    expect(releaseJobs['release']).toMatch(/elif \[ "\$remote" = "\$commit" \]; then[\s\S]*?else\n[\s\S]*?exit 1/);
  });

  it('QA-09: the release commit has fixed dates, so a re-run makes the same commit', () => {
    expect(['date="$(git log -1 --format=%cI "$SHA")"', 'export GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date"'].filter(text => !releaseJobs['release']?.includes(text))).toEqual([]);
  });

  it('QA-09: the catalog is stamped in the build job from the tag', () => {
    expect(releaseJobs['build']).toContain('node scripts/stamp-catalog.mjs --tag "$TAG"');
  });

  it('QA-09: the stamped catalog is checked by a script that cannot pass by running nothing', () => {
    expect(releaseJobs['build']).toContain('node scripts/release-verify-stamp.mjs --tag "$TAG"');
  });

  it('QA-09: release.yml has no vitest call with a name filter that can match zero tests', () => {
    expect(release).not.toMatch(/vitest|RELEASE_STAMPED/);
  });

  it('QA-09: the stamp check runs after the stamp and before the hashes', () => {
    const build = releaseJobs['build'] ?? '';
    const [stamped, checked, hashed] = ['stamp-catalog.mjs', 'release-verify-stamp.mjs', 'release-hashes.mjs'].map(text => build.indexOf(text));
    expect(stamped !== undefined && checked !== undefined && hashed !== undefined && stamped >= 0 && stamped < checked && checked < hashed).toBe(true);
  });

  it.each(['ci.yml', 'release.yml'])('QA-09: %s fails when dist/ is tracked', name => {
    expect(workflows[name]).toContain('test -z "$(git ls-files dist)"');
  });

  it('QA-09: ci.yml can be called from release.yml', () => {
    expect(workflows['ci.yml']).toMatch(/^ {2}workflow_call:$/m);
  });
});

describe('SEC-09: dry run', () => {
  it('SEC-09: the dry_run input defaults to true', () => {
    expect(release).toMatch(/ {6}dry_run:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: true\n/);
  });

  it('SEC-09: a dry run skips the release job, so nothing is committed, tagged or released', () => {
    expect(releaseJobs['release']).toContain('if: ${{ !inputs.dry_run }}');
  });

  it('SEC-09: a prerelease version is never Latest', () => {
    expect(releaseJobs['release']).toContain(`[ "$PRERELEASE" != 'true' ] || flags=(--prerelease --latest=false)`);
  });
});

describe('SEC-19: the release is verified on jsDelivr', () => {
  it('SEC-19: the CDN check runs after the release job with the build hashes', () => {
    expect([releaseJobs['verify-cdn']?.includes('needs: [verify-inputs, release]'), releaseJobs['verify-cdn']?.includes('verify-cdn.mjs --tag "$TAG" --hashes')]).toEqual([true, true]);
  });

  it('SEC-19: the Release attaches every asset of the build artifact', () => {
    expect(releaseJobs['release']).toContain('gh release create "$TAG" "$out"/assets/*');
  });

  it('SEC-19: the build makes an SBOM, a dist archive, hashes and notes', () => {
    expect(['npm sbom --sbom-format cyclonedx', 'dist.tar.gz', 'release-hashes.mjs', 'release-notes.mjs'].filter(text => !releaseJobs['build']?.includes(text))).toEqual([]);
  });
});

describe('supply chain checks', () => {
  it('SC-09: ci.yml verifies registry signatures after a clean install', () => {
    const audit = jobs(workflows['ci.yml'] ?? '')['audit'] ?? '';
    expect(audit.indexOf('npm ci --ignore-scripts') >= 0 && audit.indexOf('npm ci --ignore-scripts') < audit.indexOf('npm audit signatures')).toBe(true);
  });

  it('SC-10: CodeQL scans GitHub Actions workflows and JavaScript', () => {
    expect(['languages: javascript-typescript\n', 'languages: actions\n'].filter(text => !workflows['security.yml']?.includes(text))).toEqual([]);
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

  it('SEC-09: reads the latest Release with the read-only job token', () => {
    expect([nightly.includes('GH_TOKEN: ${{ github.token }}'), nightly.includes('contents: read')]).toEqual([true, true]);
  });
});
