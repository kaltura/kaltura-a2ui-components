// SEC-14: iframe permissions, checked in real browsers.
// Player and clip iframes get no camera, microphone or display-capture. The recorder
// has no iframe (REC-01): its script runs in the host page and the host grants capture.
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

interface FrameFacts {
  allow: string | null;
  sandbox: string | null;
  camera: boolean | null;
}

/** Attributes of the first iframe, plus what Chromium's policy API says about camera for its src. */
async function frameFacts(h: Harness): Promise<FrameFacts> {
  return h.page.locator('#host iframe').first().evaluate((f) => {
    const frame = f as HTMLIFrameElement & { featurePolicy?: { allowsFeature(name: string, origin?: string): boolean } };
    return {
      allow: frame.getAttribute('allow'),
      sandbox: frame.getAttribute('sandbox'),
      camera: frame.featurePolicy ? frame.featurePolicy.allowsFeature('camera', new URL(frame.src).origin) : null,
    };
  });
}

test.describe('SEC-14: iframe permissions', () => {
  test.beforeEach(async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
  });

  test('SEC-14: player iframe has no capture permissions', async ({ harness: h, browserName }) => {
    await h.mount('kaltura-player', PLAYER);
    await h.settle();
    const facts = await frameFacts(h);
    expect(facts.allow).not.toMatch(CAPTURE);
    if (browserName === 'chromium') expect(facts.camera).toBe(false);
  });

  test('SEC-14: flashcards clip iframe has no capture permissions', async ({ harness: h, browserName }) => {
    await h.mount('kaltura-flashcards', FLASHCARDS);
    await h.page.locator('.flashcard-action-btn').first().click();
    await h.settle();
    const facts = await frameFacts(h);
    expect(facts.allow).not.toMatch(CAPTURE);
    if (browserName === 'chromium') expect(facts.camera).toBe(false);
  });

  test('SEC-14: captions editor iframe has no capture permissions', async ({ harness: h }) => {
    await h.mount('kaltura-captions-editor', { partnerId: 1234567, entryId: '0_abc123' });
    await h.settle();
    expect((await frameFacts(h)).allow).not.toMatch(CAPTURE);
  });

  test('REC-01: the recorder adds no iframe of its own (capture is the host page permission)', async ({ harness: h }) => {
    await h.mount('kaltura-recorder', { partnerId: 1234567, uiconfId: 7654321 });
    await expect(h.page.locator('#host .stub-recorder-ui')).toHaveCount(1);
    await expect(h.page.locator('#host iframe')).toHaveCount(0);
  });

  test('SEC-14: player and clip iframes have no sandbox (it breaks downloads and Cast/Presentation)', async ({
    harness: h,
  }) => {
    await h.mount('kaltura-player', PLAYER);
    await h.settle();
    expect((await frameFacts(h)).sandbox).toBeNull();
    await h.mount('kaltura-flashcards', FLASHCARDS);
    await h.page.locator('.flashcard-action-btn').first().click();
    await h.settle();
    const clipSandbox = await h.page.locator('.flashcard-clip-player').evaluate((f) => f.getAttribute('sandbox'));
    expect(clipSandbox).toBeNull();
  });
});
