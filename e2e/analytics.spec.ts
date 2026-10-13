// ANA-01: the analytics embed uses the documented postMessage handshake.
// A local stub stands in for the KMC Analytics app. The page is served by a route
// at the real KMC URL, so the iframe has the real origin and the origin and source
// checks run in a real browser. The real Analytics app is not contacted.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Harness } from './fixtures/harness';
import { ORIGIN_A } from './fixtures/constants';

const KS = 'E2E_KS_marker_7f3a9c1d';
const KMC = 'https://kmc.kaltura.com';
const ANALYTICS_PAGE = `${KMC}/apps/kmc-analytics/latest/index.html`;
const SIBLING_PAGE = `${KMC}/e2e-sibling.html`;
const STUB = readFileSync(resolve(process.cwd(), 'e2e/fixtures/analytics-stub.html'), 'utf8').replace('__HOST_ORIGIN__', ORIGIN_A);
// Same origin as the Analytics app, but not the iframe the widget created.
const SIBLING = `<script>
  parent.postMessage({ messageType: 'analyticsInit', payload: { viewsConfig: { spoofed: {} } } }, '*');
  parent.postMessage({ messageType: 'analyticsInitComplete' }, '*');
  parent.postMessage({ messageType: 'updateLayout', payload: { height: 9999 } }, '*');
</script>`;

interface Logged { type: string; payload: unknown; origin: string }
interface StubWindow { __log: Logged[]; sendToHost(message: unknown): void }

async function mountAnalytics(h: Harness, config: Record<string, unknown> = {}) {
  await h.open();
  await h.page.route(ANALYTICS_PAGE, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
  await h.page.route(SIBLING_PAGE, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: SIBLING }));
  await h.setKsProvider('sync', KS);
  await h.mount('kaltura-analytics', { partnerId: 1234567, ...config });
  const frame = () => h.page.frames().find((f) => f.url().startsWith(ANALYTICS_PAGE));
  const log = async (): Promise<Logged[]> => (await frame()?.evaluate(() => (window as unknown as StubWindow).__log)) ?? [];
  const types = async () => (await log()).map((entry) => entry.type);
  const height = () => h.page.locator('#host .kaltura-analytics-container').evaluate((el) => (el as HTMLElement).style.height);
  const sendLayout = async (value: unknown) => {
    await frame()?.evaluate((v) => (window as unknown as StubWindow).sendToHost({ messageType: 'updateLayout', payload: { height: v } }), value);
    await h.page.waitForTimeout(150);
  };
  await expect.poll(types).toEqual(['init', 'navigate', 'updateFilters']);
  return { log, types, height, sendLayout };
}

test.describe('ANA-01: analytics handshake', () => {
  test('ANA-01: the iframe URL holds no KS and no ids', async ({ harness: h }) => {
    await mountAnalytics(h, { entryId: '0_abc123' });
    expect(await h.page.locator('#host iframe').getAttribute('src')).toBe(ANALYTICS_PAGE);
  });

  test('ANA-01: init carries the provider KS, partner and region hosts', async ({ harness: h }) => {
    const { log } = await mountAnalytics(h);
    const [init] = await log();
    expect(init).toEqual({
      type: 'init',
      origin: ORIGIN_A,
      payload: {
        kalturaServer: { uri: 'https://www.kaltura.com' },
        cdnServers: { serverUri: 'https://cdnapisec.kaltura.com', securedServerUri: 'https://cdnapisec.kaltura.com' },
        ks: KS,
        pid: 1234567,
        locale: 'en',
        live: { pollInterval: 30, healthNotificationsCount: 50 },
        menuConfig: { showMenu: false },
        viewsConfig: { entry: { backBtn: {} } },
      },
    });
  });

  test('ANA-01: navigate and updateFilters follow the props', async ({ harness: h }) => {
    const { log } = await mountAnalytics(h, { reportType: 'geo-location', fromDate: '2026-01-01', toDate: '2026-03-31' });
    expect((await log()).slice(1).map(({ type, payload }) => ({ type, payload }))).toEqual([
      { type: 'navigate', payload: { url: '/analytics/geo-location' } },
      { type: 'updateFilters', payload: { queryParams: { dateFrom: '2026-01-01', dateTo: '2026-03-31' } } },
    ]);
  });

  test('ANA-01: updateLayout resizes the widget and the height is clamped', async ({ harness: h }) => {
    const { sendLayout, height } = await mountAnalytics(h);
    const heights = [];
    for (const value of [640, 99999, 5, 'tall']) {
      await sendLayout(value);
      heights.push(await height());
    }
    expect(heights).toEqual(['640px', '10000px', '400px', '400px']);
  });

  test('ANA-01: the KS never shows in text or console', async ({ harness: h }) => {
    await mountAnalytics(h);
    expect([(await h.hostText()).includes(KS), h.consoleText.some((line) => line.includes(KS))]).toEqual([false, false]);
  });
});

test.describe('ANA-01: untrusted senders', () => {
  test('ANA-01: a message from the host page itself (wrong origin) is ignored', async ({ harness: h }) => {
    const { types, height } = await mountAnalytics(h);
    await h.page.evaluate(() => {
      window.postMessage({ messageType: 'analyticsInit', payload: {} }, '*');
      window.postMessage({ messageType: 'analyticsInitComplete' }, '*');
      window.postMessage({ messageType: 'updateLayout', payload: { height: 9999 } }, '*');
    });
    await h.settle();
    expect([await types(), await height()]).toEqual([['init', 'navigate', 'updateFilters'], '']);
  });

  test('ANA-01: a message from another window on the KMC origin (wrong source) is ignored', async ({ harness: h }) => {
    const { types, height } = await mountAnalytics(h);
    await h.page.evaluate((src) => {
      const sibling = document.createElement('iframe');
      sibling.src = src;
      document.body.appendChild(sibling);
    }, SIBLING_PAGE);
    await expect.poll(() => h.page.frames().some((f) => f.url() === SIBLING_PAGE)).toBe(true);
    await h.settle();
    expect([await types(), await height()]).toEqual([['init', 'navigate', 'updateFilters'], '']);
  });
});
