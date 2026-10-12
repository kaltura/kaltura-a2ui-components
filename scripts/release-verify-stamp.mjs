// Checks a stamped catalog against the built bundles. Run after stamp-catalog.mjs,
// in the CI build workspace. Read-only. Exits 1 on any problem.
//   node scripts/release-verify-stamp.mjs --mode npm --tag v0.2.0
// No test runner is involved, so nothing can be skipped or match zero tests.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseTag } from './release-check.mjs';
import { cdnBase, sri } from './stamp-catalog.mjs';

/** Returns the problems of a stamped catalog text. `reactSri` and `wcSri` are the expected hashes. */
export function checkStamped(text, { base, wcSri, reactSri }) {
  const problems = [];
  const placeholders = [...new Set(text.match(/__[A-Z][A-Z0-9_]*__/g) ?? [])];
  if (placeholders.length > 0) problems.push(`placeholder left in the catalog: ${placeholders.join(', ')}`);
  const { react, webcomponent } = JSON.parse(text)['x-kaltura-adapters'];
  const expected = [
    ['react.cdn', react.cdn, `${base}dist/kaltura-react.mjs`],
    ['react.integrity', react.integrity, reactSri],
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
        mode: { type: 'string' },
        tag: { type: 'string' },
        dist: { type: 'string', default: join(root, 'dist') },
        catalog: { type: 'string', default: join(root, 'src/catalog/kaltura_catalog.json') },
      },
    });
    const { version } = parseTag(values.tag ?? '');
    const { name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const problems = checkStamped(readFileSync(values.catalog, 'utf8'), {
      base: cdnBase(values.mode, { name, version, tag: values.tag }),
      wcSri: sri(readFileSync(join(values.dist, 'kaltura-wc.js'))),
      reactSri: sri(readFileSync(join(values.dist, 'kaltura-react.mjs'))),
    });
    if (problems.length > 0) {
      for (const problem of problems) console.error(`FAIL ${problem}`);
      process.exit(1);
    }
    console.log(`OK ${values.catalog} is stamped for ${values.tag} (${values.mode}) and matches the bundles in ${values.dist}`);
  } catch (error) {
    console.error(`release-verify-stamp: ${error.message}`);
    process.exit(1);
  }
}
