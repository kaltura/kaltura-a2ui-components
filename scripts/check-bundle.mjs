// Asserts on dist/ after `npm run build`. Exit 1 if any rule fails.
//
// CHECK_BUNDLE_KNOWN_FAILURES=1 turns the rules listed in KNOWN_FAILURES into
// warnings so CI can stay green until the fix lands. Default is strict.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const bundles = { esm: 'kaltura-react.mjs', iife: 'kaltura-wc.js' };

// Rule ids that may fail while a fix is pending. Remove each when fixed.
const KNOWN_FAILURES = new Set();
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

// QA-08 (D4, plan 3.2): the ESM keeps @a2ui/react, @a2ui/web_core and zod external, so
// the host supplies one copy of each (one context, one zod, one instanceof).
// The IIFE stays self-contained. The source maps list every bundled file, so
// they show exactly what was inlined, including `createContext` from
// @a2ui/react.
//
// @a2ui/markdown-it and DOMPurify stay inlined in the ESM on purpose:
// @a2ui/markdown-it pins dompurify 3.4.11 (advisories up to 3.4.15), so
// externalising it would hand hosts the vulnerable copy (SEC-23).
const peerLibraries = /node_modules\/(@a2ui\/(react|web_core)|zod)\//;
const peerSpecifiers = ['@a2ui/react/v0_9', '@a2ui/web_core/v0_9', 'zod'];
const maps = {};
for (const [kind, file] of Object.entries(bundles)) {
  const path = join(dist, `${file}.map`);
  if (!existsSync(path)) {
    if (sources[kind] !== undefined) fail('SOURCEMAP-EXISTS', `dist/${file}.map is missing.`);
    continue;
  }
  maps[kind] = JSON.parse(readFileSync(path, 'utf8'));
  if (maps[kind].sourcesContent !== undefined) {
    fail('SOURCEMAP-CONTENT', `dist/${file}.map embeds sourcesContent. Shipped maps must not carry the source text.`);
  }
}

if (maps.esm !== undefined) {
  const inlined = maps.esm.sources.filter((s) => peerLibraries.test(s));
  if (inlined.length > 0) {
    fail('ESM-PEERS', `dist/${bundles.esm} inlines peer libraries (${inlined.length} files, first: ${inlined[0]}). Keep them external.`);
  }
  if (!maps.esm.sources.some((s) => s.includes('node_modules/dompurify/'))) {
    fail('ESM-DOMPURIFY', `dist/${bundles.esm} does not inline DOMPurify. @a2ui/markdown-it would then use the host's pinned, vulnerable copy.`);
  }
}
if (sources.esm !== undefined) {
  for (const specifier of peerSpecifiers) {
    if (!new RegExp(`from\\s*["']${specifier}["']`).test(sources.esm)) {
      fail('ESM-PEERS', `dist/${bundles.esm} does not import "${specifier}" from the host.`);
    }
  }
}
if (maps.iife !== undefined) {
  for (const library of ['@a2ui/markdown-it', 'dompurify', 'zod']) {
    if (!maps.iife.sources.some((s) => s.includes(`node_modules/${library}/`))) {
      fail('IIFE-SELF-CONTAINED', `dist/${bundles.iife} does not inline ${library}. The script-tag bundle must be self-contained.`);
    }
  }
}

// Declarations must not import CSS: the CSS is not shipped under dist/types.
const typesDir = join(dist, 'types');
if (existsSync(typesDir)) {
  for (const entry of readdirSync(typesDir, { recursive: true })) {
    if (!entry.endsWith('.d.ts')) continue;
    if (/\.css['"]/.test(readFileSync(join(typesDir, entry), 'utf8'))) {
      fail('TYPES-CSS', `dist/types/${entry} imports a CSS file that is not shipped.`);
    }
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
