// Fills the release placeholders in the catalog: the tag in the jsDelivr URLs and
// the install line, and the SRI of both bundles and the SSR stub. release.yml runs it in the CI build
// workspace. The stamped catalog is committed only in the release commit the tag
// points to, never on main.
//   node scripts/stamp-catalog.mjs --tag v0.2.0
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseTag } from './release-check.mjs';

export const GH_REPO = 'kaltura/kaltura-a2ui-components';
const TAG_SLOT = '__RELEASE_TAG__';
const PLACEHOLDER_PREFIX = `https://cdn.jsdelivr.net/gh/${GH_REPO}@${TAG_SLOT}/`;

/** `sha384-<base64>` for Subresource Integrity. */
export const sri = (bytes, algorithm = 'sha384') => `${algorithm}-${createHash(algorithm).update(bytes).digest('base64')}`;

/** jsDelivr base URL (with trailing slash) for a tag. `origin` is for tests against a local server. */
export const cdnBase = (tag, origin = 'https://cdn.jsdelivr.net') => `${origin}/gh/${GH_REPO}@${tag}/`;

/**
 * Returns the stamped catalog text. The CDN URLs get `base`, every other tag slot
 * gets `tag`, and the three integrity values get the SRI. Throws if a placeholder is
 * missing or left over.
 */
export function stampCatalog(text, { tag, base = cdnBase(tag), wcSri, reactSri, stubSri }) {
  if (!text.includes(PLACEHOLDER_PREFIX)) throw new Error('Catalog has no CDN placeholder URL to stamp.');
  for (const [key, slot] of [['integrity', '__WC_SRI__'], ['integrity', '__REACT_SRI__'], ['stubIntegrity', '__STUB_SRI__']]) {
    if (!text.includes(`"${key}": "${slot}"`)) throw new Error(`Catalog has no ${slot} placeholder to stamp.`);
  }
  const out = text
    .split(PLACEHOLDER_PREFIX)
    .join(base)
    .split(TAG_SLOT)
    .join(tag)
    .replace('"integrity": "__WC_SRI__"', () => `"integrity": "${wcSri}"`)
    .replace('"integrity": "__REACT_SRI__"', () => `"integrity": "${reactSri}"`)
    .replace('"stubIntegrity": "__STUB_SRI__"', () => `"stubIntegrity": "${stubSri}"`);
  const { react, webcomponent } = JSON.parse(out)['x-kaltura-adapters'];
  if (JSON.stringify([react, webcomponent]).includes('__')) throw new Error('A placeholder is left in the stamped adapters.');
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { values } = parseArgs({
      options: {
        tag: { type: 'string' },
        dist: { type: 'string', default: join(root, 'dist') },
        catalog: { type: 'string', default: join(root, 'src/catalog/kaltura_catalog.json') },
      },
    });
    const { tag } = parseTag(values.tag ?? '');
    const wcSri = sri(readFileSync(join(values.dist, 'kaltura-wc.js')));
    const reactSri = sri(readFileSync(join(values.dist, 'kaltura-react.mjs')));
    const stubSri = sri(readFileSync(join(values.dist, 'html-element-stub.mjs')));
    writeFileSync(values.catalog, stampCatalog(readFileSync(values.catalog, 'utf8'), { tag, wcSri, reactSri, stubSri }));
    console.log(`Stamped ${values.catalog}\n  base ${cdnBase(tag)}\n  kaltura-wc.js ${wcSri}\n  kaltura-react.mjs ${reactSri}\n  html-element-stub.mjs ${stubSri}`);
  } catch (error) {
    console.error(`stamp-catalog: ${error.message}`);
    process.exit(1);
  }
}
