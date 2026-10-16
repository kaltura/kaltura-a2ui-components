// Live Player test against a real Kaltura account (NVP1, US region). Run: npm run e2e:live.
// Needs NVP1_PARTNER_ID and NVP1_ADMIN_SECRET in .env. Skipped without them. Never runs in CI.
// The page loads the real built bundle and the real Player script. A KS is minted in this process
// and handed over with setKsProvider only. It must never appear in a URL.
import { test as base, expect, type Page } from '@playwright/test';
import { ORIGIN_A } from '../fixtures/constants';
import { mintKs } from './mint-ks';

const partnerId = Number(process.env.NVP1_PARTNER_ID);
const adminSecret = process.env.NVP1_ADMIN_SECRET;
// An admin user of the partner that has a role. Analytics needs it: a KS without a role makes the app fail.
const adminUserId = process.env.NVP1_ADMIN_USER_ID;
// A second partner (US region) that has the Avatar agents enabled. Used by LIVE-16 to LIVE-18.
const agentsPartnerId = Number(process.env.KALTURA_PARTNER_ID);
const agentsAdminSecret = process.env.KALTURA_ADMIN_SECRET;
const agentsUserId = process.env.KALTURA_ADMIN_USER_ID;
const AVATAR_API = 'https://api.avatar.us.kaltura.ai/v1';
// "MediaSpace Embed Player" on the account, listed with uiConf.list.
const UICONF_ID = 1000092;
// Transcoded, and clips work.
const ENTRY_ID = '1_aaaaaaaa';
const CLIP = { start: 2, end: 7 };
// A manual playlist of two ready entries.
const PLAYLIST_ID = '1_bbbbbbbb';
const PLAYLIST_NAME = 'a2ui-test-playlist';
const PLAY_TIMEOUT = 45_000;

interface PlayerState {
  currentTime: number;
  duration: number;
  paused: boolean;
  readyState: number;
}
interface LiveWindow {
  KalturaA2UIWebComponents: { setKsProvider(provider: () => string): void };
  KalturaPlayer: { getPlayers(): Record<string, LivePlayer> };
  __mount(tag: string, config: unknown): void;
}
interface LivePlayer {
  playlist?: { items: unknown[] };
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  play(): void;
}

/** A page with the real bundle, the KS in the provider, and a record of everything it did. */
class LivePage {
  readonly requests: string[] = [];
  readonly consoleErrors: string[] = [];
  /** How many requests sent the KS in the `X-Kaltura-KS` header (`useHeaderForKs`). */
  headerRequests = 0;

  constructor(
    readonly page: Page,
    private ks: string,
  ) {
    page.context().on('request', (r) => {
      this.requests.push(r.url());
      r.headerValue('x-kaltura-ks').then(
        (value) => {
          if (value === this.ks) this.headerRequests += 1;
        },
        () => undefined, // the test ended before the headers arrived
      );
    });
    page.on('websocket', (ws) => this.requests.push(ws.url()));
    page.on('console', (m) => m.type() === 'error' && this.consoleErrors.push(this.scrub(m.text())));
    page.on('pageerror', (e) => this.consoleErrors.push(this.scrub(e.message)));
  }

  /** Text that is safe to print: no KS, no query string. */
  private scrub(text: string): string {
    return text.split(this.ks).join('<KS>').split(encodeURIComponent(this.ks)).join('<KS>');
  }

  async open(): Promise<void> {
    await this.page.goto(`${ORIGIN_A}/harness.html`);
    await this.page.evaluate((ks) => (window as unknown as LiveWindow).KalturaA2UIWebComponents.setKsProvider(() => ks), this.ks);
  }

  /** Replaces the KS in the provider with one of another user. */
  async switchUser(userId: string): Promise<void> {
    this.ks = await mintKs(partnerId, adminSecret ?? '', userId);
    await this.page.evaluate((ks) => (window as unknown as LiveWindow).KalturaA2UIWebComponents.setKsProvider(() => ks), this.ks);
  }

