// SEC-10: the Player and the Flashcards clips load the Kaltura Player script and pass the KS in the
// setup config. No request URL holds the KS, and unmounting destroys the player.
// The script is the stub in e2e/fixtures/kaltura-player-stub.js, served for the real Kaltura URL by Harness.open().
import { test, expect, type Harness } from './fixtures/harness';

const KS = 'E2E_PLAYER_KS_marker_3d8e';
const PLAYER = { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' };
const FLASHCARDS = {
  title: 'Deck',
  partnerId: 1234567,
  uiconfId: 12345678,
  cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '0_clip123', startTime: 10.4, endTime: 20.6 }] }],
};
const SCRIPT_URL = 'https://cdnapisec.kaltura.com/p/1234567/embedPlaykitJs/partner_id/1234567/uiconf_id/12345678';

interface PlayerWindow {
  __playerLog?: string[];
  __playerLoads?: Array<{ info: unknown; options: unknown }>;
  __playerSetups?: Array<{ provider: Record<string, unknown> }>;
}

const log = (h: Harness) => h.page.evaluate(() => (window as unknown as PlayerWindow).__playerLog ?? []);
const loads = (h: Harness) => h.page.evaluate(() => (window as unknown as PlayerWindow).__playerLoads ?? []);
const setups = (h: Harness) => h.page.evaluate(() => (window as unknown as PlayerWindow).__playerSetups ?? []);

test.beforeEach(async ({ harness: h }) => {
  await h.open();
  await h.setKsProvider('sync', KS);
});

test('SEC-10: the player gets the KS in its setup config and no request URL holds it', async ({ harness: h }) => {
  await h.mount('kaltura-player', PLAYER);
  await expect(h.page.locator('#host .stub-player-ui')).toHaveCount(1);
  expect([
    h.requests.filter((url) => url.includes('embedPlaykitJs')),
    h.requests.filter((url) => url.includes(KS)),
    (await setups(h)).map((setup) => setup.provider),
    await loads(h),
    await h.page.locator('#host iframe').count(),
  ]).toEqual([
    [SCRIPT_URL],
    [],
    [{ partnerId: 1234567, uiConfId: 12345678, ks: KS, useHeaderForKs: true }],
    [{ info: { entryId: '0_abc123' }, options: {} }],
    0,
  ]);
});

test('SEC-10: a flashcards clip plays with the same script and the KS stays out of URLs', async ({ harness: h }) => {
  await h.mount('kaltura-flashcards', FLASHCARDS);
  await h.page.locator('.flashcard-action-btn').first().click();
  await expect(h.page.locator('#host .stub-player-ui')).toHaveCount(1);
  expect([h.requests.filter((url) => url.includes(KS)), (await setups(h)).map((setup) => setup.provider.ks), await loads(h)]).toEqual([
    [],
    [KS],
    [{ info: { entryId: '0_clip123' }, options: { startTime: 10 } }],
  ]);
});

test('a flashcards clip pauses at its end and rewinds to its start', async ({ harness: h }) => {
  await h.mount('kaltura-flashcards', FLASHCARDS);
  await h.page.locator('.flashcard-action-btn').first().click();
  await expect.poll(() => log(h)).toEqual(['setup', 'loadMedia']);
  // The stub has no playback. The page sets the time and fires the event, as the player does.
  await h.page.evaluate(() => {
    const w = window as unknown as { __playerEmit: (type: string) => void; __playerCurrent: { currentTime: number } };
    w.__playerCurrent.currentTime = 21.2;
    w.__playerEmit('timeupdate');
  });
  expect([await log(h), await h.page.evaluate(() => (window as unknown as { __playerCurrent: { currentTime: number } }).__playerCurrent.currentTime)]).toEqual([
    ['setup', 'loadMedia', 'pause'],
    10,
  ]);
});

test('SEC-10: removing the element destroys the player and empties it', async ({ harness: h }) => {
  await h.mount('kaltura-player', PLAYER);
  await expect.poll(() => log(h)).toEqual(['setup', 'loadMedia']);
  await h.page.evaluate(() => document.querySelector('kaltura-player')?.remove());
  await expect.poll(() => log(h)).toEqual(['setup', 'loadMedia', 'destroy']);
  await expect(h.page.locator('.stub-player-ui')).toHaveCount(0);
});

test('SEC-10: the KS is not in the DOM, the console or the page errors', async ({ harness: h }) => {
  await h.mount('kaltura-player', PLAYER);
  await expect(h.page.locator('#host .stub-player-ui')).toHaveCount(1);
  expect(JSON.stringify([await h.page.content(), h.consoleText, h.pageErrors])).not.toContain(KS);
});

test('SEC-10: a script that fails to load shows the error and never the KS', async ({ harness: h }) => {
  h.playerMode = 'fail';
  await h.mount('kaltura-player', PLAYER);
  await expect(h.page.locator('#host [role=alert]')).toHaveText(/^Failed to load player: /);
  expect(JSON.stringify([await h.page.content(), h.consoleText])).not.toContain(KS);
});
