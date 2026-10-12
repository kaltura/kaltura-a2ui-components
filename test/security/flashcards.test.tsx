// Covers: SEC-04 / QA-12 (raw content rendered before sanitising, on reject,
// no .catch), SEC-11 (path injection in URL builders), SEC-12 (clip.thumbnail
// loaded as any URL).
// Turns green: plan item 1.3 (flashcards). The control test is green today.
// Technique: vi.mock('@a2ui/markdown-it') with a deferred promise, so we can
// inspect the DOM at the "first render" moment.
import { describe, it, expect, vi, afterEach } from 'vitest';
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
