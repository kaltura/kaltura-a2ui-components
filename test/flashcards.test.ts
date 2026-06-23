import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildClipUrl, buildAllCards, buildThumbnailUrl } from '../src/core/flashcards';

// ── buildClipUrl ─────────────────────────────────────────────────────────────

describe('buildClipUrl', () => {
  const clip = { entryId: '1_abc123', startTime: 10.7, endTime: 45.2 };

  it('returns empty string when partnerId is missing', () => {
    expect(buildClipUrl(clip, undefined, 12345)).toBe('');
  });

  it('returns empty string when uiconfId is missing', () => {
    expect(buildClipUrl(clip, 99999, undefined)).toBe('');
  });

  it('returns empty string when both are missing', () => {
    expect(buildClipUrl(clip)).toBe('');
  });

  it('builds a valid URL with entry_id and rounded seek params', () => {
    const url = buildClipUrl(clip, 99999, 12345);
    expect(url).toContain('entry_id=1_abc123');
    expect(url).toContain('kalturaSeekFrom=11');   // Math.round(10.7)
    expect(url).toContain('kalturaClipTo=45');      // Math.round(45.2)
    expect(url).toContain('/p/99999/embedPlaykitJs/partner_id/99999/uiconf_id/12345');
    expect(url).toContain('iframeembed=true');
  });

  it('appends ks when provided', () => {
    const url = buildClipUrl(clip, 99999, 12345, 'mysessiontoken');
    expect(url).toContain('ks=mysessiontoken');
  });

  it('omits ks param when ks is not provided', () => {
    const url = buildClipUrl(clip, 99999, 12345);
    expect(url).not.toContain('ks=');
  });

  it('rounds startTime and endTime correctly for integer values', () => {
    const intClip = { entryId: '1_xyz', startTime: 30, endTime: 60 };
    const url = buildClipUrl(intClip, 1, 2);
    expect(url).toContain('kalturaSeekFrom=30');
    expect(url).toContain('kalturaClipTo=60');
  });
});

// ── buildThumbnailUrl ─────────────────────────────────────────────────────────

describe('buildThumbnailUrl', () => {
  const clip = { entryId: '1_abc123', startTime: 10.7, endTime: 45.2 };

  it('returns empty string when partnerId is missing', () => {
    expect(buildThumbnailUrl(clip, undefined)).toBe('');
  });

  it('returns clip.thumbnail when set (overrides CDN)', () => {
    const clipWithThumb = { ...clip, thumbnail: 'https://example.com/thumb.jpg' };
    expect(buildThumbnailUrl(clipWithThumb, 99999)).toBe('https://example.com/thumb.jpg');
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

  it('prepends a cover card — total count is cards.length + 1', () => {
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

    // The cover card title should appear
    expect(container.textContent).toContain('Test Deck');
    // Counter starts at "1 / 3" (cover + 2 cards)
    expect(container.textContent).toContain('1 / 3');
  });
});
