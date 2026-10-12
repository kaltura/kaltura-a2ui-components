// Prints the GitHub Release notes: the CHANGELOG section of the version, then the
// install lines and the SRI hashes. Relative links point to the tag on GitHub.
// release.yml runs it in the build job.
//   node scripts/release-notes.mjs --version 0.2.0 --hashes "$assets/hashes.json" > notes.md
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { changelogSection, parseVersion } from './release-check.mjs';
import { GH_REPO, cdnBase } from './stamp-catalog.mjs';

/** Release notes markdown for `version`. `hashes` is the hashes.json object of the build. */
export function releaseNotes({ changelog, version, hashes }) {
  const { tag } = parseVersion(version);
  const { body } = changelogSection(changelog, version);
  const base = cdnBase(tag);
  // The Release page has no repo base, so relative CHANGELOG links would break there.
  const blob = `https://github.com/${GH_REPO}/blob/${tag}/`;
  const linked = body.replace(/\]\((?![a-z][a-z0-9+.-]*:)([^)\s]*)\)/gi, (_match, link) => `](${blob}${link.startsWith('#') ? 'CHANGELOG.md' : ''}${link})`);
  return [
    linked,
    '',
    '### Install',
    '',
    'Script tag (plain HTML). Keep the tag and the `integrity` value pinned:',
    '',
    '```html',
    `<script src="${base}dist/kaltura-wc.js" integrity="${hashes.cdn['dist/kaltura-wc.js']}" crossorigin="anonymous"></script>`,
    '```',
    '',
    'ESM (React, A2UI clients). Not on npm. Install from the git tag:',
    '',
    '```sh',
    `npm i github:${GH_REPO}#${tag} @a2ui/react @a2ui/web_core zod react react-dom`,
    '```',
    '',
    `A2UI catalog: \`${base}src/catalog/kaltura_catalog.json\``,
    '',
    '### Integrity',
    '',
    '| File on jsDelivr | SRI |',
    '|---|---|',
    ...Object.entries(hashes.cdn).map(([path, value]) => `| \`${path}\` | \`${value}\` |`),
    '',
    `\`SHA256SUMS\` covers every asset. Check the build provenance with \`gh attestation verify <file> --repo ${GH_REPO}\`. Steps: [docs/verify-release.md](https://github.com/${GH_REPO}/blob/${tag}/docs/verify-release.md).`,
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { values } = parseArgs({ options: { version: { type: 'string' }, hashes: { type: 'string' } } });
    if (!values.version || !values.hashes) throw new Error('Usage: --version X.Y.Z --hashes FILE');
    process.stdout.write(
      releaseNotes({
        changelog: readFileSync(join(root, 'CHANGELOG.md'), 'utf8'),
        version: values.version,
        hashes: JSON.parse(readFileSync(values.hashes, 'utf8')),
      }),
    );
  } catch (error) {
    console.error(`release-notes: ${error.message}`);
    process.exit(1);
  }
}
