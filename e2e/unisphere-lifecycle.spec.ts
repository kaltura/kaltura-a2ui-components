// QA-03, QA-07, SEC-18: Unisphere config and the Media Manager selection event.
// Unisphere hosts are stubbed. Media Manager gets a module that keeps the visual
// settings, so the test can press the row "select" button like Unisphere does.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS } from './fixtures/constants';

const SERVER_URL = `${ALLOWED_HOSTS[0]}/v1`;
const KALTURA_HOST = /^https?:\/\/[^/]*\.kaltura\.com\//;
const MODULE = `
export const createWorkspace = async (cfg) => (window.__wsCfgs = window.__wsCfgs || []).push(cfg) && ({
  kill() {},
  getRuntimeAsync: async () => ({
    mountVisual: async (visual) => { (window.__visuals = window.__visuals || []).push(visual); return { id: 'v1' }; },
    unmountVisual() {},
  }),
});`;

type Seen = { target: string; bubbles: boolean; composed: boolean; detail: { entryId: string; name: string; instanceId: string } };
interface EventWindow { __visuals: { settings: { context: { rowActions: { buttons: { onClick(r: unknown): void }[] } } } }[]; __seen: Record<string, Seen[]> }

async function mountManager(h: Harness, extra: Record<string, unknown> = {}) {
  await h.open();
  await h.page.route(KALTURA_HOST, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: MODULE }),
  );
  await h.page.evaluate(() => {
    const w = window as unknown as EventWindow;
    w.__seen = { host: [], document: [] };
    const record = (key: string) => (e: Event) =>
      w.__seen[key].push({
        target: (e.target as Element).tagName.toLowerCase(),
        bubbles: e.bubbles,
        composed: e.composed,
        detail: (e as CustomEvent).detail,
      });
    document.addEventListener('kaltura-entry-selected', record('document'));
    const mount = (window as unknown as { __mount(t: string, c: unknown): HTMLElement }).__mount;
    (window as unknown as { __mount: unknown }).__mount = (tag: string, config: unknown) => {
      const el = mount(tag, config);
      el.addEventListener('kaltura-entry-selected', record('host'));
      return el;
    };
  });
  await h.mount('kaltura-media-manager', { partnerId: 1234567, ks: 'e2e-ks', serverUrl: SERVER_URL, ...extra });
  await h.page.waitForFunction(() => (window as unknown as EventWindow).__visuals?.length > 0);
  await h.page.evaluate(() => {
    const w = window as unknown as EventWindow;
    w.__visuals[0].settings.context.rowActions.buttons[0].onClick({ id: '0_abc123', name: 'Intro' });
  });
}

const seen = (h: Harness, key: 'host' | 'document') =>
  h.page.evaluate((k) => (window as unknown as EventWindow).__seen[k], key);

test.describe('SEC-18: kaltura-entry-selected', () => {
  test('SEC-18: fires on the custom element with an instanceId', async ({ harness: h }) => {
    await mountManager(h);
    const [event] = await seen(h, 'host');
    expect(event).toMatchObject({
      target: 'kaltura-media-manager',
      bubbles: true,
      composed: true,
      detail: { entryId: '0_abc123', name: 'Intro', instanceId: expect.stringMatching(/^unisphere-mm-/) },
    });
  });

  test('SEC-18: by default one event reaches document (legacy)', async ({ harness: h }) => {
    await mountManager(h);
    expect(await seen(h, 'document')).toHaveLength(1);
  });

  test('SEC-18: legacyDocumentEvents false keeps the event off document', async ({ harness: h }) => {
    await mountManager(h, { legacyDocumentEvents: false });
    expect([(await seen(h, 'host')).length, (await seen(h, 'document')).length]).toEqual([1, 0]);
  });
});

test.describe('F1: Media Manager workspace config', () => {
  test('F1: createWorkspace gets appVersion, a region env and the session', async ({ harness: h }) => {
    await mountManager(h);
    const cfgs = await h.page.evaluate(() => (window as unknown as { __wsCfgs: { config: unknown }[] }).__wsCfgs);
    expect(cfgs[0].config).toMatchObject({ appVersion: expect.any(String), env: 'nvp1', session: { ks: 'e2e-ks', partnerId: 1234567 } });
  });
});

test.describe('QA-03: Unisphere widget config', () => {
  test('QA-03: the loader config has no hard-coded appVersion', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-genie-widget', { partnerId: 1234567, uiconfId: 2, ks: 'e2e-ks', serverUrl: SERVER_URL });
    await h.page.waitForFunction(() => (window as unknown as { __loaderCfgs?: unknown[] }).__loaderCfgs?.length);
    expect(await h.loaderConfigs()).toEqual([expect.not.objectContaining({ appVersion: expect.anything() })]);
  });
});
