// Covers: SEC-04 / QA-12 (raw content rendered before sanitising, on reject,
// no .catch), SEC-11 (path injection in URL builders), SEC-12 (clip.thumbnail
// loaded as any URL).
// Turns green: plan item 1.3 (flashcards). The control test is green today.
// Technique: vi.mock('@a2ui/markdown-it') with a deferred promise, so we can
// inspect the DOM at the "first render" moment.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { mount, findUnsafe } from '../helpers/render';

const md = vi.hoisted(() => ({
  resolve: (_v: string) => {},
  impl: null as null | ((s: string) => Promise<string>),
}));

vi.mock('@a2ui/markdown-it', async importOriginal => {
  const real = await importOriginal<typeof import('@a2ui/markdown-it')>();
  return { ...real, renderMarkdown: (s: string) => (md.impl ? md.impl(s) : real.renderMarkdown(s)) };
});

afterEach(() => {
  document.body.innerHTML = '';
  md.impl = null;
});

// scope to card content so the component's own nav <svg>s are not flagged
const contentOf = (c: Element) => {
  const wrap = document.createElement('div');
  c.querySelectorAll('.flashcard-content').forEach(n => wrap.appendChild(n.cloneNode(true)));
  return wrap;
};

const PAYLOADS: Record<string, string> = {
  'img onerror': 'hello <img src=x onerror="window.__pwned=1">',
  'script tag': 'hello <script>window.__pwned=1</script>',
  'javascript: link (html)': '<a href="javascript:window.__pwned=1">click</a>',
  'svg onload': '<svg onload="window.__pwned=1"></svg>',
  'iframe srcdoc': '<iframe srcdoc="<script>parent.__pwned=1</script>"></iframe>',
};

async function render(content: string) {
  const { FlashcardsCore } = await import('../../src/core/flashcards');
  return mount(FlashcardsCore, {
    title: 'Deck',
    summary: content, // cover card (visible on first render)
    cards: [{ title: 'C1', content }],
  });
}

describe('SEC-04: FlashcardsCore: first render, renderMarkdown still pending', () => {
  it.each(Object.entries(PAYLOADS))('SEC-04: %s: nothing unsafe in DOM', async (_n, payload) => {
    md.impl = () => new Promise<string>(() => {}); // never resolves
    const { container } = await render(payload);
    expect(findUnsafe(contentOf(container))).toEqual([]);
  });
});

describe('SEC-04: FlashcardsCore: renderMarkdown rejects', () => {
  it.each(Object.entries(PAYLOADS))('SEC-04: %s: nothing unsafe in DOM', async (_n, payload) => {
    const rejections: unknown[] = [];
    const onRej = (r: unknown) => rejections.push(r);
    process.on('unhandledRejection', onRej);
    md.impl = () => Promise.reject(new Error('markdown failed'));
    const { container } = await render(payload);
    await new Promise(r => setTimeout(r, 20));
    process.off('unhandledRejection', onRej);
    expect(findUnsafe(contentOf(container))).toEqual([]);
  });

  it('SEC-04: rejection is handled (no unhandledRejection)', async () => {
    const rejections: unknown[] = [];
    const onRej = (r: unknown) => rejections.push(r);
    process.on('unhandledRejection', onRej);
    md.impl = () => Promise.reject(new Error('markdown failed'));
    await render('plain text');
    await new Promise(r => setTimeout(r, 50));
    process.off('unhandledRejection', onRej);
    expect(rejections).toEqual([]);
  });
});

describe('SEC-04: FlashcardsCore: control (real renderMarkdown, after it resolves)', () => {
  it('SEC-04: sanitized output has nothing unsafe (control, must stay green)', async () => {
    md.impl = null;
    const { container } = await render(PAYLOADS['img onerror']);
    await new Promise(r => setTimeout(r, 100));
    expect(findUnsafe(contentOf(container))).toEqual([]);
  });
});

describe('SEC-11 / SEC-12: flashcards URL builders with untrusted input', () => {
  it('SEC-12: buildThumbnailUrl rejects non-https clip.thumbnail (javascript:/data:)', async () => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    for (const t of ['javascript:window.__pwned=1', 'data:text/html,<script>1</script>', 'http://evil.example/x.gif']) {
      expect(buildThumbnailUrl({ entryId: '0_a', startTime: 0, endTime: 1, thumbnail: t }, 1)).not.toBe(t);
    }
  });
  it('SEC-11: buildThumbnailUrl does not let entryId add path segments', async () => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    const u = buildThumbnailUrl({ entryId: '../../../evil', startTime: 0, endTime: 1 }, 1);
    expect(u).not.toContain('../');
  });
  it('SEC-11: buildClipUrl rejects non-numeric partnerId/uiconfId (WC path has no schema validation)', async () => {
    const { buildClipUrl } = await import('../../src/core/flashcards');
    const clip = { entryId: '0_a', startTime: 0, endTime: 1 };
    expect(buildClipUrl(clip, '1/../../x' as unknown as number, 2)).toBe('');
    expect(buildClipUrl(clip, 1, '2/../../x' as unknown as number)).toBe('');
  });
});

