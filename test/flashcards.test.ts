import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { buildAllCards, buildThumbnailUrl } from '../src/core/flashcards';
import { mount } from './helpers/render';
import { playerRemote, loadPlayer, scriptUrl } from './helpers/player-remote';

// ── Clip player ──────────────────────────────────────────────────────────────

describe('FlashcardsCore clip player', () => {
  const clip = { entryId: '1_abc123', startTime: 10.7, endTime: 45.2, title: 'Intro' };
  let remote: ReturnType<typeof playerRemote>;

  beforeEach(() => {
    remote = playerRemote();
  });

  afterEach(() => {
    remote.restore();
    document.body.innerHTML = '';
  });

  async function openClip(props: Record<string, unknown>) {
    const { FlashcardsCore } = await loadPlayer();
    const { container } = await mount(FlashcardsCore, { title: 'Deck', cards: [{ title: 'C', content: 'x', clips: [clip] }], ...props });
    await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')!.click());
    return container;
  }

  it('shows no player when partnerId is missing', async () => {
    await openClip({ uiconfId: 12345 });
    expect(remote.created).toEqual([]);
  });

  it('shows no player when uiconfId is missing', async () => {
    await openClip({ partnerId: 99999 });
    expect(remote.created).toEqual([]);
  });

  it('loads the bundle of the partner and uiconf', async () => {
    await openClip({ partnerId: 99999, uiconfId: 12345 });
    await remote.ready();
    expect(remote.urls).toEqual([scriptUrl(99999, 12345)]);
  });

  it('loads the entry with rounded seek and clip end', async () => {
    await openClip({ partnerId: 99999, uiconfId: 12345 });
    await remote.ready();
    expect(remote.created[0].loads).toEqual([{ info: { entryId: '1_abc123' }, options: { seekFrom: 11, clipTo: 45 } }]);
  });

  it('rounds whole-second times as they are', async () => {
    await openClip({ partnerId: 1, uiconfId: 2, cards: [{ title: 'C', content: 'x', clips: [{ entryId: '1_xyz', startTime: 30, endTime: 60 }] }] });
    await remote.ready();
    expect(remote.created[0].loads[0].options).toEqual({ seekFrom: 30, clipTo: 60 });
  });

  it('gives the KS to the player setup, not to a URL', async () => {
    await openClip({ partnerId: 99999, uiconfId: 12345, ks: 'mysessiontoken' });
    await remote.ready();
    expect([remote.created[0].config.provider.ks, remote.urls.some(url => url.includes('mysessiontoken'))]).toEqual(['mysessiontoken', false]);
  });

  it('sets up the player without a ks key when there is no KS', async () => {
    await openClip({ partnerId: 99999, uiconfId: 12345 });
    await remote.ready();
    expect('ks' in remote.created[0].config.provider).toBe(false);
  });
});

// ── buildThumbnailUrl ─────────────────────────────────────────────────────────

describe('buildThumbnailUrl', () => {
  const clip = { entryId: '1_abc123', startTime: 10.7, endTime: 45.2 };

  it('returns empty string when partnerId is missing', () => {
    expect(buildThumbnailUrl(clip, undefined)).toBe('');
  });

  it('returns clip.thumbnail when set on a Kaltura CDN host (overrides CDN)', () => {
    const clipWithThumb = { ...clip, thumbnail: 'https://cdn.kaltura.com/thumb.jpg' };
    expect(buildThumbnailUrl(clipWithThumb, 99999)).toBe('https://cdn.kaltura.com/thumb.jpg');
  });

  it('builds CDN thumbnail URL at startTime+1', () => {
    const url = buildThumbnailUrl(clip, 99999);
    expect(url).toContain('/p/99999/thumbnail/entry_id/1_abc123/width/200/vid_sec/12');
  });

  it('uses vid_sec=1 when startTime=0', () => {
    const url = buildThumbnailUrl({ ...clip, startTime: 0 }, 99999);
    expect(url).toContain('vid_sec/1');
  });
});

// ── buildAllCards ─────────────────────────────────────────────────────────────

describe('buildAllCards', () => {
  const cards = [
    { title: 'Card One', content: 'Content one' },
    { title: 'Card Two', content: 'Content two' },
  ];

  it('prepends a cover card: total count is cards.length + 1', () => {
    const all = buildAllCards('My Deck', 'Summary text', cards);
    expect(all).toHaveLength(3);
  });

  it('first item is the cover card with isCover=true', () => {
    const all = buildAllCards('My Deck', 'Summary text', cards);
    expect(all[0].isCover).toBe(true);
    expect(all[0].title).toBe('My Deck');
    expect(all[0].subtitle).toBe('Introduction');
    expect(all[0].content).toBe('Summary text');
  });

  it('cover card content is empty string when summary is undefined', () => {
    const all = buildAllCards('My Deck', undefined, cards);
    expect(all[0].content).toBe('');
  });

  it('remaining cards have isCover=false and preserve original data', () => {
    const all = buildAllCards('My Deck', 'Summary', cards);
    expect(all[1].isCover).toBe(false);
    expect(all[1].title).toBe('Card One');
    expect(all[2].isCover).toBe(false);
    expect(all[2].title).toBe('Card Two');
  });

  it('counter string "1 / 3" is consistent with buildAllCards length for 2 cards', () => {
    const all = buildAllCards('Deck', 'Summary', cards);
    // When currentIndex=0, counter shows "1 / <total>"
    const total = all.length;
    expect(`1 / ${total}`).toBe('1 / 3');
  });
});

// ── React render smoke test (jsdom) ──────────────────────────────────────────

describe('FlashcardsCore render', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders the cover card and counter "1 / 3" with 2 content cards', async () => {
    // Dynamic imports to avoid hoisting issues with jsdom + React
    const { createElement, act } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { FlashcardsCore } = await import('../src/core/flashcards');

    const cards = [
      { title: 'Card One', content: 'Content one' },
      { title: 'Card Two', content: 'Content two' },
    ];

    await act(async () => {
      const root = createRoot(container);
      root.render(
        createElement(FlashcardsCore, {
          title: 'Test Deck',
          summary: 'A test summary',
          cards,
        }),
      );
    });

    // The cover card title appears
    expect(container.textContent).toContain('Test Deck');
    // Counter starts at "1 / 3" (cover + 2 cards)
    expect(container.textContent).toContain('1 / 3');
  });
});
