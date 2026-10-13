// Covers: SEC-14 (player and clip iframes granted camera, microphone and display-capture).
// Turns green: plan item 2.10 (iframe permissions).
// The table below is a snapshot of `allow` and `sandbox` per component. Any change
// to a permission fails here and shows up in review.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { mount } from '../helpers/render';
import { setPlayerSandbox, PLAYER_SANDBOX_PRESET } from '../../src/core/host-hooks';
import { setKsProvider } from '../../src/core/ks';
import { PlayerCore } from '../../src/core/player';
import { FlashcardsCore } from '../../src/core/flashcards';
import { RecorderCore } from '../../src/core/recorder';
import { AnalyticsCore } from '../../src/core/analytics';
import { CaptionsEditorCore } from '../../src/core/captions-editor';

afterEach(() => {
  document.body.innerHTML = '';
  setKsProvider(undefined);
});

// Playback needs only these. The origin wildcard stays: the player page can
// navigate across Kaltura hosts, and a bare name would drop the grant on redirect.
//  - autoplay: the `autoplay` and `muted` props
//  - fullscreen: the fullscreen button
//  - encrypted-media: DRM-protected entries
const PLAYBACK_ALLOW = 'autoplay *; fullscreen *; encrypted-media *';
// No sandbox on player iframes by default: a sandbox can break downloads and
// Cast/Presentation. Hosts opt in with `setPlayerSandbox` (see the last block).
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
    () => {
      setKsProvider(() => 'k');
      return iframeOf(AnalyticsCore, { partnerId: 1 });
    },
    { allow: 'fullscreen *', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups' },
  ],
];

describe('SEC-14: iframe permissions', () => {
  it.each(CASES)('SEC-14: %s iframe allow and sandbox snapshot', async (_label, read, expected) => {
    expect(await read()).toEqual(expected);
  });

  it.each(CASES)(
    'SEC-14: %s iframe has no camera, microphone or display-capture',
    async (_label, read) => {
      expect((await read()).allow).not.toMatch(CAPTURE);
    },
  );

  it('REC-01: the recorder creates no iframe of its own: the Express Recorder script builds its UI in our container', async () => {
    const { container } = await mount(RecorderCore, { partnerId: 1, uiconfId: 2, ks: 'k' });
    expect(container.querySelectorAll('iframe').length).toBe(0);
  });
});

// With the opt-in host sandbox, only the player and clip iframes change.
const PLAYER_FRAMES = ['player', 'flashcards clip'];

describe('SEC-14: iframe permissions with setPlayerSandbox(PLAYER_SANDBOX_PRESET)', () => {
  beforeEach(() => setPlayerSandbox(PLAYER_SANDBOX_PRESET));
  afterEach(() => setPlayerSandbox(undefined));

  it.each(CASES)('SEC-14: %s iframe allow and sandbox snapshot with the preset', async (label, read, expected) => {
    const sandbox = PLAYER_FRAMES.includes(label) ? PLAYER_SANDBOX_PRESET.join(' ') : expected.sandbox;
    expect(await read()).toEqual({ ...expected, sandbox });
  });
});
