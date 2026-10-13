// Covers: SEC-04 / QA-12 (raw content rendered before sanitising, on reject,
// no .catch), SEC-11 (bad ids never reach the clip player or the thumbnail URL),
// SEC-12 (clip.thumbnail loaded as any URL).
// Turns green: plan item 1.3 (flashcards). The control test is green today.
// Technique: vi.mock('@a2ui/markdown-it') with a deferred promise, so we can
// inspect the DOM at the "first render" moment.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { mount, findUnsafe } from '../helpers/render';
import { playerRemote, scriptUrl } from '../helpers/player-remote';

const md = vi.hoisted(() => ({
  resolve: (_v: string) => {},
  impl: null as null | ((s: string) => Promise<string>),
}));

vi.mock('@a2ui/markdown-it', async importOriginal => {
  const real = await importOriginal<typeof import('@a2ui/markdown-it')>();
  return { ...real, renderMarkdown: (s: string) => (md.impl ? md.impl(s) : real.renderMarkdown(s)) };
});

let player: ReturnType<typeof playerRemote>;

beforeEach(() => {
  player = playerRemote();
});

afterEach(() => {
  player.restore();
  document.body.innerHTML = '';
  md.impl = null;
});

// Opens the first clip of a one-card deck. A clip that fails the checks never reaches the player bundle.
async function openClip(props: Record<string, unknown>, clip: Record<string, unknown> = { entryId: '1_abc', startTime: 0, endTime: 1 }) {
  const { FlashcardsCore } = await import('../../src/core/flashcards');
  const { container } = await mount(FlashcardsCore, { title: 'Deck', cards: [{ title: 'C1', content: 'x', clips: [clip] }], ...props });
  await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')?.click());
  return container;
}
const clipAlert = (container: Element) => container.querySelector('[role="alert"]')?.textContent;

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

describe('SEC-11 / SEC-12: flashcards with untrusted input', () => {
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
  it.each([
    ['partnerId', { partnerId: '1/../../x', uiconfId: 2 }],
    ['uiconfId', { partnerId: 1, uiconfId: '2/../../x' }],
  ])('SEC-11: a clip with a non-numeric %s loads no script (WC path has no schema validation)', async (_name, ids) => {
    const container = await openClip(ids);
    expect([clipAlert(container), player.urls, player.created.length]).toEqual(['This clip cannot be shown.', [], 0]);
  });
});