describe('SEC-04: FlashcardsCore: empty or failed render', () => {
  it('SEC-04: sanitised result is empty: raw text is not used as HTML', async () => {
    md.impl = () => Promise.resolve('');
    const { container } = await render(PAYLOADS['img onerror']);
    expect(findUnsafe(contentOf(container))).toEqual([]);
  });
  it('SEC-04: rejection shows the text as plain text', async () => {
    md.impl = () => Promise.reject(new Error('markdown failed'));
    const { container } = await render('<b>hi</b>');
    expect(contentOf(container).textContent).toContain('<b>hi</b>');
  });
  it('SEC-04: renderMarkdown output with a foreign image is cleaned before it reaches the DOM', async () => {
    md.impl = () => Promise.resolve('<p><img src="https://evil.example/a?k=1" alt=""></p>');
    const { container } = await render('x');
    expect(container.querySelector('img[src*="evil"]')).toBeNull();
  });
});

describe('SEC-11: flashcards URL builders: valid and invalid ids', () => {
  const clip = { entryId: '1_abc', startTime: 0, endTime: 1 };
  it.each(['a/b', '../x', '1_a?x=1', '1_a#', '', 'a b', '1_a\n'])('SEC-11: buildClipUrl rejects entryId %j', async id => {
    const { buildClipUrl } = await import('../../src/core/flashcards');
    expect(buildClipUrl({ ...clip, entryId: id }, 1, 2)).toBe('');
  });
  it.each([0, -1, 1.5, NaN, Infinity])('SEC-11: buildClipUrl rejects partnerId %s', async n => {
    const { buildClipUrl } = await import('../../src/core/flashcards');
    expect(buildClipUrl(clip, n, 2)).toBe('');
  });
  it('SEC-11: buildThumbnailUrl rejects a bad partnerId and a bad entryId', async () => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    expect([
      buildThumbnailUrl(clip, '1/../x' as unknown as number),
      buildThumbnailUrl({ ...clip, entryId: 'a/b' }, 1),
    ]).toEqual(['', '']);
  });
  it('SEC-11: valid ids still build a clip URL', async () => {
    const { buildClipUrl } = await import('../../src/core/flashcards');
    expect(buildClipUrl(clip, 1, 2)).toContain('/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2?');
  });
  it('SEC-11: card with an invalid partnerId shows a plain error and no iframe', async () => {
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container } = await mount(FlashcardsCore, {
      title: 'Deck',
      cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '1_abc', startTime: 0, endTime: 1 }] }],
      partnerId: '1/../x',
      uiconfId: 2,
    });
    const start = container.querySelector<HTMLButtonElement>('.flashcard-action-btn');
    await act(async () => start?.click());
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.flashcard-clip-error').length]).toEqual([0, 1]);
  });
});

describe('SEC-12: clip.thumbnail only on Kaltura CDN hosts', () => {
  const base = { entryId: '0_a', startTime: 0, endTime: 1 };
  const cdn = 'https://cfvod.kaltura.com/p/1/thumbnail/entry_id/0_a/width/200/vid_sec/1';
  it.each([
    'https://evil.example/x.gif',
    'https://kaltura.com.evil.example/x.gif',
    'https://evilkaltura.com/x.gif',
    'https://cfvod.kaltura.com@evil.example/x.gif',
    'https://user:pw@cfvod.kaltura.com/x.gif',
    'https://cfvod.kaltura.com:8443/x.gif',
    'https://cfvod.kaltura.com./x.gif',
    '//cfvod.kaltura.com/x.gif',
    'http://cfvod.kaltura.com/x.gif',
    'HTTP://cfvod.kaltura.com/x.gif',
    ' javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    'blob:https://cfvod.kaltura.com/x',
  ])('SEC-12: %j falls back to the CDN URL', async t => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    expect(buildThumbnailUrl({ ...base, thumbnail: t }, 1)).toBe(cdn);
  });
  it.each([
    'https://cfvod.kaltura.com/x.jpg',
    'https://CDNAPISEC.Kaltura.com/x.jpg',
    'https://a.b.kaltura.com/x.jpg?w=1',
    // the URL parser turns the backslash into a slash: the host is still Kaltura
    'https://cfvod.kaltura.com\\@evil.example/x.gif',
  ])('SEC-12: %j is accepted', async t => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    expect(buildThumbnailUrl({ ...base, thumbnail: t }, 1)).toMatch(/^https:\/\/[a-z.]+\.kaltura\.com\//);
  });
});
