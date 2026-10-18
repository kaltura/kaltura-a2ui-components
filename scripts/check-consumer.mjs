// Packs the package, installs the tarball in a clean temp directory and checks
// that a fresh consumer can load it. Run after "npm run build".
//
// 1. Every bare import left in the ESM, the IIFE and the .d.ts files a
//    consumer can load (reachable from the "types" entries in exports) must
//    name a package in dependencies or peerDependencies. Chart libraries are
//    inlined, so they are devDependencies; an unreachable .d.ts may still name
//    them.
// 2. The ESM entry imports in plain Node, with no bundler, and leaves no
//    HTMLElement stub behind. A control run shows that @a2ui/react alone
//    still fails there (a2ui#3158, ADR 0007).
// 3. The web component entry runs in a bare jsdom window and registers every
//    custom element listed in the catalog.
// 4. QA-08: with the peers installed there is exactly one copy of each shared
//    library, and the host's `Catalog` class is the one the ESM entry uses
//    (an inlined second copy would break `instanceof`).
// 5. A strict TypeScript consumer compiles against the shipped .d.ts files
//    (strict, skipLibCheck false): host options, toClientError, a bad region
//    code and PlayerCoreProps.
// 6. QA-08: a host without the peers, or with a conflicting @a2ui/react, gets a
//    clear npm message (`npm ls` "missing", or an ERESOLVE error that names
//    the peer), and the ESM entry fails on import with the package name.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

for (const file of readdirSync(join(root, 'dist')).filter((name) => /\.m?js$/.test(name))) {
  checkDeclared(`dist/${file}`, readFileSync(join(root, 'dist', file), 'utf8'));
}
const typeFiles = Object.values(pkg.exports).flatMap((target) => (target.types ? [resolve(root, target.types)] : []));
const seenTypes = new Set();
for (const file of typeFiles) {
  if (seenTypes.has(file)) continue;
  seenTypes.add(file);
  const source = readFileSync(file, 'utf8');
  checkDeclared(file.slice(root.length + 1), source);
  for (const [, , specifier] of [...source.matchAll(staticImport), ...source.matchAll(dynamicImport)]) {
    if (specifier.startsWith('.')) typeFiles.push(resolve(dirname(file), specifier.replace(/\.js$/, '.d.ts')));
  }
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
  // @types/react is a dev dependency of ours. A TypeScript host has it too.
  // @a2ui/markdown-it 0.2.2 needs web_core ^0.14.0, while @a2ui/react 0.13.0 still accepts it. Pinned until upstream fixes the range.
  install(consumer, [tarball, ...peers, '@a2ui/markdown-it@0.2.1', `@types/react@${pkg.devDependencies['@types/react']}`]);

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
    if (!(m.kalturaReactCatalog instanceof Catalog)) throw new Error('catalog is not an instance of the host Catalog');
    if (typeof HTMLElement !== 'undefined') throw new Error('the HTMLElement stub is still defined after the import');
    await import('@a2ui/react/v0_9');`;
  try {
    run(process.execPath, ['--input-type=module', '-e', esmProbe], consumer);
  } catch (error) {
    fail(`ESM entry failed to import in Node: ${String(error.stderr ?? error).split('\n').find((l) => /Error/.test(l)) ?? error}`);
  }

  // Control: without the stub, @a2ui/react 0.13.0 fails in Node. If it loads,
  // upstream fixed a2ui#3158: remove the stub (see ADR 0007).
  try {
    run(process.execPath, ['--input-type=module', '-e', "await import('@a2ui/react/v0_9')"], consumer);
    console.warn('NOTE @a2ui/react imports in plain Node without the stub. a2ui#3158 looks fixed: remove src/adapters/react/html-element-stub.ts (ADR 0007).');
  } catch (error) {
    if (!/HTMLElement is not defined/.test(String(error.stderr))) {
      fail(`@a2ui/react failed in Node for a reason other than a2ui#3158: ${String(error.stderr).split('\n').find((l) => /Error/.test(l)) ?? error}`);
    }
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

  // The shipped types compile for a strict consumer, and a bad region is a type error.
  writeFileSync(
    join(consumer, 'consumer.ts'),
    `import { setKsProvider, setErrorHandler, setRegion, toClientError, type PlayerCoreProps } from '@kaltura/a2ui-react';

setKsProvider((widget) => (widget === 'player' ? 'ks' : undefined));
setErrorHandler((error) => {
  const message = toClientError(error);
  const version: 'v0.9' = message.version;
  const code: string = message.error.code;
  console.log(version, code);
});
setRegion('irp2');
// @ts-expect-error not a Kaltura region
setRegion('mars');
export const props: PlayerCoreProps = { partnerId: 1, uiconfId: 2, entryId: '0_abc12345' };
`,
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, skipLibCheck: false, target: 'es2023', lib: ['es2023', 'dom'], module: 'esnext', moduleResolution: 'bundler', types: [] },
      files: ['consumer.ts'],
    }),
  );
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  try {
    run(process.execPath, [tsc, '-p', '.'], consumer);
  } catch (error) {
    fail(`A strict TypeScript consumer failed to compile:\n${String(error.stdout ?? error).split('\n').slice(0, 12).join('\n')}`);
  }

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
    install(join(work, 'conflict'), ['@a2ui/react@0.11.1', tarball]);
    fail('npm installed the package next to @a2ui/react@0.11.1 without a peer conflict.');
  } catch (error) {
    conflict = String(error.stderr ?? error);
  }
  if (conflict !== '' && !/ERESOLVE[\s\S]*peer @a2ui\/react@"\^0\.13/.test(conflict)) {
    fail(`The peer conflict message does not name @a2ui/react ^0.13: ${conflict.split('\n').slice(0, 6).join(' | ')}`);
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
