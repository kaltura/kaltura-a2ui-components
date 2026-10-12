// Fills the release placeholders in the catalog. Run in the CI build workspace
// only, never commit the result.
//   node scripts/stamp-catalog.mjs --mode npm --tag v0.2.0
// npm mode points the CDN URLs at jsDelivr's npm path (needs a published package).
// gh mode keeps the old jsDelivr gh path that tags up to v0.1.4 used.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseTag } from './release-check.mjs';

export const GH_REPO = 'kaltura/kaltura-a2ui-components';
const PLACEHOLDER_PREFIX = `https://cdn.jsdelivr.net/gh/${GH_REPO}@__RELEASE_TAG__/`;

/** `sha384-<base64>` for Subresource Integrity. */
export const sri = (bytes, algorithm = 'sha384') => `${algorithm}-${createHash(algorithm).update(bytes).digest('base64')}`;

/** Base URL (with trailing slash) that jsDelivr serves the package from. */
export function cdnBase(mode, { name, version, tag }) {
  if (mode === 'npm') return `https://cdn.jsdelivr.net/npm/${name}@${version}/`;
  if (mode === 'gh') return `https://cdn.jsdelivr.net/gh/${GH_REPO}@${tag}/`;
  throw new Error(`Unknown mode "${mode}". Use npm or gh.`);
}

/**
 * Returns the stamped catalog text. Only the two `cdn` URLs and the two integrity
 * values are touched. Throws if a placeholder is missing or left over.
 */
export function stampCatalog(text, { base, wcSri, reactSri }) {
  if (!text.includes(PLACEHOLDER_PREFIX)) throw new Error('Catalog has no CDN placeholder URL to stamp.');
  for (const slot of ['__WC_SRI__', '__REACT_SRI__']) {
    if (!text.includes(`"integrity": "${slot}"`)) throw new Error(`Catalog has no ${slot} placeholder to stamp.`);
  }
  const out = text
    .split(PLACEHOLDER_PREFIX)
    .join(base)
    .replace('"integrity": "__WC_SRI__"', () => `"integrity": "${wcSri}"`)
    .replace('"integrity": "__REACT_SRI__"', () => `"integrity": "${reactSri}"`);
  const { react, webcomponent } = JSON.parse(out)['x-kaltura-adapters'];
  if (JSON.stringify([react, webcomponent]).includes('__')) throw new Error('A placeholder is left in the stamped adapters.');
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { values } = parseArgs({
      options: {
        mode: { type: 'string' },
        tag: { type: 'string' },
        dist: { type: 'string', default: join(root, 'dist') },
        catalog: { type: 'string', default: join(root, 'src/catalog/kaltura_catalog.json') },
      },
    });
    const { version } = parseTag(values.tag ?? '');
    const { name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const base = cdnBase(values.mode, { name, version, tag: values.tag });
    const wcSri = sri(readFileSync(join(values.dist, 'kaltura-wc.js')));
    const reactSri = sri(readFileSync(join(values.dist, 'kaltura-react.mjs')));
    writeFileSync(values.catalog, stampCatalog(readFileSync(values.catalog, 'utf8'), { base, wcSri, reactSri }));
    console.log(`Stamped ${values.catalog}\n  base ${base}\n  kaltura-wc.js ${wcSri}\n  kaltura-react.mjs ${reactSri}`);
  } catch (error) {
    console.error(`stamp-catalog: ${error.message}`);
    process.exit(1);
  }
}
