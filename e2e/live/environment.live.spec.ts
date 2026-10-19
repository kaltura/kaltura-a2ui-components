// Live tests in a second environment: ALT (North Virginia QA), a full Kaltura stack with its own hosts.
// It stands in for a non-US region: every host differs from the NVP1 default. Run: npm run e2e:live.
// Needs ALT_PARTNER_ID_1 and ALT_ADMIN_SECRET_1 in .env. Skipped without them. Never runs in CI.
// Read only: the tests create, change and delete nothing on the partner.
import { test as base, expect } from '@playwright/test';
import { ORIGIN_A } from '../fixtures/constants';
import { mintKs } from './mint-ks';

const partnerId = Number(process.env.ALT_PARTNER_ID_1);
const adminSecret = process.env.ALT_ADMIN_SECRET_1;
const API = 'https://api.alt.ovp.kaltura.com';
// "MediaSpace Embed Player" and a ready video of the partner.
const UICONF_ID = 1000049;
const ENTRY_ID = '0_ffffffff';
const TIMEOUT = 45_000;
const ENVIRONMENT = {
  serviceUrl: API,
  cdn: API,
  vod: 'https://cfvod.alt.ovp.kaltura.com',
  kmc: 'https://kmc.alt.ovp.kaltura.com',
  unisphere: 'https://unisphere.alt.ovp.kaltura.com',
};

interface Win {
  KalturaA2UIWebComponents: { setEnvironments(map: unknown): void; setKsProvider(provider: unknown): void };
  KalturaPlayer?: { getPlayers(): Record<string, { currentTime: number; paused: boolean }> };
  __mount(tag: string, config: unknown): void;
  __mintScoped(widget: string, scope: unknown): Promise<string>;
}

const test = base.extend<{ run: { requests: string[]; errors: string[]; scopes: unknown[]; ks: string } }>({
  run: async ({ page }, use) => {
    const ks = await mintKs(partnerId, adminSecret ?? '', 'a2ui-live-test', { serviceUrl: API });
    const run = { requests: [] as string[], errors: [] as string[], scopes: [] as unknown[], ks };
    page.context().on('request', (r) => run.requests.push(r.url()));
    page.on('console', (m) => m.type() === 'error' && run.errors.push(m.text().split(ks).join('<KS>')));
    page.on('pageerror', (e) => run.errors.push(e.message.split(ks).join('<KS>')));
    await page.exposeFunction('__mintScoped', (widget: string, scope: unknown) => {
      run.scopes.push({ widget, scope });
      return ks;
    });
    await page.goto(`${ORIGIN_A}/harness.html`);
    await page.evaluate((environment) => {
      const w = window as unknown as Win;
      w.KalturaA2UIWebComponents.setEnvironments({ alt: environment });
      w.KalturaA2UIWebComponents.setKsProvider((widget: string, request: { scope: unknown }) => w.__mintScoped(widget, request.scope));
    }, ENVIRONMENT);
    await use(run);
  },
});

const SKIP_MESSAGE = 'Live test needs ALT_PARTNER_ID_1 and ALT_ADMIN_SECRET_1. Put them in .env and run npm run e2e:live.';
if (!partnerId || !adminSecret) console.warn(`Skipped: ${SKIP_MESSAGE}`);
test.skip(!partnerId || !adminSecret, SKIP_MESSAGE);

const hostsOf = (urls: string[]) => [...new Set(urls.map((url) => new URL(url).host))];
/** Hosts of the default region (NVP1). A widget of the alt environment must never call them. */
const US_HOST = /(^|\.)(www\.kaltura\.com|cdnapisec\.kaltura\.com|[a-z-]+\.nvp1\.ovp\.kaltura\.com)$/;
const visibleText = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const read = (root: ParentNode): string =>
      Array.from(root.querySelectorAll('*'))
        .filter((el) => !['STYLE', 'SCRIPT'].includes(el.tagName))
        .map((el) => (el.shadowRoot ? read(el.shadowRoot) : '') + Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' '))
        .join(' ');
    return read(document);
  });

test('ALT-01: the player plays in the alt environment and calls no US host', async ({ page, run }) => {
  await page.evaluate(([p, u, e]) => (window as unknown as Win).__mount('kaltura-player', { partnerId: p, uiconfId: u, entryId: e, region: 'alt', autoplay: true, muted: true }), [partnerId, UICONF_ID, ENTRY_ID] as const);
  await expect
    .poll(() => page.evaluate(() => Object.values((window as unknown as Win).KalturaPlayer?.getPlayers() ?? {})[0]?.currentTime ?? 0), { timeout: TIMEOUT, message: 'currentTime advances' })
    .toBeGreaterThan(1);
  expect(run.scopes).toEqual([{ widget: 'player', scope: { partnerId, entryId: ENTRY_ID, region: 'alt' } }]);
  expect(hostsOf(run.requests).filter((host) => US_HOST.test(host))).toEqual([]);
  expect(run.requests.filter((url) => url.includes(run.ks))).toEqual([]);
});

const HOSTED = [
  { tag: 'kaltura-genie-widget', widget: 'genie', props: { uiconfId: UICONF_ID }, text: 'Ask me anything' },
  { tag: 'kaltura-media-manager', widget: 'media-manager', props: {}, text: 'Upload' },
  { tag: 'kaltura-vod-avatar-wc', widget: 'vod-avatar', props: {}, text: 'My Avatar Videos' },
];
for (const { tag, widget, props, text } of HOSTED) {
  test(`ALT-02: ${widget} loads in the alt environment and calls no US host`, async ({ page, run }) => {
    await page.evaluate(([t, c]) => (window as unknown as Win).__mount(t, c), [tag, { partnerId, region: 'alt', ...props }] as const);
    await expect.poll(() => visibleText(page), { timeout: TIMEOUT, message: `the ${widget} shows its UI` }).toContain(text);
    expect(run.scopes).toEqual([{ widget, scope: { partnerId, region: 'alt' } }]);
    expect(hostsOf(run.requests).filter((host) => US_HOST.test(host))).toEqual([]);
    expect(run.errors.filter((error) => !/status of 404/.test(error))).toEqual([]);
  });
}

// The Unisphere loader reads its region from `https://unisphere.<region>.ovp.kaltura.com/v1`.
for (const serverUrl of ['', '/', '/v1', '/v1/']) {
  test(`ALT-03: serverUrl ${ENVIRONMENT.unisphere}${serverUrl} loads Genie`, async ({ page, run }) => {
    await page.evaluate(([c]) => (window as unknown as Win).__mount('kaltura-genie-widget', c), [{ partnerId, uiconfId: UICONF_ID, serverUrl: `${ENVIRONMENT.unisphere}${serverUrl}` }] as const);
    await expect.poll(() => visibleText(page), { timeout: TIMEOUT, message: 'Genie shows its UI' }).toContain('Ask me anything');
    expect(run.scopes).toEqual([{ widget: 'genie', scope: { partnerId, region: 'alt' } }]);
  });
}
