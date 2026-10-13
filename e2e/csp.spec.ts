// The Content Security Policy recommended in docs/host-integration.md: the web
// component bundle, a chart, flashcards, the Player script, the recorder script and the captions editor
// run under it with no violation. A data: media element and a blob: worker are allowed. A script, a media
// URL and a worker script from elsewhere are blocked. The region table in the same file matches
// src/core/region.ts.
// The page is served from a fake origin by page.route, so the test needs no port
// and no network. Requests to Kaltura hosts get an empty answer. The avatar
// gets a stub embeds module on its Unisphere host.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KALTURA_REGIONS, kalturaHosts, setRegion } from '../src/core/region';

const ORIGIN = 'https://host.test';
const doc = readFileSync(resolve(process.cwd(), 'docs/host-integration.md'), 'utf8');
const block = /<!-- csp -->\s*```text\n([\s\S]*?)```/.exec(doc)?.[1];
const POLICY = (block ?? '').split('\n').map((line) => line.trim()).filter(Boolean).join(' ');

const PAGE = `<!doctype html><html lang="en"><body>
<kaltura-chart id="chart"></kaltura-chart>
<kaltura-flashcards id="cards"></kaltura-flashcards>
<kaltura-player id="player"></kaltura-player>
<script src="/kaltura-wc.js"></script>
<script src="/page.js"></script>
</body></html>`;

const PAGE_JS = `
document.getElementById('chart').config = { chartType: 'bar', title: 'Visits', data: [{ d: 'a', v: 1 }, { d: 'b', v: 3 }], xKey: 'd', yKeys: ['v'] };
document.getElementById('cards').config = { title: 'Cells', cards: [{ title: 'Cell', content: 'The basic unit of life.' }] };
document.getElementById('player').config = { partnerId: 1, uiconfId: 2, entryId: '0_abc' };
`;

const RECORDER_PAGE = `<!doctype html><html lang="en"><body>
<script src="/kaltura-wc.js"></script>
<script src="/recorder.js"></script>
</body></html>`;

const RECORDER_JS = `
KalturaA2UIWebComponents.setKsProvider(() => 'csp-ks');
const recorder = document.createElement('kaltura-recorder');
recorder.config = { partnerId: 1, uiconfId: 2 };
document.body.appendChild(recorder);
`;

const RECORDER_STUB = readFileSync(resolve(process.cwd(), 'e2e/fixtures/express-recorder-stub.js'), 'utf8');
const PLAYER_STUB = readFileSync(resolve(process.cwd(), 'e2e/fixtures/kaltura-player-stub.js'), 'utf8');

const EDITOR_PAGE = `<!doctype html><html lang="en"><body>
<script src="/kaltura-wc.js"></script>
<script src="/editor.js"></script>
</body></html>`;

const EDITOR_JS = `
KalturaA2UIWebComponents.setKsProvider(() => 'csp-ks');
const editor = document.createElement('kaltura-captions-editor');
editor.config = { partnerId: 1, entryId: '0_abc' };
document.body.appendChild(editor);
`;

// The real v1.3.10 embed.php for the US host. The editor fetches it with the pinned sha384, so the
// stub must be these exact bytes. The assets it names get stub bodies: their hash check fails, which
// is fine here, because the test only needs to see whether the policy lets the request out.
const EDITOR_BASE = 'https://www.kaltura.com/apps/captionstudio/v1.3.10/index.html';
const EDITOR_HTML = '<!DOCTYPE html><html lang="en" class="closed-captions-html"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no"><meta name="theme-color" content="#000000"><base href="https://www.kaltura.com/apps/captionstudio/v1.3.10/index.html" /><link rel="stylesheet" href="bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous"><title>Closed Captions Studio</title><link href="./static/css/main.74b8a353.css" rel="stylesheet"></head><body class="closed-captions-body"><noscript>You need to enable JavaScript to run this app.</noscript><div id="root" class="closed-captions-studio"></div><script type="text/javascript" src="./static/js/main.6315bf26.js"></script></body></html>';

const AVATAR_PAGE = `<!doctype html><html lang="en"><body>
<kaltura-avatar id="avatar"></kaltura-avatar>
<script src="/kaltura-wc.js"></script>
<script src="/avatar.js"></script>
</body></html>`;

const AVATAR_JS = `
KalturaA2UIWebComponents.setKsProvider(() => 'csp-ks');
document.getElementById('avatar').config = { partnerId: 1, serverUrl: 'https://unisphere.nvp1.ovp.kaltura.com/v1' };
`;

const EMBEDS_STUB = `export const embeds = { workspace: async () => ({
  apis: { genieAvatar: { contained: () => { window.__avatar = 'contained'; return { remove() {} }; } } },
}) };`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener('securitypolicyviolation', (event) => seen.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  const serve = (body: string, type: string) => ({ status: 200, contentType: type, headers: { 'content-security-policy': POLICY }, body });
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill(serve(PAGE, 'text/html'));
    if (path === '/page.js') return route.fulfill(serve(PAGE_JS, 'text/javascript'));
    if (path === '/avatar') return route.fulfill(serve(AVATAR_PAGE, 'text/html'));
    if (path === '/avatar.js') return route.fulfill(serve(AVATAR_JS, 'text/javascript'));
    if (path === '/editor') return route.fulfill(serve(EDITOR_PAGE, 'text/html'));
    if (path === '/editor.js') return route.fulfill(serve(EDITOR_JS, 'text/javascript'));
    if (path === '/recorder') return route.fulfill(serve(RECORDER_PAGE, 'text/html'));
    if (path === '/recorder.js') return route.fulfill(serve(RECORDER_JS, 'text/javascript'));
    if (path === '/kaltura-wc.js') return route.fulfill(serve(readFileSync(resolve(process.cwd(), 'dist/kaltura-wc.js'), 'utf8'), 'text/javascript'));
    return route.fulfill({ status: 404, body: '' });
  });
  await page.route((url) => url.origin !== ORIGIN, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  await page.route('https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: PLAYER_STUB }),
  );
});

