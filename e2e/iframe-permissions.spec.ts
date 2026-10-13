// SEC-14: iframe permissions, checked in real browsers.
// The captions editor iframe gets no camera, microphone or display-capture. The player, the
// clips and the recorder (REC-01) have no iframe: their scripts run in the host page and the
// host grants capture.
import { test, expect, type Harness } from './fixtures/harness';

const KS = 'e2e-iframe-permissions-ks';
const CAPTURE = /camera|microphone|display-capture/;
const PLAYER = { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' };
const FLASHCARDS = {
  title: 'Deck',
  partnerId: 1234567,
  uiconfId: 12345678,
  cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '0_abc123', startTime: 0, endTime: 1 }] }],
};

/** The `allow` attribute of the first iframe. */
const frameAllow = (h: Harness) => h.page.locator('#host iframe').first().evaluate((f) => f.getAttribute('allow'));

test.describe('SEC-14: iframe permissions', () => {
  test.beforeEach(async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
  });

  // The editor frame is a blob of the page origin, so Permissions Policy cannot deny it a feature
  // the host page has. The host page policy decides (docs/adr/0008). The check is the allow list.
  test('SEC-14: the captions editor iframe is not granted capture permissions', async ({ harness: h }) => {
    await h.mount('kaltura-captions-editor', { partnerId: 1234567, entryId: '0_abc123' });
    await expect(h.page.locator('#host iframe')).toHaveCount(1);
    expect(await frameAllow(h)).not.toMatch(CAPTURE);
  });

  test('SEC-14: the player and the clips build no iframe (the player script builds its UI in our container)', async ({
    harness: h,
  }) => {
    await h.mount('kaltura-player', PLAYER);
    await h.mount('kaltura-flashcards', FLASHCARDS);
    await h.page.locator('.flashcard-action-btn').first().click();
    await expect(h.page.locator('#host .stub-player-ui')).toHaveCount(2);
    await expect(h.page.locator('#host iframe')).toHaveCount(0);
  });

  test('REC-01: the recorder adds no iframe of its own (capture is the host page permission)', async ({ harness: h }) => {
    await h.mount('kaltura-recorder', { partnerId: 1234567, uiconfId: 7654321 });
    await expect(h.page.locator('#host .stub-recorder-ui')).toHaveCount(1);
    await expect(h.page.locator('#host iframe')).toHaveCount(0);
  });
});
