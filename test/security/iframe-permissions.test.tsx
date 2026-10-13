// Covers: SEC-14 (player and clip iframes granted camera, microphone and display-capture).
// Turns green: plan item 2.10 (iframe permissions).
// The table below is a snapshot of `allow` and `sandbox` per component. Any change
// to a permission fails here and shows up in review.
import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { mount } from '../helpers/render';
import { PlayerCore } from '../../src/core/player';
import { FlashcardsCore } from '../../src/core/flashcards';
import { RecorderCore } from '../../src/core/recorder';
import { AnalyticsCore } from '../../src/core/analytics';
import { CaptionsEditorCore } from '../../src/core/captions-editor';

afterEach(() => {
  document.body.innerHTML = '';
});

// Playback needs only these. The origin wildcard stays: the player page can
// navigate across Kaltura hosts, and a bare name would drop the grant on redirect.
//  - autoplay: the `autoplay` and `muted` props
//  - fullscreen: the fullscreen button
//  - encrypted-media: DRM-protected entries
const PLAYBACK_ALLOW = 'autoplay *; fullscreen *; encrypted-media *';
// No sandbox on player iframes: any sandbox breaks downloads and Cast/Presentation.
// A sandbox for them is a Phase 3 item in SECF-30837-PLAN.md.
const EDITOR_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';

const CAPTURE = /camera|microphone|display-capture/;

async function iframeOf(component: unknown, props: Record<string, unknown>, beforeRead?: (c: Element) => Promise<void>) {
  const { container } = await mount(component, props);
  await beforeRead?.(container);
  const iframe = container.querySelector('iframe');
  if (!iframe) throw new Error('no iframe rendered');
  return { allow: iframe.getAttribute('allow'), sandbox: iframe.getAttribute('sandbox') };
}

// The clip iframe only exists after the card is opened.
const openFirstCard = async (container: Element) => {
  const start = container.querySelector<HTMLButtonElement>('.flashcard-action-btn');
  await act(async () => start?.click());
};

const CASES: [string, () => Promise<{ allow: string | null; sandbox: string | null }>, { allow: string; sandbox: string | null }][] = [
  [
    'player',
    () => iframeOf(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: 'k' }),
    { allow: PLAYBACK_ALLOW, sandbox: null },
  ],
  [
    'flashcards clip',
    () =>
      iframeOf(
        FlashcardsCore,
        {
          title: 'Deck',
          cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '1_abc', startTime: 0, endTime: 1 }] }],
          partnerId: 1,
          uiconfId: 2,
          ks: 'k',
        },
        openFirstCard,
      ),
    { allow: PLAYBACK_ALLOW, sandbox: null },
  ],
  [
    'captions editor',
    () => iframeOf(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc', ks: 'k' }),
    { allow: PLAYBACK_ALLOW, sandbox: EDITOR_SANDBOX },
  ],
  [
    'analytics',
    () => iframeOf(AnalyticsCore, { partnerId: 1, ks: 'k' }),
    { allow: 'fullscreen *', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups' },
  ],
  [
    // The recorder records from camera, microphone and screen. It is the one
    // iframe that needs capture, so the grant stays here.
    'recorder',
    () => iframeOf(RecorderCore, { partnerId: 1, ks: 'k' }),
    {
      allow: 'autoplay *; fullscreen *; encrypted-media *; camera *; microphone *; display-capture *',
      sandbox: EDITOR_SANDBOX,
    },
  ],
];

describe('SEC-14: iframe permissions', () => {
  it.each(CASES)('SEC-14: %s iframe allow and sandbox snapshot', async (_label, read, expected) => {
    expect(await read()).toEqual(expected);
  });

  it.each(CASES.filter(([label]) => label !== 'recorder'))(
    'SEC-14: %s iframe has no camera, microphone or display-capture',
    async (_label, read) => {
      expect((await read()).allow).not.toMatch(CAPTURE);
    },
  );

  it('SEC-14: recorder iframe keeps camera, microphone and display-capture (it records)', async () => {
    const recorder = CASES.find(([label]) => label === 'recorder')!;
    expect((await recorder[1]()).allow).toMatch(/camera.*microphone.*display-capture/);
  });
});