const violations = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

test('the recommended policy is in docs/host-integration.md', () => {
  expect(POLICY).toContain("default-src 'self'");
});

test('CSP: chart, flashcards and the Player script run under the recommended policy', async ({ page }) => {
  await page.goto(`${ORIGIN}/`);
  await expect(page.locator('kaltura-chart h4.kaltura-chart-title')).toHaveText('Visits');
  await expect(page.locator('kaltura-flashcards')).toContainText('Cell');
  await expect(page.locator('kaltura-player .stub-player-ui')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

test('CSP: the same policy blocks a script from a host that is not listed', async ({ page }) => {
  await page.goto(`${ORIGIN}/`);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.src = 'https://evil.test/x.js';
    document.head.appendChild(script);
  });
  await expect.poll(() => violations(page)).toEqual([expect.stringContaining('https://evil.test/x.js')]);
});

test('CSP: a data: media element and a blob: worker are allowed', async ({ page }) => {
  await page.goto(`${ORIGIN}/`);
  const reply = await page.evaluate(async () => {
    const audio = document.createElement('audio');
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    document.body.appendChild(audio);
    const worker = new Worker(URL.createObjectURL(new Blob(['postMessage("pong")'])));
    return new Promise((resolve) => (worker.onmessage = (event) => resolve(event.data)));
  });
  expect([reply, await violations(page)]).toEqual(['pong', []]);
});

test('CSP: a media URL from an unlisted host and a worker script from self are blocked', async ({ page }) => {
  await page.goto(`${ORIGIN}/`);
  await page.evaluate(() => {
    const audio = document.createElement('audio');
    audio.src = 'https://evil.test/a.mp3';
    document.body.appendChild(audio);
    try {
      new Worker('/page.js');
    } catch {
      // Some engines throw on a blocked worker, others fire an error event. The violation is the check.
    }
  });
  await expect.poll(async () => (await violations(page)).map((entry) => entry.split(' ')[0]).sort()).toEqual(['media-src', 'worker-src']);
});

test('CSP: the avatar runs under the recommended policy and never contacts the old avatar host', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.route('https://unisphere.nvp1.ovp.kaltura.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: EMBEDS_STUB }),
  );
  await page.goto(`${ORIGIN}/avatar`);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __avatar?: string }).__avatar)).toBe('contained');
  expect([await violations(page), requests.filter((url) => url.includes('static.avatar')), POLICY.includes('static.avatar')]).toEqual([[], [], false]);
});

test('CSP: the recorder script loads from the Kaltura host and runs under the recommended policy', async ({ page }) => {
  await page.route('https://www.kaltura.com/apps/expressrecorder/*/express-recorder.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: RECORDER_STUB }),
  );
  await page.goto(`${ORIGIN}/recorder`);
  await expect(page.locator('kaltura-recorder .stub-recorder-ui')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

test('CSP: the captions editor page keeps its base tag and loads its stylesheets and script in a blob frame under the recommended policy', async ({ page }) => {
  const blocked: string[] = [];
  const assets: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) blocked.push(message.text());
  });
  await page.route('https://www.kaltura.com/apps/captionstudio/*/**', (route) => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (url.pathname.endsWith('/embed.php')) return route.fulfill({ status: 200, contentType: 'text/html', headers, body: EDITOR_HTML });
    assets.push(url.pathname.split('/').pop() ?? '');
    return route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', headers, body: 'body{margin:0}' });
  });
  await page.goto(`${ORIGIN}/editor`);
  await expect(page.locator('kaltura-captions-editor iframe')).toHaveAttribute('src', /^blob:/);
  const editorFrame = () => page.frames().find((candidate) => candidate !== page.mainFrame());
  await expect.poll(() => editorFrame()?.evaluate(() => document.baseURI)).toBe(EDITOR_BASE);
  await expect.poll(() => assets.length).toBe(3);
  expect([await violations(page), blocked]).toEqual([[], []]);
});

test('the region table in docs/host-integration.md matches src/core/region.ts', () => {
  const cells = (region: string) => {
    const row = doc.split('\n').find((line) => line.startsWith(`| ${region} |`)) ?? '';
    return row.split('|').slice(1, -1).map((cell) => cell.trim().replaceAll('`', ''));
  };
  const table = KALTURA_REGIONS.map((region) => cells(region));
  const code = KALTURA_REGIONS.map((region) => {
    setRegion(region);
    const hosts = kalturaHosts();
    return [region, hosts.serviceUrl, hosts.cdn, hosts.recorder, hosts.vod, hosts.kmc];
  });
  setRegion('nvp1');
  expect(table).toEqual(code);
});
