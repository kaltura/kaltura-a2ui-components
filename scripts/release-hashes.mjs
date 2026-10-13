// Writes hashes.json and SHA256SUMS for a release. Run after `npm run build`, the
// catalog stamp and after the other assets are in --out.
//   node scripts/release-hashes.mjs --version 0.2.0 --out "$RUNNER_TEMP/release/assets" [--root DIR]
// hashes.json: SRI of the files jsDelivr serves from the tag (checked by verify-cdn.mjs).
// SHA256SUMS: every file in --out, for people who download the assets.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { sri } from './stamp-catalog.mjs';

// kaltura-react.mjs imports html-element-stub.mjs (ADR 0007), so jsDelivr serves both.
export const CDN_FILES = ['dist/kaltura-wc.js', 'dist/kaltura-react.mjs', 'dist/html-element-stub.mjs', 'src/catalog/kaltura_catalog.json'];

/** Builds the hashes.json object. `read(path)` returns the bytes of a repo file. */
export const buildHashes = ({ version, read }) => ({ version, cdn: Object.fromEntries(CDN_FILES.map(path => [path, sri(read(path))])) });

/** `sha256sum` format: "<hex>  <name>" per file, sorted by name. */
export function sha256sums(files) {
  const lines = [...files]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, bytes }) => `${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  return `${lines.join('\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const { values } = parseArgs({ options: { version: { type: 'string' }, out: { type: 'string' }, root: { type: 'string' } } });
    const root = values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..');
    if (!values.version || !values.out) throw new Error('Usage: --version X.Y.Z --out DIR');
    const hashes = buildHashes({ version: values.version, read: path => readFileSync(join(root, path)) });
    writeFileSync(join(values.out, 'hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`);
    const assets = readdirSync(values.out).filter(name => name !== 'SHA256SUMS');
    writeFileSync(join(values.out, 'SHA256SUMS'), sha256sums(assets.map(name => ({ name, bytes: readFileSync(join(values.out, name)) }))));
    console.log(`Wrote hashes.json and SHA256SUMS for ${assets.length} files in ${values.out}`);
  } catch (error) {
    console.error(`release-hashes: ${error.message}`);
    process.exit(1);
  }
}
