// Hostile input group (plan 6.4). Case numbers match the permanent case list in e2e/README.md.
// Titles with "[pending SEC-xx]" fail until that fix lands. Do not weaken them.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS, ORIGIN_A, ORIGIN_B } from './fixtures/constants';

const UNISPHERE_TAGS = [
  'kaltura-media-manager',
  'kaltura-genie-widget',
  'kaltura-content-lab',
  'kaltura-vod-avatar-wc',
  'kaltura-agents-widget',
];
const ALLOWED = ALLOWED_HOSTS[0];

const unisphereConfig = (serverUrl: string) => ({
  partnerId: 1234567,
  ks: 'DUMMY_KS_NOT_REAL',
  serverUrl,
  entryId: '0_dummy',
});

/** Elements inside the host that must never come from text: markup, scripts, handlers. */
async function unsafeNodes(h: Harness): Promise<string[]> {
  return h.page.evaluate(() =>
    [...document.querySelectorAll('#host *')]
      .filter(
        (el) =>
          /^(img|script|iframe|svg|object|embed)$/i.test(el.tagName) ||
          el.getAttributeNames().some((a) => a.startsWith('on')),
      )
      .map((el) => el.outerHTML.slice(0, 120)),
  );
}

const hostText = (h: Harness) => h.page.locator('#host').innerText();

test.describe('case 1 and 2: loader error text is inert', () => {
  for (const tag of UNISPHERE_TAGS) {
    for (const mode of ['throw', 'throwstr'] as const) {
      test(`[pending SEC-06] ${tag}: ${mode} on an approved origin`, async ({ harness: h }) => {
        h.kalturaMode = mode;
        await h.open();
        await h.mount(tag, unisphereConfig(`${ALLOWED}/v1`));
        await h.settle();
        expect(await unsafeNodes(h)).toEqual([]);
        expect(await hostText(h)).toContain('<img src=x onerror=');
        expect(await h.pwned()).toEqual([]);
      });

      test(`[pending SEC-06] ${tag}: ${mode} on a foreign origin`, async ({ harness: h }) => {
        await h.open();
        await h.mount(tag, unisphereConfig(h.hostileServerUrl(mode)));
        await h.settle();
        expect(await unsafeNodes(h)).toEqual([]);
        expect(await h.pwned()).toEqual([]);
      });
    }
  }
});

test.describe('case 3: 404 loader', () => {
  for (const tag of UNISPHERE_TAGS) {
    test(`${tag}: shows a text error and throws nothing`, async ({ harness: h }) => {
      h.kalturaMode = 'notfound';
      await h.open();
      await h.mount(tag, unisphereConfig(`${ALLOWED}/v1`));
      await h.settle();
      expect(await hostText(h)).toMatch(/Failed to load/);
      expect(h.pageErrors).toEqual([]);
      expect(await h.pwned()).toEqual([]);
    });
  }
});

test.describe('case 4: serverUrl allowlist rejects before import()', () => {
  const hostile: Record<string, (h: Harness) => string> = {
    'foreign https origin': () => 'https://evil.invalid/v1',
    'http downgrade of an approved host': () => 'http://unisphere.nvp1.ovp.kaltura.com/v1',
    'suffix lookalike': () => 'https://unisphere.nvp1.ovp.kaltura.com.invalid/v1',
    'userinfo in front of a foreign host': (h) =>
      `http://unisphere.nvp1.ovp.kaltura.com@${new URL(ORIGIN_B).host}/${h.token}/ok/v1`,
    'approved host in the query string': (h) =>
      `${ORIGIN_B}/${h.token}/ok/v1?h=unisphere.nvp1.ovp.kaltura.com`,
    'data: URL': () => "data:text/javascript,window.__pwned.push('data-url')//v1",
    'javascript: URL': () => "javascript:window.__pwned.push('javascript-url')//v1",
    'protocol-relative': (h) => `//${new URL(ORIGIN_B).host}/${h.token}/ok/v1`,
    'relative path': (h) => `/${h.token}/ok/v1`,
  };

  for (const tag of ['kaltura-media-manager', 'kaltura-genie-widget']) {
    for (const [name, build] of Object.entries(hostile)) {
      test(`[pending SEC-01] ${tag}: ${name}`, async ({ harness: h }) => {
        await h.open();
        await h.mount(tag, unisphereConfig(build(h)));
        await h.settle();
        expect(h.loaderRequests()).toEqual([]);
        expect(await h.serverLog('B')).toEqual([]);
        expect(await h.serverLog('A')).toEqual([]);
        expect(await h.pwned()).toEqual([]);
        expect(await hostText(h)).toMatch(/Failed to load/);
      });
    }
  }
});

