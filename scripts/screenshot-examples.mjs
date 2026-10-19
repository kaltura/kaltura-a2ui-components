// Renders the player, the chart and the flashcards of examples/plain-html and
// writes docs/img/examples.png. The player plays a public entry (no KS, no
// secret), so this needs network and these variables:
//   SCREENSHOT_PARTNER_ID  partner id of the account that owns the entry
//   SCREENSHOT_UICONF_ID   player uiConf id of that partner
//   SCREENSHOT_ENTRY_ID    public entry id, for example 0_abc12345
//   SCREENSHOT_HOLD_AT     optional, seconds at which the player holds its frame (default 8)
// Run after "npm run build": set -a; . ./.env; set +a; npm run screenshot:examples
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/img/examples.png');
const partnerId = Number(process.env.SCREENSHOT_PARTNER_ID);
const uiconfId = Number(process.env.SCREENSHOT_UICONF_ID);
const entryId = process.env.SCREENSHOT_ENTRY_ID;
if (!partnerId || !uiconfId || !entryId) {
  console.error('SCREENSHOT_PARTNER_ID, SCREENSHOT_UICONF_ID and SCREENSHOT_ENTRY_ID are required. Load .env first.');
  process.exit(1);
}
// The hero holds the player frame at holdAt seconds.
const PLAYER = { uiconfId, entryId, holdAt: Number(process.env.SCREENSHOT_HOLD_AT) || 8 };
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
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, colorScheme: 'light' });
  await page.goto(`${origin}/examples/plain-html/index.html`);
  // The page holds placeholder ids. Point the player at the configured entry and lay the three widgets out side by side.
  await page.evaluate(({ partnerId, player }) => {
    window.KalturaA2UIWebComponents.setAllowedPartners([partnerId]);
    document.getElementById('player').config = { partnerId, ...player, autoplay: true, muted: true, };
    // Left: player and chart. Right: flashcards.
    const left = document.createElement('div');
    const right = document.createElement('div');
    const [chartTitle, cardsTitle] = document.querySelectorAll('h2');
    left.append(document.getElementById('player'), chartTitle, document.getElementById('chart'));
    right.append(cardsTitle, document.getElementById('cards'));
    document.body.replaceChildren(left, right);
    document.head.insertAdjacentHTML('beforeend', '<style>body{margin:16px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}h2{margin:16px 0 8px}</style>');
  }, { partnerId, player: PLAYER });
  await page.waitForSelector('kaltura-chart h4.kaltura-chart-title');
  await page.waitForFunction(() => document.body.innerText.includes('The basic unit of life.'));
  // Open the first card: the intro card is mostly empty.
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(500);
  // The click scrolls the page. The clip below needs the top of the page.
  await page.evaluate(() => window.scrollTo(0, 0));
  // Let the chart animation settle, then hold the player on one frame.
  await page.waitForTimeout(8000);
  await page.evaluate((at) => {
    const find = (root) => root.querySelector('video') ?? [...root.querySelectorAll('*')].map((el) => el.shadowRoot && find(el.shadowRoot)).find(Boolean);
    const video = find(document);
    if (!video) throw new Error('the player has no video');
    video.pause();
    video.currentTime = at;
  }, PLAYER.holdAt);
  await page.waitForTimeout(2000);

  const top = await page.locator('kaltura-chart').boundingBox();
  const bottom = await page.locator('kaltura-flashcards').boundingBox();
  if (!top || !bottom) throw new Error('player or flashcards did not render');
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({
    path: out,
    fullPage: true,
    clip: { x: 0, y: 0, width: 1100, height: Math.max(top.y + top.height, bottom.y + bottom.height) + 16 },
  });
  console.log(`wrote ${out.slice(root.length + 1)}`);
} finally {
  await browser.close();
  server.close();
}