  /**
   * Swaps in a provider that does what a host backend does: it takes the scope request and mints a
   * USER KS limited to it, for `userId`. The minting runs in this process. Each request is recorded.
   * `mint` replaces the default minting (NVP1 partner, entry and playlist privileges).
   */
  async useScopedProvider(
    userId = 'a2ui-live-scoped',
    mint: (scope: Record<string, unknown>) => Promise<string> = (scope) => {
      const privileges = [scope.entryId && `sview:${String(scope.entryId)}`, scope.playlistId && `sviewplaylist:${String(scope.playlistId)}`].filter(Boolean).join(',');
      return mintKs(partnerId, adminSecret ?? '', userId, { type: 0, privileges });
    },
  ): Promise<{ widget: string; scope: Record<string, unknown> }[]> {
    const calls: { widget: string; scope: Record<string, unknown> }[] = [];
    await this.page.exposeFunction('__mintScoped', async (widget: string, scope: Record<string, unknown>) => {
      calls.push({ widget, scope });
      this.ks = await mint(scope);
      return this.ks;
    });
    await this.page.evaluate(() => {
      const w = window as unknown as LiveWindow & { __mintScoped(widget: string, scope: unknown): Promise<string> };
      w.KalturaA2UIWebComponents.setKsProvider(((widget: string, request: { scope: unknown }) => w.__mintScoped(widget, request.scope)) as never);
    });
    return calls;
  }

