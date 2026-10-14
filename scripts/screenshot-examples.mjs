// Renders the chart and the flashcards of examples/plain-html offline and writes
// docs/img/examples.png. Needs no Kaltura account and no network.
// Run after "npm run build": npm run screenshot:examples
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/img/examples.png');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };

if (!existsSync(join(root, 'dist/kaltura-wc.js'))) {
  console.error('dist/kaltura-wc.js is missing. Run "npm run build" first.');
  process.exit(1);
}

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
  const page = await browser.newPage({ viewport: { width: 760, height: 900 }, colorScheme: 'light' });
  // Offline: nothing leaves the machine. The page needs no other host for the chart and the flashcards.
  await page.route((url) => !url.href.startsWith(origin), (route) => route.abort());
  await page.goto(`${origin}/examples/plain-html/index.html`);
  await page.waitForSelector('kaltura-chart h4.kaltura-chart-title');
  await page.waitForFunction(() => document.body.innerText.includes('The basic unit of life.'));
  // Let the chart animation settle.
  await page.waitForTimeout(1000);

  const top = await page.locator('h2', { hasText: 'Chart' }).boundingBox();
  const bottom = await page.locator('kaltura-flashcards').boundingBox();
  if (!top || !bottom) throw new Error('chart or flashcards did not render');
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({
    path: out,
    fullPage: true,
    clip: { x: 0, y: top.y - 8, width: 760, height: bottom.y + bottom.height - top.y + 16 },
  });
  console.log(`wrote ${out.slice(root.length + 1)}`);
} finally {
  await browser.close();
  server.close();
}
