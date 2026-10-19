// Live tests against a second environment registered with setEnvironments. Read only. Run: npm run e2e:live.
// Needs ALT_ENV_JSON, ALT_PARTNER_ID, ALT_ADMIN_SECRET, ALT_UICONF_ID and ALT_ENTRY_ID in .env. Skipped without them. Never runs in CI.
// ALT_ENV_JSON is one setEnvironments entry with the keys serviceUrl, cdn, vod, kmc, unisphere and agents.
// The environment is registered as "alt".
import { test as base, expect } from '@playwright/test';
import { ORIGIN_A } from '../fixtures/constants';
import { mintKs } from './mint-ks';

const partnerId = Number(process.env.ALT_PARTNER_ID);
const adminSecret = process.env.ALT_ADMIN_SECRET;
const UICONF_ID = Number(process.env.ALT_UICONF_ID);
const ENTRY_ID = process.env.ALT_ENTRY_ID ?? '';
const TIMEOUT = 45_000;
const ENV_KEYS = ['serviceUrl', 'cdn', 'vod', 'kmc', 'unisphere', 'agents'] as const;
const ENV_NAME = 'alt';

function readEnvironment(): Record<(typeof ENV_KEYS)[number], string> | undefined {
  try {
    const parsed: unknown = JSON.parse(process.env.ALT_ENV_JSON ?? '');
    const entry = parsed as Record<string, unknown> | null;
    return entry && ENV_KEYS.every((key) => typeof entry[key] === 'string')
      ? (entry as Record<(typeof ENV_KEYS)[number], string>)
      : undefined;
  } catch {
    return undefined;
  }
}
const environment = readEnvironment();
const ENVIRONMENT = environment ?? { serviceUrl: '', cdn: '', vod: '', kmc: '', unisphere: '', agents: '' };

interface Win {
  KalturaA2UIWebComponents: { setEnvironments(map: unknown): void; setKsProvider(provider: unknown): void };
  KalturaPlayer?: { getPlayers(): Record<string, { currentTime: number; paused: boolean }> };
  __mount(tag: string, config: unknown): void;
  __mintScoped(widget: string, scope: unknown): Promise<string>;
}

const test = base.extend<{ run: { requests: string[]; errors: string[]; scopes: unknown[]; ks: string } }>({
  run: async ({ page }, use) => {
    const ks = await mintKs(partnerId, adminSecret ?? '', 'a2ui-live-test', { serviceUrl: ENVIRONMENT.serviceUrl });
    const run = { requests: [] as string[], errors: [] as string[], scopes: [] as unknown[], ks };
    page.context().on('request', (r) => run.requests.push(r.url()));
    page.on('console', (m) => m.type() === 'error' && run.errors.push(m.text().split(ks).join('<KS>')));
    page.on('pageerror', (e) => run.errors.push(e.message.split(ks).join('<KS>')));
    await page.exposeFunction('__mintScoped', (widget: string, scope: unknown) => {
      run.scopes.push({ widget, scope });
      return ks;
    });
    await page.goto(`${ORIGIN_A}/harness.html`);
    await page.evaluate(([name, environment]) => {
      const w = window as unknown as Win;
      w.KalturaA2UIWebComponents.setEnvironments({ [name]: environment });
      w.KalturaA2UIWebComponents.setKsProvider((widget: string, request: { scope: unknown }) => w.__mintScoped(widget, request.scope));
    }, [ENV_NAME, ENVIRONMENT] as const);
    await use(run);
  },
});

const missing = [
  !environment && 'ALT_ENV_JSON (valid JSON with serviceUrl, cdn, vod, kmc, unisphere and agents)',
  !partnerId && 'ALT_PARTNER_ID',
  !adminSecret && 'ALT_ADMIN_SECRET',
  !UICONF_ID && 'ALT_UICONF_ID',
  !ENTRY_ID && 'ALT_ENTRY_ID',
].filter(Boolean);
const SKIP_MESSAGE = `Live test needs ${missing.join(', ')}. Put them in .env and run npm run e2e:live.`;
if (missing.length) console.warn(`Skipped: ${SKIP_MESSAGE}`);
test.skip(missing.length > 0, SKIP_MESSAGE);