describe('SEC-04: FlashcardsCore: empty or failed render', () => {
  it('SEC-04: sanitised result is empty: raw text is not used as HTML', async () => {
    md.impl = () => Promise.resolve('');
    const { container } = await render(PAYLOADS['img onerror']);
    expect(findUnsafe(contentOf(container))).toEqual([]);
  });
  it('SEC-04: sanitised result is empty: the text stays as plain text', async () => {
    md.impl = () => Promise.resolve('');
    const { container } = await render('<b>hi</b>');
    const content = container.querySelector('.flashcard-content')!;
    expect([content.children.length, content.textContent]).toEqual([0, '<b>hi</b>']);
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

describe('SEC-11: flashcards clips and thumbnails: valid and invalid ids', () => {
  const clip = { entryId: '1_abc', startTime: 0, endTime: 1 };
  it.each(['a/b', '../x', '1_a?x=1', '1_a#', '', 'a b', '1_a\n'])('SEC-11: a clip with entryId %j loads no script', async id => {
    const container = await openClip({ partnerId: 1, uiconfId: 2 }, { ...clip, entryId: id });
    expect([clipAlert(container), player.urls, player.created.length]).toEqual(['This clip cannot be shown.', [], 0]);
  });
  it.each([0, -1, 1.5, NaN, Infinity])('SEC-11: a clip with partnerId %s loads no script', async n => {
    const container = await openClip({ partnerId: n, uiconfId: 2 });
    expect([clipAlert(container), player.urls, player.created.length]).toEqual(['This clip cannot be shown.', [], 0]);
  });
  it('SEC-11: buildThumbnailUrl rejects a bad partnerId and a bad entryId', async () => {
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    expect([
      buildThumbnailUrl(clip, '1/../x' as unknown as number),
      buildThumbnailUrl({ ...clip, entryId: 'a/b' }, 1),
    ]).toEqual(['', '']);
  });
  it('SEC-11: valid ids still load the bundle of that partner and uiconf', async () => {
    await openClip({ partnerId: 1, uiconfId: 2 });
    await player.ready();
    expect(player.urls).toEqual([scriptUrl(1, 2)]);
  });
  it('SEC-11: card with an invalid partnerId shows a plain error and no iframe', async () => {
    const container = await openClip({ partnerId: '1/../x', uiconfId: 2 });
    expect([container.querySelectorAll('iframe').length, clipAlert(container)]).toEqual([0, 'This clip cannot be shown.']);
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

describe('SEC-04: FlashcardsCore: plain text while markdown renders, then sanitised HTML', () => {
  const sizes = { scroll: 200, client: 100 };
  const proto = HTMLElement.prototype;
  const realScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!;
  const realClient = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!;
  const first = (c: Element) => c.querySelector<HTMLElement>('.flashcard-content')!;

  const pending = () => {
    const resolvers: Array<(html: string) => void> = [];
    md.impl = () => new Promise<string>(resolve => resolvers.push(resolve));
    return (html: string) => act(async () => resolvers.forEach(resolve => resolve(html)));
  };

  afterEach(() => {
    Object.defineProperty(proto, 'scrollHeight', realScroll);
    Object.defineProperty(proto, 'clientHeight', realClient);
  });

  const fakeSizes = () => {
    Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => sizes.scroll });
    Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => sizes.client });
  };

  it('SEC-04: the first render shows the content as one plain text node', async () => {
    pending();
    const { container } = await render('**bold** text');
    const content = first(container);
    expect([content.children.length, content.textContent]).toEqual([0, '**bold** text']);
  });

  it('SEC-04: the text is swapped for sanitised HTML when markdown is ready', async () => {
    const finish = pending();
    const { container } = await render('**bold** text');
    await finish('<p><strong>bold</strong> text</p><script>window.__pwned=1</script>');
    expect(first(container).innerHTML).toBe('<p><strong>bold</strong> text</p>');
  });

  it('SEC-04: the fade mask is set in both states and follows the size of each', async () => {
    fakeSizes();
    sizes.scroll = 200;
    const finish = pending();
    const { container } = await render('long text');
    const before = first(container).style.maskImage;
    sizes.scroll = 50;
    await finish('<p>short</p>');
    const after = first(container).style.maskImage;
    expect([before.includes('linear-gradient'), after]).toEqual([true, '']);
  });

  it('SEC-04: new content while markdown is still pending recomputes the fade mask', async () => {
    fakeSizes();
    sizes.scroll = 50;
    md.impl = () => new Promise<string>(() => {});
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container, root } = await mount(FlashcardsCore, { title: 'Deck', summary: 'short', cards: [] });
    sizes.scroll = 200;
    await act(async () => root.render(createElement(FlashcardsCore, { title: 'Deck', summary: 'long text', cards: [] })));
    expect(first(container).style.maskImage).toContain('linear-gradient');
  });

  it('SEC-04: new content shows as plain text again, never the old HTML', async () => {
    const finish = pending();
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container, root } = await mount(FlashcardsCore, { title: 'Deck', summary: 'one', cards: [] });
    await finish('<p>ONE</p>');
    md.impl = () => new Promise<string>(() => {});
    await act(async () => root.render(createElement(FlashcardsCore, { title: 'Deck', summary: 'two', cards: [] })));
    const content = first(container);
    expect([content.children.length, content.textContent]).toEqual([0, 'two']);
  });
});

describe('SEC-11: one bad clip does not fail the deck', () => {
  const clips = [
    { entryId: '../x', startTime: 0, endTime: 1, title: 'bad' },
    { entryId: '1_good', startTime: 0, endTime: 1, title: 'good' },
  ];
  const deck = { title: 'Deck', partnerId: 1, uiconfId: 2, cards: [{ title: 'C', content: 'x', clips }] };

  async function openCard(props: Record<string, unknown>) {
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container } = await mount(FlashcardsCore, props);
    await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')!.click());
    return container;
  }

  it('SEC-11: the deck renders and the bad clip says it cannot be shown', async () => {
    const container = await openCard(deck);
    expect([
      container.querySelector('.flashcard-title')?.textContent,
      container.querySelector('[role="alert"]')?.textContent,
      container.querySelectorAll('iframe').length,
    ]).toEqual(['Deck', 'This clip cannot be shown.', 0]);
  });

  it('SEC-11: the good clip next to it still plays', async () => {
    const container = await openCard(deck);
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="good"]')!.click());
    await player.ready();
    expect([player.created.map(created => created.loads.map(load => load.info)), container.querySelectorAll('[role="alert"]').length]).toEqual([[[{ entryId: '1_good' }]], 0]);
  });

  it.each([7, null, '', 'a b', 'x'.repeat(65)])('SEC-11: clip entryId %j fails that clip only', async entryId => {
    const container = await openCard({ ...deck, cards: [{ title: 'C', content: 'x', clips: [{ ...clips[0], entryId }] }] });
    expect([container.querySelector('.kaltura-load-error')?.textContent, container.querySelectorAll('iframe').length]).toEqual(['This clip cannot be shown.', 0]);
  });
});
