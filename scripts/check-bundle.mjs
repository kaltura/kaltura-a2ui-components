// Asserts on dist/ after `npm run build`. Exit 1 if any rule fails.
//
// CHECK_BUNDLE_KNOWN_FAILURES=1 turns the rules listed in KNOWN_FAILURES into
// warnings so CI can stay green until the fix lands. Default is strict.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTICES_FILE, bundledPackages, entryHeader } from './gen-notices.mjs';

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
const peerSpecifiers = ['@a2ui/react/v0_9', '@a2ui/web_core/v0_9', '@a2ui/web_core/v0_9/basic_catalog', 'zod'];
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
// a2ui#3158 (ADR 0007): @a2ui/react 0.13 needs HTMLElement when it loads. The
// stub file must be the ESM's first import, so it runs before every peer, and
// it must load Lit (through the basic catalog) before it defines the stub.
if (sources.esm !== undefined) {
  const imports = (source) => [...source.matchAll(/^import\b[^"']*["']([^"']+)["']/gm)].map((m) => m[1]);
  const stubPath = join(dist, 'html-element-stub.mjs');
  const stubImports = existsSync(stubPath) ? imports(readFileSync(stubPath, 'utf8')) : [];
  if (imports(sources.esm)[0] !== './html-element-stub.mjs') {
    fail('ESM-SSR-STUB', `dist/${bundles.esm} does not import ./html-element-stub.mjs first. @a2ui/react would load in Node without it.`);
  }
  if (stubImports.join() !== '@a2ui/web_core/v0_9/basic_catalog') {
    fail('ESM-SSR-STUB', `dist/html-element-stub.mjs must import only @a2ui/web_core/v0_9/basic_catalog, found [${stubImports.join(', ')}].`);
  }
}
if (maps.iife !== undefined) {
  for (const library of ['@a2ui/markdown-it', 'dompurify', 'zod']) {
    if (!maps.iife.sources.some((s) => s.includes(`node_modules/${library}/`))) {
      fail('IIFE-SELF-CONTAINED', `dist/${bundles.iife} does not inline ${library}. The script-tag bundle must be self-contained.`);
    }
  }
}

// F33: the bundles inline MIT, ISC, BSD and Apache code, so dist/ must carry its notices. The
// package list comes from the source maps, so a new dependency is caught without a list to edit.
const noticesPath = join(dist, NOTICES_FILE);
if (!existsSync(noticesPath)) {
  fail('NOTICES-EXISTS', `dist/${NOTICES_FILE} is missing. Run "npm run build" first.`);
} else if (Object.keys(maps).length === Object.keys(bundles).length) {
  const notices = readFileSync(noticesPath, 'utf8');
  for (const pkg of bundledPackages(dist)) {
    if (!notices.includes(`\n${entryHeader(pkg)}\n`)) {
      fail('NOTICES-COMPLETE', `dist/${NOTICES_FILE} does not list ${pkg.name}@${pkg.version}, which is bundled. Run "npm run build:notices".`);
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
