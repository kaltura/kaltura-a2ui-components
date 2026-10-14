// SEC-08, QA-04: `<kaltura-avatar>` on the Unisphere embeds API in a real browser.
// The loader is the stubbed `ok` module from e2e/fixtures/servers.mjs.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS } from './fixtures/constants';

const SERVER_URL = `${ALLOWED_HOSTS[0]}/v1`;
const HOST_KS = 'e2e-avatar-host-ks';
const OLD_HOST = /kaltura\.ai\//;

interface AvatarWindow {
  __avatarLog?: string[];
  __avatarDisconnect?: (data: unknown) => void;
  __events?: unknown[];
  KalturaA2UIWebComponents: { setEventHandler(handler: (event: unknown) => void): void };
}

const log = (h: Harness) => h.page.evaluate(() => (window as unknown as AvatarWindow).__avatarLog ?? []);

async function mountAvatar(h: Harness, config: Record<string, unknown> = {}, ks: string | null = HOST_KS) {
  await h.page.route(OLD_HOST, (route) => route.abort());
  await h.open();
  if (ks) await h.setKsProvider('sync', ks);
  await h.page.evaluate(() => {
    const w = window as unknown as AvatarWindow;
    w.__events = [];
    w.KalturaA2UIWebComponents.setEventHandler((event) => w.__events?.push(event));
  });
  await h.mount('kaltura-avatar', { partnerId: 1234567, serverUrl: SERVER_URL, ...config });
}

test.describe('SEC-08: the avatar loads through the Unisphere loader', () => {
  test('SEC-08: the provider KS goes to embeds.workspace and no script tag is added', async ({ harness: h }) => {
    await mountAvatar(h);
    await expect.poll(() => log(h)).toEqual(['workspace', 'contained']);
    const scripts = await h.page.evaluate(() => [...document.scripts].map((s) => s.getAttribute('src')).filter(Boolean));
    expect([await h.embedsConfigs(), await h.providerWidgets(), scripts, h.requests.filter((u) => OLD_HOST.test(u))]).toEqual([
      [{ env: 'nvp1', session: { ks: HOST_KS, partnerId: 1234567 }, apis: [{ name: 'genieAvatar', settings: { theme: { type: 'dark' } } }] }],
      ['avatar'],
      ['/dist/kaltura-wc.js'],
      [],
    ]);
  });

  // The web component treats a missing required prop as invalid, so it shows the error.
  test('SEC-08: with no provider a ks prop is ignored and nothing loads', async ({ harness: h }) => {
    await mountAvatar(h, { ks: 'agent-written-ks' }, null);
    await h.settle();
    expect([await log(h), h.loaderRequests(), await h.hostText()]).toEqual([[], [], 'Failed to load Kaltura Avatar: Invalid ks: call setKsProvider']);
  });
});

test.describe('QA-04: avatar lifecycle', () => {
  test('QA-04: removing the element unsubscribes, removes the embed and destroys the workspace', async ({ harness: h }) => {
    await mountAvatar(h);
    await expect.poll(() => log(h)).toEqual(['workspace', 'contained']);
    await h.page.evaluate(() => document.querySelector('kaltura-avatar')?.remove());
    await expect.poll(() => log(h)).toEqual(['workspace', 'contained', 'unsubscribe', 'remove', 'destroy']);
  });

  test('QA-04: a disconnect reaches setEventHandler with a safe reason', async ({ harness: h }) => {
    await mountAvatar(h);
    await expect.poll(() => log(h)).toEqual(['workspace', 'contained']);
    const events = await h.page.evaluate(() => {
      const w = window as unknown as AvatarWindow;
      w.__avatarDisconnect?.({ reason: 'ConversationEnded' });
      w.__avatarDisconnect?.({ reason: '<img src=x onerror="window.__pwned.push(1)">' });
      return w.__events;
    });
    expect([events, await h.pwned()]).toEqual([
      [
        { type: 'avatar-disconnected', widget: 'avatar', detail: { reason: 'ConversationEnded', instanceId: expect.stringMatching(/^kaltura-avatar-/) } },
        { type: 'avatar-disconnected', widget: 'avatar', detail: { reason: 'UnknownReason', instanceId: expect.stringMatching(/^kaltura-avatar-/) } },
      ],
      [],
    ]);
  });
});
