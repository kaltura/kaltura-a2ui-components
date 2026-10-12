// Covers: QA-16 (the README and examples run against the built bundles).
// Runs the README snippets and the pages in examples/ in a real browser against
// dist/. Fails when one throws, logs a console error, loads a missing local file
// or does not show what its "check-examples: expect" comment lists.
// Run after "npm run build": npm run check:examples
//
// Marking rules (README.md):
//   <!-- check-examples: expect <css selector>; <css selector>; text:<words> -->
//   ```html (a page, uses the CDN script) or ```tsx (a module, mounts into #root)
// Every html or tsx fence in README.md needs such a comment, or
// <!-- check-examples: skip --> with the reason in the text before it.
//
// The CDN URL is swapped for the local dist/ file. Requests to other hosts get
// an empty 200 answer, so the run needs no network and no Kaltura account.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, 'node_modules', '.cache', 'check-examples');
const CDN_SCRIPT = /https:\/\/cdn\.jsdelivr\.net\/gh\/kaltura\/kaltura-a2ui-components@[^/"']+\/dist\/kaltura-wc\.js/g;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };

const failures = [];
const fail = (message) => failures.push(message);

for (const file of ['dist/kaltura-wc.js', 'dist/kaltura-react.mjs']) {
  if (!existsSync(join(root, file))) {
    console.error(`${file} is missing. Run "npm run build" first.`);
    process.exit(1);
  }
}

/** @typedef {{ name: string, path: string, expect: string[] }} Page */

/** Selectors from a "check-examples: expect a; b" comment. */
const parseExpect = (comment) =>
  comment
    .replace(/^\s*check-examples:\s*/, '')
    .replace(/^expect\s+/, '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

/** Reads the first check-examples comment in an HTML file. */
function expectFromFile(file) {
  const match = /<!--\s*(check-examples:[^>]*?)\s*-->/.exec(readFileSync(file, 'utf8'));
  return match ? parseExpect(match[1]) : [];
}

/** Marked fences in README.md. Unmarked html and tsx fences are failures. */
function readmeBlocks() {
  const lines = readFileSync(join(root, 'README.md'), 'utf8').split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^```(html|tsx)\s*$/.exec(lines[i]);
    if (!open) continue;
    const end = lines.indexOf('```', i + 1);
    const comment = /<!--\s*(check-examples:[^>]*?)\s*-->/.exec(lines[i - 1] ?? '')?.[1];
    if (!comment) {
      fail(`README.md line ${i + 1}: ${open[1]} block has no "<!-- check-examples: ... -->" comment above it`);
    } else if (!/^check-examples:\s*skip/.test(comment)) {
      blocks.push({ lang: open[1], code: lines.slice(i + 1, end).join('\n'), expect: parseExpect(comment), line: i + 1 });
    }
    i = end;
  }
  return blocks;
}

/** Builds a Vite app (React example or README module) into dir/out and returns its page path. */
async function buildApp(appRoot, outDir) {
  await build({
    root: appRoot,
    configFile: false,
    logLevel: 'error',
    base: './',
    plugins: [react()],
    resolve: { alias: { '@kaltura/a2ui-react': join(root, 'dist/kaltura-react.mjs') } },
    build: { outDir, emptyOutDir: true, minify: false },
  });
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

/** @type {Page[]} */
const pages = [];

// 1. Examples
pages.push({ name: 'examples/plain-html', path: '/examples/plain-html/index.html', expect: expectFromFile(join(root, 'examples/plain-html/index.html')) });
await buildApp(join(root, 'examples/react'), join(work, 'example-react'));
pages.push({ name: 'examples/react', path: '/node_modules/.cache/check-examples/example-react/index.html', expect: expectFromFile(join(root, 'examples/react/index.html')) });

// 2. README snippets
const blocks = readmeBlocks();
if (blocks.length === 0) fail('README.md has no checked snippets');
for (const [index, block] of blocks.entries()) {
  const name = `README.md line ${block.line} (${block.lang})`;
  const dir = join(work, `readme-${index}`);
  mkdirSync(dir, { recursive: true });
  if (block.lang === 'html') {
    if (block.code.search(CDN_SCRIPT) === -1) fail(`${name}: the page must load the CDN script https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v<version>/dist/kaltura-wc.js`);
    writeFileSync(join(dir, 'index.html'), block.code.replace(CDN_SCRIPT, '/dist/kaltura-wc.js').replace(/\s+integrity="[^"]*"/g, '').replace(/\s+crossorigin="[^"]*"/g, ''));
    pages.push({ name, path: `/node_modules/.cache/check-examples/readme-${index}/index.html`, expect: block.expect });
  } else {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
    writeFileSync(join(dir, 'main.tsx'), block.code);
    await buildApp(dir, join(dir, 'out'));
    pages.push({ name, path: `/node_modules/.cache/check-examples/readme-${index}/out/index.html`, expect: block.expect });
  }
}

// 3. Run every page in Chromium
const server = createServer((req, res) => {
  const file = normalize(join(root, decodeURIComponent((req.url ?? '/').split('?')[0])));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
try {
  for (const page of pages) {
    const tab = await browser.newPage();
    const problems = [];
    tab.on('console', (message) => message.type() === 'error' && problems.push(`console error: ${message.text()}`));
    tab.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    tab.on('response', (response) => response.url().startsWith(origin) && response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
    await tab.route(`${origin}/**`, (route) => route.continue());
    await tab.route((url) => !url.href.startsWith(origin), (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    await tab.goto(origin + page.path);
    if (page.expect.length === 0) problems.push('no "check-examples: expect ..." comment, so nothing is checked');
    for (const wanted of page.expect) {
      try {
        if (wanted.startsWith('text:')) {
          const text = wanted.slice(5);
          await tab.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout: 15000 });
        } else {
          await tab.waitForSelector(wanted, { timeout: 15000 });
        }
      } catch {
        problems.push(`expected ${wanted} to appear`);
      }
    }
    await tab.waitForTimeout(300);
    for (const problem of problems) fail(`${page.name}: ${problem}`);
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${page.name}`);
    await tab.close();
  }
} finally {
  await browser.close();
  server.close();
  rmSync(work, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\n${pages.length} page(s) ran clean against dist/.`);
