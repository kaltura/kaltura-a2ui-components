// The Content Security Policy recommended in docs/host-integration.md: the web
// component bundle, a chart, flashcards, the Player script and the recorder script run under it with no
// violation, and the same policy blocks a script from a host that is not listed.
// The page is served from a fake origin by page.route, so the test needs no port
// and no network. Requests to Kaltura hosts get an empty answer. The avatar
// gets a stub embeds module on its Unisphere host.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  await page.route('https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: RECORDER_STUB }),
  );
  await page.goto(`${ORIGIN}/recorder`);
  await expect(page.locator('kaltura-recorder .stub-recorder-ui')).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

test('CSP: the captions editor page keeps its base tag and stylesheets in a blob frame under the recommended policy', async ({ page }) => {
  // The real page has a base tag and relative stylesheet and font URLs (checked by hand against embed.php).
  const base = 'https://www.kaltura.com/apps/captionstudio/latest/index.html';
  const blocked: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) blocked.push(message.text());
  });
  await page.route('https://www.kaltura.com/apps/captionstudio/latest/embed.php', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `<!doctype html><base href="${base}"><link rel="stylesheet" href="main.css"><title>editor stub</title>`,
    }),
  );
  await page.route('https://www.kaltura.com/apps/captionstudio/latest/main.css', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: 'body{margin:0}' }),
  );
  await page.goto(`${ORIGIN}/editor`);
  await expect(page.locator('kaltura-captions-editor iframe')).toHaveAttribute('src', /^blob:/);
  const editorFrame = () => page.frames().find((candidate) => candidate !== page.mainFrame());
  await expect.poll(() => editorFrame()?.evaluate(() => document.baseURI)).toBe(base);
  await expect.poll(() => editorFrame()?.evaluate(() => document.styleSheets.length)).toBe(1);
  expect([await violations(page), blocked]).toEqual([[], []]);
});