  /** Visible text of the page, shadow roots included. */
  pageText(): Promise<string> {
    return this.page.evaluate(() => {
      const read = (root: ParentNode): string =>
        Array.from(root.querySelectorAll('*'))
          .filter((el) => !['STYLE', 'SCRIPT'].includes(el.tagName))
          .map((el) => (el.shadowRoot ? read(el.shadowRoot) : '') + Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' '))
          .join(' ');
      return read(document);
    });
  }

  /** Text of the first frame from the Analytics app. */
  analyticsText(): Promise<string> {
    const frame = this.page.frames().find((f) => f !== this.page.mainFrame() && f.url().includes('kmc-analytics'));
    return frame ? frame.evaluate(() => document.body.innerText).catch(() => '') : Promise.resolve('');
  }

  mount(tag: string, config: Record<string, unknown>): Promise<void> {
    return this.page.evaluate(([t, c]) => (window as unknown as LiveWindow).__mount(t, c), [tag, config] as const);
  }

  /** State of the first Kaltura Player on the page and of its video element. */
  state(): Promise<PlayerState | undefined> {
    return this.page.evaluate(() => {
      const player = Object.values((window as unknown as LiveWindow).KalturaPlayer?.getPlayers() ?? {})[0];
      const video = document.querySelector('#host video');
      if (!player || !(video instanceof HTMLVideoElement)) return undefined;
      return { currentTime: player.currentTime, duration: player.duration, paused: player.paused, readyState: video.readyState };
    });
  }

  /**
   * Starts a paused player and tells when it has played to the end of its duration. Mutes first: a
   * script may only autoplay muted. The `ended` flag is not used: Firefox pauses at the clip end
   * without setting it.
   */
  async playToEnd(): Promise<boolean> {
    const state = await this.state();
    if (state && state.duration > 0 && state.currentTime >= state.duration - 0.3) return true;
    if (state?.paused) {
      await this.page.evaluate(() => {
        const player = Object.values((window as unknown as LiveWindow).KalturaPlayer.getPlayers())[0];
        if (player) {
          player.muted = true;
          player.play();
        }
      });
    }
    return false;
  }

  /** Makes one request with the KS in its query string, to prove `ksLeaks` can see it. */
  async requestWithKsInQuery(): Promise<void> {
    await this.page.evaluate((url) => fetch(url, { mode: 'no-cors' }).catch(() => undefined), `https://www.kaltura.com/robots.txt?ks=${this.ks}`);
  }

  /** Request URLs that carry the KS: in the text, encoded, as `ks=` or as a `/ks/` path segment. */
  ksLeaks(): string[] {
    const encoded = encodeURIComponent(this.ks);
    return this.requests
      .filter((url) => url.includes(this.ks) || url.includes(encoded) || /[?&#;]ks=/i.test(url) || /\/ks\/[^/]/i.test(url))
      .map((url) => this.scrub(url).replace(/[?#].*$/, '?<query dropped>'));
  }
}

const test = base.extend<{ live: LivePage }>({
  live: async ({ page }, use) => {
    const live = new LivePage(page, await mintKs(partnerId, adminSecret ?? ''));
    await live.open();
    await use(live);
  },
});

const SKIP_MESSAGE = 'Live test needs NVP1_PARTNER_ID and NVP1_ADMIN_SECRET. Put them in .env and run npm run e2e:live.';
if (!partnerId || !adminSecret) console.warn(`Skipped: ${SKIP_MESSAGE}`);
test.skip(!partnerId || !adminSecret, SKIP_MESSAGE);

/** Checks every request URL of the whole run. Headers are not checked: the Player sends the KS in the X-Kaltura-KS header. */
function expectNoKsInUrls(live: LivePage): void {
  expect(live.requests.length, 'the run made requests').toBeGreaterThan(3);
  expect(live.ksLeaks()).toEqual([]);
}

/** Time and duration count from the clip start, so only the clip is played, not the whole entry. */
async function expectClipOnly(live: LivePage): Promise<void> {
  const length = CLIP.end - CLIP.start;
  await live.page.waitForTimeout(1500);
  const state = await live.state();
  expect([state?.duration, state?.currentTime].map((t) => (t ?? 0) > length - 1 && (t ?? 0) <= length + 0.5)).toEqual([true, true]);
  expect(live.requests.some((url) => url.includes(`/clipTo/${CLIP.end * 1000}/clipFrom/${CLIP.start * 1000}/`))).toBe(true);
}

test('LIVE-01: the player starts muted on its own, plays, and no URL holds the KS', async ({ live, browserName }) => {
  await live.mount('kaltura-player', { partnerId, uiconfId: UICONF_ID, entryId: ENTRY_ID, autoplay: true, muted: true });
  await expect
    .poll(async () => (await live.state())?.readyState ?? 0, { timeout: PLAY_TIMEOUT, message: 'video has data' })
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(async () => (await live.state())?.currentTime ?? 0, { timeout: PLAY_TIMEOUT, message: 'currentTime advances' })
    .toBeGreaterThan(1);
  expect((await live.state())?.paused).toBe(false);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
  // Playwright's WebKit shows no X-Kaltura-KS header on the manifest requests, so it is checked on the other two.
  if (browserName !== 'webkit') await expect.poll(() => live.headerRequests, { message: 'the KS went out in a header' }).toBeGreaterThan(0);
});

test('LIVE-02: startTime and clipTo play only the clip range', async ({ live }) => {
  await live.mount('kaltura-player', { partnerId, uiconfId: UICONF_ID, entryId: ENTRY_ID, startTime: CLIP.start, clipTo: CLIP.end, autoplay: true, muted: true });
  await expect.poll(() => live.playToEnd(), { timeout: PLAY_TIMEOUT, message: 'the clip ends' }).toBe(true);
  await expectClipOnly(live);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
});

test('LIVE-03: a flashcards clip plays only its range', async ({ live }) => {
  await live.mount('kaltura-flashcards', {
    title: 'Live deck',
    partnerId,
    uiconfId: UICONF_ID,
    cards: [{ title: 'Clip', content: 'A clip from the live account.', clips: [{ entryId: ENTRY_ID, startTime: CLIP.start, endTime: CLIP.end }] }],
  });
  await live.page.locator('.flashcard-action-btn').first().click();
  await expect.poll(() => live.playToEnd(), { timeout: PLAY_TIMEOUT, message: 'the clip ends' }).toBe(true);
  await expectClipOnly(live);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
});

test('LIVE-04: the URL check sees a KS in a query string', async ({ live }) => {
  await live.requestWithKsInQuery();
  await expect.poll(() => live.ksLeaks()).toEqual(['https://www.kaltura.com/robots.txt?<query dropped>']);
});

test('LIVE-05: a playlist loads, plays, and no URL holds the KS', async ({ live }) => {
  await live.mount('kaltura-player', { partnerId, uiconfId: UICONF_ID, playlistId: PLAYLIST_ID, autoplay: true, muted: true });
  await expect
    .poll(async () => (await live.state())?.currentTime ?? 0, { timeout: PLAY_TIMEOUT, message: 'currentTime advances' })
    .toBeGreaterThan(1);
  const items = await live.page.evaluate(() => Object.values((window as unknown as LiveWindow).KalturaPlayer.getPlayers())[0]?.playlist?.items.length);
  expect(items).toBe(2);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
});

// An entry with two caption assets: English (opens by default) and French.
const CAPTIONS_ENTRY_ID = '1_cccccccc';
const FRENCH_ASSET_ID = '1_dddddddd';

/** The text inside the editor frame, empty until the frame exists. */
async function editorText(live: LivePage): Promise<string> {
  const frame = live.page.frames().find((f) => f !== live.page.mainFrame());
  return (await frame?.evaluate(() => document.body.innerText).catch(() => '')) ?? '';
}

test('LIVE-06: the captions editor opens the caption asset named by assetId', async ({ live }) => {
  await live.mount('kaltura-captions-editor', { partnerId, entryId: CAPTIONS_ENTRY_ID, assetId: FRENCH_ASSET_ID });
  await expect.poll(() => editorText(live), { timeout: PLAY_TIMEOUT, message: 'the French asset opens' }).toContain('French - a2ui-probe-fr');
  expect(live.consoleErrors).toEqual([]);
});

test('LIVE-07: without assetId the captions editor opens the first asset, not the French one', async ({ live }) => {
  await live.mount('kaltura-captions-editor', { partnerId, entryId: CAPTIONS_ENTRY_ID });
  await expect.poll(() => editorText(live), { timeout: PLAY_TIMEOUT, message: 'the English asset opens' }).toContain('English - a2ui-probe-en');
});

test('LIVE-08: analytics opens the view of a playlist', async ({ live }) => {
  test.skip(!adminUserId, 'Needs NVP1_ADMIN_USER_ID in .env: an admin user that has a role.');
  await live.switchUser(adminUserId ?? '');
  await live.mount('kaltura-analytics', { partnerId, playlistId: PLAYLIST_ID });
  await expect.poll(() => live.analyticsText(), { timeout: PLAY_TIMEOUT, message: 'the playlist view shows' }).toContain(PLAYLIST_NAME);
  expect(live.consoleErrors).toEqual([]);
});

test('LIVE-09: the provider gets the scope of a player and mints a KS limited to its entry', async ({ live }) => {
  const calls = await live.useScopedProvider();
  await live.mount('kaltura-player', { partnerId, uiconfId: UICONF_ID, entryId: ENTRY_ID, autoplay: true, muted: true });
  await expect.poll(async () => (await live.state())?.currentTime ?? 0, { timeout: PLAY_TIMEOUT, message: 'currentTime advances' }).toBeGreaterThan(1);
  expect(calls).toEqual([{ widget: 'player', scope: { region: 'nvp1', partnerId, entryId: ENTRY_ID } }]);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
});

test('LIVE-10: the provider gets the scope of a playlist player and mints a KS limited to its playlist', async ({ live }) => {
  const calls = await live.useScopedProvider();
  await live.mount('kaltura-player', { partnerId, uiconfId: UICONF_ID, playlistId: PLAYLIST_ID, autoplay: true, muted: true });
  await expect.poll(async () => (await live.state())?.currentTime ?? 0, { timeout: PLAY_TIMEOUT, message: 'currentTime advances' }).toBeGreaterThan(1);
  expect(calls).toEqual([{ widget: 'player', scope: { region: 'nvp1', partnerId, playlistId: PLAYLIST_ID } }]);
  expect(live.consoleErrors).toEqual([]);
  expectNoKsInUrls(live);
});

// The hosted widgets load from the real Unisphere host of the NVP1 region. Each gets a USER KS of an
// admin user from the provider, and is found by text that only the loaded widget shows. Not covered:
// the Agents Widget: its backend (agents-manager) answers 403 without CORS headers from the network
// of the test machine, so its agent list cannot load here.
const HOSTED_WIDGETS: { id: string; tag: string; widget: string; props: Record<string, unknown>; scope: Record<string, unknown>; text: string }[] = [
  // The category id is arbitrary: the widget loads with any digits.
  { id: 'LIVE-11', tag: 'kaltura-genie-widget', widget: 'genie', props: { partnerId, uiconfId: UICONF_ID, categoryId: '1' }, scope: { partnerId, categoryId: '1' }, text: 'Ask me anything' },
  { id: 'LIVE-12', tag: 'kaltura-media-manager', widget: 'media-manager', props: { partnerId }, scope: { partnerId }, text: 'Upload' },
  { id: 'LIVE-13', tag: 'kaltura-content-lab', widget: 'content-lab', props: { partnerId, uiconfId: UICONF_ID, entryId: ENTRY_ID }, scope: { partnerId, entryId: ENTRY_ID }, text: 'Captions & Translations' },
  { id: 'LIVE-14', tag: 'kaltura-vod-avatar-wc', widget: 'vod-avatar', props: { partnerId }, scope: { partnerId }, text: 'My Avatar Videos' },
  // Chromium runs with fake camera and microphone (playwright.live.config.ts). Other browsers have none.
  { id: 'LIVE-15', tag: 'kaltura-recorder', widget: 'recorder', props: { partnerId, uiconfId: UICONF_ID }, scope: { partnerId }, text: 'Camera Settings' },
];

for (const { id, tag, widget, props, scope, text } of HOSTED_WIDGETS) {
  test(`${id}: ${widget} loads with the KS the provider mints for its scope`, async ({ live, browserName }) => {
    test.skip(!adminUserId, 'Needs NVP1_ADMIN_USER_ID in .env: an admin user that has a role.');
    test.skip(widget === 'recorder' && browserName !== 'chromium', 'Needs the fake media devices of the Chromium project.');
    const calls = await live.useScopedProvider(adminUserId);
    await live.mount(tag, props);
    await expect.poll(() => live.pageText(), { timeout: PLAY_TIMEOUT, message: `the ${widget} shows its UI` }).toContain(text);
    expect(calls).toEqual([{ widget, scope: { region: 'nvp1', ...scope } }]);
    // Media Manager asks for thumbnails that the probe entries of the test partner do not have.
    const thumbnail404 = /status of 404/;
    expect(live.consoleErrors.filter((e) => widget !== 'media-manager' || !thumbnail404.test(e))).toEqual([]);
    expectNoKsInUrls(live);
  });
}

// The second partner has Avatar agents. These tests run against it with a USER KS of its admin user.
const agentsAccount = Boolean(agentsPartnerId && agentsAdminSecret && agentsUserId);
const mintAgentsKs = (privileges: string) => mintKs(agentsPartnerId, agentsAdminSecret ?? '', agentsUserId ?? '', { type: 0, privileges });

/** The first agent of the partner, listed with an admin KS. The Avatar API is read only here. */
async function firstAgentId(): Promise<string> {
  const adminKs = await mintKs(agentsPartnerId, agentsAdminSecret ?? '', agentsUserId ?? '');
  const res = await fetch(`${AVATAR_API}/agent/list`, { method: 'POST', headers: { authorization: `Bearer ${adminKs}`, 'content-type': 'application/json' }, body: '{}' });
  const body = (await res.json()) as { objects?: { agentId?: string }[] };
  const agentId = body.objects?.[0]?.agentId;
  if (!agentId) throw new Error(`The partner has no Avatar agent (HTTP ${res.status}).`);
  return agentId;
}

// These widgets are not part of the NVP1 table above: they need a KS with a role or an agent claim.
const AGENT_PARTNER_WIDGETS: { id: string; tag: string; widget: string; props: Record<string, unknown>; privileges: () => Promise<string>; text: string; api?: string }[] = [
  // The KS selects the agent: the `agentid` claim is the only thing that tells the Avatar which one to start.
  { id: 'LIVE-16', tag: 'kaltura-avatar', widget: 'avatar', props: { partnerId: agentsPartnerId }, privileges: async () => `agentid:${await firstAgentId()}`, text: 'Speak with agent', api: '/application/appInit' },
  // The Unisphere guide: a playback role is enough for Genie.
  { id: 'LIVE-17', tag: 'kaltura-genie-widget', widget: 'genie', props: { partnerId: agentsPartnerId, uiconfId: UICONF_ID, categoryId: '1' }, privileges: async () => 'setrole:PLAYBACK_BASE_ROLE,sview:*', text: 'Ask me anything' },
  // The avatar service refuses a playback role (403 on avatar/list). It needs an administrator role.
  { id: 'LIVE-18', tag: 'kaltura-vod-avatar-wc', widget: 'vod-avatar', props: { partnerId: agentsPartnerId }, privileges: async () => 'setrole:Publisher Administrator', text: 'My Avatar Videos', api: '/avatar/list' },
];

for (const { id, tag, widget, props, privileges, text, api } of AGENT_PARTNER_WIDGETS) {
  test(`${id}: ${widget} loads with the KS the provider mints on the agents partner`, async ({ live }) => {
    test.skip(!agentsAccount, 'Needs KALTURA_PARTNER_ID, KALTURA_ADMIN_SECRET and KALTURA_ADMIN_USER_ID in .env.');
    const calls = await live.useScopedProvider(agentsUserId, async () => mintAgentsKs(await privileges()));
    // The UI shows before the service answers, so the answer is checked too: a refused KS is a 403 here.
    const answer = api && live.page.waitForResponse((r) => r.url() === `${AVATAR_API}${api}`, { timeout: PLAY_TIMEOUT });
    await live.mount(tag, props);
    await expect.poll(() => live.pageText(), { timeout: PLAY_TIMEOUT, message: `the ${widget} shows its UI` }).toContain(text);
    if (answer) expect((await answer).status()).toBe(200);
    expect(calls).toEqual([{ widget, scope: { region: 'nvp1', partnerId: agentsPartnerId, ...(widget === 'genie' && { categoryId: '1' }) } }]);
    expect(live.consoleErrors).toEqual([]);
    expectNoKsInUrls(live);
  });
}