const hostsOf = (urls: string[]) => [...new Set(urls.map((url) => new URL(url).host))];
/** Hosts of the default region. A widget of the alt environment must never call them. */
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

test('ENV-01: the player plays in the alt environment and calls no US host', async ({ page, run }) => {
  await page.evaluate(([p, u, e, region]) => (window as unknown as Win).__mount('kaltura-player', { partnerId: p, uiconfId: u, entryId: e, region, autoplay: true, muted: true }), [partnerId, UICONF_ID, ENTRY_ID, ENV_NAME] as const);
  await expect
    .poll(() => page.evaluate(() => Object.values((window as unknown as Win).KalturaPlayer?.getPlayers() ?? {})[0]?.currentTime ?? 0), { timeout: TIMEOUT, message: 'currentTime advances' })
    .toBeGreaterThan(1);
  expect(run.scopes).toEqual([{ widget: 'player', scope: { partnerId, entryId: ENTRY_ID, region: ENV_NAME } }]);
  expect(hostsOf(run.requests).filter((host) => US_HOST.test(host))).toEqual([]);
  expect(run.requests.filter((url) => url.includes(run.ks))).toEqual([]);
});

const HOSTED = [
  { tag: 'kaltura-genie-widget', widget: 'genie', props: { uiconfId: UICONF_ID }, text: 'Ask me anything' },
  { tag: 'kaltura-media-manager', widget: 'media-manager', props: {}, text: 'Upload' },
  { tag: 'kaltura-vod-avatar-wc', widget: 'vod-avatar', props: {}, text: 'My Avatar Videos' },
];
for (const { tag, widget, props, text } of HOSTED) {
  test(`ENV-02: ${widget} loads in the alt environment and calls no US host`, async ({ page, run }) => {
    await page.evaluate(([t, c]) => (window as unknown as Win).__mount(t, c), [tag, { partnerId, region: ENV_NAME, ...props }] as const);
    await expect.poll(() => visibleText(page), { timeout: TIMEOUT, message: `the ${widget} shows its UI` }).toContain(text);
    expect(run.scopes).toEqual([{ widget, scope: { partnerId, region: ENV_NAME } }]);
    expect(hostsOf(run.requests).filter((host) => US_HOST.test(host))).toEqual([]);
    expect(run.errors.filter((error) => !/status of 404/.test(error))).toEqual([]);
  });
}

// The Unisphere loader reads its region from `https://unisphere.<region>.ovp.kaltura.com/v1`.
for (const serverUrl of ['', '/', '/v1', '/v1/']) {
  test(`ENV-03: serverUrl with suffix ${JSON.stringify(serverUrl)} loads Genie`, async ({ page, run }) => {
    await page.evaluate(([c]) => (window as unknown as Win).__mount('kaltura-genie-widget', c), [{ partnerId, uiconfId: UICONF_ID, serverUrl: `${ENVIRONMENT.unisphere}${serverUrl}` }] as const);
    await expect.poll(() => visibleText(page), { timeout: TIMEOUT, message: 'Genie shows its UI' }).toContain('Ask me anything');
    expect(run.scopes).toEqual([{ widget: 'genie', scope: { partnerId, region: ENV_NAME } }]);
  });
}

test('ENV-04: the Agents Widget calls the agents service of the alt environment', async ({ page, run }) => {
  const answer = page.waitForResponse((r) => r.url() === `${ENVIRONMENT.agents}/api/v1/agent/list`, { timeout: TIMEOUT });
  await page.evaluate(([c]) => (window as unknown as Win).__mount('kaltura-agents-widget', c), [{ partnerId, region: ENV_NAME }] as const);
  expect((await answer).status()).toBe(200);
  expect(run.scopes).toEqual([{ widget: 'agents-widget', scope: { partnerId, region: ENV_NAME } }]);
  expect(hostsOf(run.requests).filter((host) => US_HOST.test(host))).toEqual([]);
  expect(run.errors).toEqual([]);
});
