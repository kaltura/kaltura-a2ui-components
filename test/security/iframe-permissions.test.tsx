// Covers: SEC-14 (iframes granted camera, microphone and display-capture).
// The table below is a snapshot of `allow` and `sandbox` per iframe component. Any change
// to a permission fails here and shows up in review. The player and the flashcards clips
// build no iframe (docs/adr/0008).
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { mount } from '../helpers/render';
import { playerRemote } from '../helpers/player-remote';
import { captionsRemote } from '../helpers/captions-remote';
import { setKsProvider } from '../../src/core/ks';
import { PlayerCore } from '../../src/core/player';
import { FlashcardsCore } from '../../src/core/flashcards';
import { RecorderCore } from '../../src/core/recorder';
import { AnalyticsCore } from '../../src/core/analytics';
import { CaptionsEditorCore } from '../../src/core/captions-editor';

let player: ReturnType<typeof playerRemote>;
let captions: ReturnType<typeof captionsRemote>;

beforeEach(() => {
  player = playerRemote();
  captions = captionsRemote();
});

afterEach(() => {
  player.restore();
  captions.restore();
  document.body.innerHTML = '';
  setKsProvider(undefined);
});

// Playback needs only these. The origin wildcard stays: the editor page can
// navigate across Kaltura hosts, and a bare name would drop the grant on redirect.
//  - autoplay: the editor plays the entry
//  - fullscreen: the fullscreen button
//  - encrypted-media: DRM-protected entries
const PLAYBACK_ALLOW = ['autoplay', 'fullscreen', 'encrypted-media'].map(feature => `${feature} 'self' https://cdnapisec.kaltura.com`).join('; ');
const EDITOR_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';

const CAPTURE = /camera|microphone|display-capture/;

async function iframeOf(component: unknown, props: Record<string, unknown>, beforeRead?: (c: Element) => Promise<void>) {
  const { container } = await mount(component, props);
  await beforeRead?.(container);
  const iframe = container.querySelector('iframe');
  if (!iframe) throw new Error('no iframe rendered');
  // The editor sets `allow` as a property. jsdom keeps it as a plain field, a browser reflects it.
  return { allow: iframe.getAttribute('allow') ?? iframe.allow, sandbox: iframe.getAttribute('sandbox') };
}

// The editor iframe exists once the editor page is fetched.
const editorReady = async () => {
  await captions.ready();
};

const CASES: [string, () => Promise<{ allow: string | null; sandbox: string | null }>, { allow: string; sandbox: string | null }][] = [
  [
    'captions editor',
    () => iframeOf(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc', ks: 'k' }, editorReady),
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

// The clip player only exists after the card is opened.
const openFirstCard = async (container: Element) => {
  const start = container.querySelector<HTMLButtonElement>('.flashcard-action-btn');
  await act(async () => start?.click());
};

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

  it('SEC-14: the player builds no iframe: the Kaltura Player script builds its UI in our container', async () => {
    const { container } = await mount(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: 'k' });
    await player.ready();
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.fake-player-ui').length]).toEqual([0, 1]);
  });

  it('SEC-14: a flashcards clip builds no iframe either', async () => {
    const { container } = await mount(FlashcardsCore, {
      title: 'Deck',
      cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '1_abc', startTime: 0, endTime: 1 }] }],
      partnerId: 1,
      uiconfId: 2,
      ks: 'k',
    });
    await openFirstCard(container);
    await player.ready();
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.fake-player-ui').length]).toEqual([0, 1]);
  });

  it('REC-01: the recorder creates no iframe of its own: the Express Recorder script builds its UI in our container', async () => {
    const { container } = await mount(RecorderCore, { partnerId: 1, uiconfId: 2, ks: 'k' });
    expect(container.querySelectorAll('iframe').length).toBe(0);
  });
});