test.describe('case 5: allowlist control', () => {
  for (const host of ALLOWED_HOSTS) {
    test(`${host} is imported once at the exact loader URL`, async ({ harness: h }) => {
      await h.open();
      await h.mount('kaltura-media-manager', unisphereConfig(`${host}/v1`));
      await h.settle();
      expect(h.loaderRequests()).toEqual([`${host}/v1/loader/index.esm.js`]);
      expect(await h.pwned()).toEqual([]);
    });
  }
});

test.describe('case 12 and 13: recorder iframe', () => {
  const FIXED_ATTRS = ['allow', 'allowfullscreen', 'sandbox', 'src', 'style', 'title'];
  const srcdoc = "1\" srcdoc=\"<script>parent.__pwned.push('srcdoc')<\\/script>";
  const hostileIds: Record<string, Record<string, string>> = {
    'partnerId with srcdoc': { partnerId: srcdoc },
    'partnerId with onload': { partnerId: '1" onload="window.__pwned.push(\'onload\')' },
    'partnerId with path traversal': { partnerId: '../../evil' },
    'uiconfId with srcdoc': { partnerId: '1234567', uiconfId: srcdoc },
    'uiconfId with onload': { partnerId: '1234567', uiconfId: '1" onload="window.__pwned.push(\'onload\')' },
  };

  for (const [name, ids] of Object.entries(hostileIds)) {
    test(`[pending SEC-03] hostile ids: ${name}`, async ({ harness: h }) => {
      await h.open();
      await h.mount('kaltura-recorder', { ks: 'DUMMY_KS_NOT_REAL', ...ids });
      await h.settle();
      const attrs = await h.page.evaluate(() =>
        [...document.querySelectorAll('#host iframe')].map((f) => f.getAttributeNames().sort()),
      );
      for (const names of attrs) expect(names.filter((n) => !FIXED_ATTRS.includes(n))).toEqual([]);
      const srcs = await h.page.locator('#host iframe').evaluateAll((fs) => fs.map((f) => f.getAttribute('src')));
      for (const src of srcs) expect(src).toMatch(/\/partner_id\/\d+\/uiconf_id\/\d+\//);
      expect(await h.pwned()).toEqual([]);
    });
  }

  test('ks is URL-encoded and adds no element', async ({ harness: h }) => {
    const ks = `"><img src=x onerror="window.__pwned.push('ks')">`;
    await h.open();
    await h.mount('kaltura-recorder', { partnerId: 1234567, ks });
    await h.settle();
    const src = await h.page.locator('#host iframe').getAttribute('src');
    expect(src).toContain(`ks=${encodeURIComponent(ks)}`);
    expect(await h.page.locator('#host img').count()).toBe(0);
    expect(await h.pwned()).toEqual([]);
  });
});

test.describe('flashcards payloads', () => {
  const hostileHtml = (tag: string) => `<img src=x onerror="window.__pwned.push('${tag}')">`;

  test('[pending SEC-04] case 7: raw content never reaches the DOM before sanitising', async ({ harness: h }) => {
    await h.page.addInitScript(() => {
      (window as unknown as { __unsafeSeen: string[] }).__unsafeSeen = [];
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of r.addedNodes)
            if (n instanceof Element && n.querySelector('[onerror], script')) {
              (window as unknown as { __unsafeSeen: string[] }).__unsafeSeen.push(n.outerHTML.slice(0, 120));
            }
      }).observe(document, { childList: true, subtree: true });
    });
    await h.open();
    await h.mount('kaltura-flashcards', {
      title: 'Deck',
      summary: hostileHtml('summary'),
      cards: [{ title: 'C1', content: hostileHtml('card') }],
    });
    await h.settle();
    expect(await h.page.evaluate(() => (window as unknown as { __unsafeSeen: string[] }).__unsafeSeen)).toEqual([]);
    expect(await h.pwned()).toEqual([]);
  });

  test('[pending SEC-05] markdown image from a foreign origin is not fetched', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-flashcards', {
      title: 'Deck',
      summary: `![](${ORIGIN_B}/${h.token}/img.png)`,
      cards: [{ title: 'C1', content: 'plain' }],
    });
    await h.settle();
    expect(await h.serverLog('B')).toEqual([]);
  });
});

test.describe('case 16: no remote code from a foreign origin', () => {
  for (const tag of UNISPHERE_TAGS) {
    test(`[pending SEC-01] ${tag}: module on origin B is never requested or run`, async ({ harness: h }) => {
      await h.open();
      await h.mount(tag, unisphereConfig(h.hostileServerUrl('codeload')));
      await h.settle();
      expect(await h.serverLog('B')).toEqual([]);
      expect(await h.pwned()).toEqual([]);
    });
  }
});

test('origin A serves the harness and dist', async ({ request }) => {
  expect((await request.get(`${ORIGIN_A}/dist/kaltura-wc.js`)).status()).toBe(200);
});
