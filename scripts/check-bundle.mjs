// Asserts on dist/ after `npm run build`. Exit 1 if any rule fails.
//
// CHECK_BUNDLE_KNOWN_FAILURES=1 turns the rules listed in KNOWN_FAILURES into
// warnings so CI can stay green until the fix lands. Default is strict.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const bundles = { esm: 'kaltura-react.mjs', iife: 'kaltura-wc.js' };

// Rule ids that may fail while a fix is pending. Remove each when fixed.
const KNOWN_FAILURES = new Set(['E2E-01']);
const allowKnown = process.env.CHECK_BUNDLE_KNOWN_FAILURES === '1';

const failures = [];
const fail = (id, message) => failures.push({ id, message });

const sources = {};
for (const [kind, file] of Object.entries(bundles)) {
  const path = join(dist, file);
  if (existsSync(path)) sources[kind] = readFileSync(path, 'utf8');
  else fail('BUNDLE-EXISTS', `dist/${file} is missing. Run "npm run build" first.`);
}

for (const [kind, source] of Object.entries(sources)) {
  const file = bundles[kind];
  for (const placeholder of ['__RELEASE_TAG__', '__WC_SRI__']) {
    if (source.includes(placeholder)) {
      fail('PLACEHOLDER', `dist/${file} contains the unreplaced placeholder ${placeholder}. Placeholders belong only in the source catalog.`);
    }
  }
}

if (sources.iife !== undefined) {
  // Browsers have no `process`. Any leftover reference throws on a bare page.
  const hits = sources.iife.match(/\bprocess\.env\b/g)?.length ?? 0;
  if (hits > 0) {
    fail('E2E-01', `dist/${bundles.iife} has ${hits} bare process.env reference(s). The IIFE would throw ReferenceError on a bare page.`);
  }
}

const blocking = failures.filter((f) => !(allowKnown && KNOWN_FAILURES.has(f.id)));
const known = failures.filter((f) => allowKnown && KNOWN_FAILURES.has(f.id));

for (const f of known) console.warn(`KNOWN FAILURE [${f.id}] ${f.message}`);
for (const f of blocking) console.error(`FAIL [${f.id}] ${f.message}`);

if (blocking.length > 0) {
  console.error(`check-bundle: ${blocking.length} rule(s) failed.`);
  process.exit(1);
}
console.log(`check-bundle: passed${known.length > 0 ? ` with ${known.length} known failure(s)` : ''}.`);
