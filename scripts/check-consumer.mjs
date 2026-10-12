// Packs the package, installs the tarball in a clean temp directory and checks
// that a fresh consumer can load it. Run after "npm run build".
//
// 1. Every bare import left in dist/ (ESM, IIFE and .d.ts files) must name a
//    package in dependencies or peerDependencies.
// 2. The ESM entry imports in plain Node, with no bundler.
// 3. The web component entry runs in a bare jsdom window and registers every
//    custom element listed in the catalog.
// 4. QA-08: with the peers installed there is exactly one copy of each shared
//    library, and the host's `Catalog` class is the one the ESM entry uses
//    (an inlined second copy would break `instanceof`).
// 5. QA-08: a host without the peers, or with a conflicting @a2ui/react, gets a
//    clear npm message (`npm ls` "missing", or an ERESOLVE error that names
//    the peer), and the ESM entry fails on import with the package name.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(root, pkg.exports['./catalog'].default), 'utf8'));
const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]);

const failures = [];
const fail = (message) => failures.push(message);

// "import x from 'a'", "import 'a'", "export * from 'a'", "import('a')", "require('a')"
const staticImport = /(?:^|[;}\n])\s*(?:import|export)\s*(?:[^'"()]*?\bfrom\s*)?(['"])([^'"]+)\1/g;
const dynamicImport = /\b(?:import|require)\(\s*(['"])([^'"]+)\1\s*\)/g;
const packageName = (specifier) => specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
const isBare = (specifier) => !/^(\.|\/|node:|data:|https?:)/.test(specifier) && !builtinModules.includes(specifier);

function bareImports(source) {
  const names = new Set();
  for (const pattern of [staticImport, dynamicImport]) {
    for (const match of source.matchAll(pattern)) if (isBare(match[2])) names.add(packageName(match[2]));
  }
  return names;
}

function checkDeclared(file, source) {
  for (const name of bareImports(source)) {
    if (!declared.has(name)) fail(`${file} imports "${name}", which is not in dependencies or peerDependencies.`);
  }
}

for (const file of ['kaltura-react.mjs', 'kaltura-wc.js']) {
  checkDeclared(`dist/${file}`, readFileSync(join(root, 'dist', file), 'utf8'));
}
for (const entry of readdirSync(join(root, 'dist', 'types'), { recursive: true })) {
  if (entry.endsWith('.d.ts')) checkDeclared(`dist/types/${entry}`, readFileSync(join(root, 'dist', 'types', entry), 'utf8'));
}

const work = mkdtempSync(join(tmpdir(), 'a2ui-consumer-'));
try {
  const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], root));
  const tarball = join(work, packed[0].filename);

  const consumer = join(work, 'consumer');
  const peers = Object.entries(pkg.peerDependencies).map(([name, range]) => `${name}@${range}`);
  const install = (dir, args) => {
    run('mkdir', ['-p', dir], work);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
    return run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...args], dir);
  };

  // The host installs the peers itself, as a real A2UI client does.
  install(consumer, [tarball, ...peers]);

  // QA-08: one copy of every shared library, so one context and one zod.
  const tree = run('npm', ['ls', '--all', '--parseable'], consumer).split('\n');
  for (const name of ['@a2ui/react', '@a2ui/web_core', 'zod']) {
    const copies = tree.filter((line) => line.endsWith(`/node_modules/${name}`));
    if (copies.length !== 1) fail(`Expected one copy of ${name} in the consumer, found ${copies.length}: ${copies.join(', ')}`);
  }

  const esmProbe = `
    const m = await import('@kaltura/a2ui-react');
    for (const name of ['kalturaReactCatalog', 'setKsProvider', 'setExtraAllowedOrigins']) {
      if (m[name] === undefined) throw new Error('missing export ' + name);
    }
    const { Catalog } = await import('@a2ui/web_core/v0_9');
    if (!(m.kalturaReactCatalog instanceof Catalog)) throw new Error('catalog is not an instance of the host Catalog');`;
  try {
    run(process.execPath, ['--input-type=module', '-e', esmProbe], consumer);
  } catch (error) {
    fail(`ESM entry failed to import in Node: ${String(error.stderr ?? error).split('\n').find((l) => /Error/.test(l)) ?? error}`);
  }

  const wcPath = createRequire(join(consumer, 'x.js')).resolve('@kaltura/a2ui-react/webcomponent');
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const errors = [];
  dom.window.addEventListener('error', (event) => errors.push(event.message));
  try {
    dom.window.eval(readFileSync(wcPath, 'utf8'));
  } catch (error) {
    errors.push(String(error));
  }
  for (const message of errors) fail(`Web component entry threw on a bare page: ${message}`);
  for (const tag of catalog['x-kaltura-adapters'].webcomponent.customElements) {
    if (!dom.window.customElements.get(tag)) fail(`Web component entry did not register <${tag}>.`);
  }
  dom.window.close();

  // QA-08: a host that skipped the peers (npm >= 7 installs them unless told
  // not to) sees the gap in `npm ls`, and the import names the package.
  const bare = join(work, 'no-peers');
  install(bare, ['--legacy-peer-deps', tarball]);
  let missing = '';
  try {
    run('npm', ['ls', '--all'], bare);
  } catch (error) {
    missing = String(error.stdout ?? '') + String(error.stderr ?? '');
  }
  for (const name of ['@a2ui/react', '@a2ui/web_core', 'zod']) {
    if (!new RegExp(`missing: ${name}@`).test(missing)) fail(`"npm ls" does not report the missing peer ${name} when peers are skipped.`);
  }
  try {
    run(process.execPath, ['--input-type=module', '-e', "await import('@kaltura/a2ui-react')"], bare);
    fail('ESM entry imported without its peers installed.');
  } catch (error) {
    if (!/Cannot find package '(@a2ui\/(react|web_core)|zod|react)/.test(String(error.stderr))) {
      fail(`ESM entry without peers did not fail with a "Cannot find package" error: ${String(error.stderr).split('\n').find((l) => /Error/.test(l)) ?? error}`);
    }
  }

  // QA-08: a host on another @a2ui/react minor gets an install error that
  // names the peer, instead of a second copy of the renderer.
  let conflict = '';
  try {
    install(join(work, 'conflict'), ['@a2ui/react@0.10.2', tarball]);
    fail('npm installed the package next to @a2ui/react@0.10.2 without a peer conflict.');
  } catch (error) {
    conflict = String(error.stderr ?? error);
  }
  if (conflict !== '' && !/ERESOLVE[\s\S]*peer @a2ui\/react@"\^0\.11/.test(conflict)) {
    fail(`The peer conflict message does not name @a2ui/react ^0.11: ${conflict.split('\n').slice(0, 6).join(' | ')}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL ${message}`);
  console.error(`check-consumer: ${failures.length} problem(s).`);
  process.exit(1);
}
console.log('check-consumer: passed.');
