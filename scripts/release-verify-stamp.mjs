// Checks a stamped catalog against the built bundles. Run after stamp-catalog.mjs,
// in the CI build workspace. Read-only. Exits 1 on any problem.
//   node scripts/release-verify-stamp.mjs --tag v0.2.0
// No test runner is involved, so nothing can be skipped or match zero tests.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseTag } from './release-check.mjs';
import { GH_REPO, cdnBase, sri } from './stamp-catalog.mjs';

/** Returns the problems of a stamped catalog text. `wcSri`, `reactSri` and `stubSri` are the expected hashes. */
export function checkStamped(text, { tag, base = cdnBase(tag), wcSri, reactSri, stubSri }) {
  const problems = [];
  const placeholders = [...new Set(text.match(/__[A-Z][A-Z0-9_]*__/g) ?? [])];
  if (placeholders.length > 0) problems.push(`placeholder left in the catalog: ${placeholders.join(', ')}`);
  const { react, webcomponent } = JSON.parse(text)['x-kaltura-adapters'];
  const expected = [
    ['react.cdn', react.cdn, `${base}dist/kaltura-react.mjs`],
    ['react.integrity', react.integrity, reactSri],
    ['react.stubCdn', react.stubCdn, `${base}dist/html-element-stub.mjs`],
    ['react.stubIntegrity', react.stubIntegrity, stubSri],
    ['react.install', react.install, `npm i github:${GH_REPO}#${tag}`],
    ['webcomponent.cdn', webcomponent.cdn, `${base}dist/kaltura-wc.js`],
    ['webcomponent.integrity', webcomponent.integrity, wcSri],
  ];
  for (const [field, actual, want] of expected) if (actual !== want) problems.push(`${field} is ${actual}, expected ${want}`);
  return problems;
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
    const problems = checkStamped(readFileSync(values.catalog, 'utf8'), {
      tag,
      wcSri: sri(readFileSync(join(values.dist, 'kaltura-wc.js'))),
      reactSri: sri(readFileSync(join(values.dist, 'kaltura-react.mjs'))),
      stubSri: sri(readFileSync(join(values.dist, 'html-element-stub.mjs'))),
    });
    if (problems.length > 0) {
      for (const problem of problems) console.error(`FAIL ${problem}`);
      process.exit(1);
    }
    console.log(`OK ${values.catalog} is stamped for ${tag} and matches the bundles in ${values.dist}`);
  } catch (error) {
    console.error(`release-verify-stamp: ${error.message}`);
    process.exit(1);
  }
}
