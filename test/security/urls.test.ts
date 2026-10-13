// Covers: SEC-07 (injection through captions editor, analytics values),
// SEC-11 (path injection through the player ids).
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { CaptionsEditorCore } from '../../src/core/captions-editor';
import { buildAnalyticsUrl, AnalyticsCore } from '../../src/core/analytics';
import { PlayerCore } from '../../src/core/player';
import { setKsProvider } from '../../src/core/ks';
import { mount } from '../helpers/render';
import { playerRemote, scriptUrl } from '../helpers/player-remote';
import { captionsRemote, EDITOR_URL } from '../helpers/captions-remote';

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

const INJECT = 'a&serviceurl=https://evil.example&x=1#frag';
const BAD_IDS = [
  '1/../2', '1_a/../../x', '1_a?x=1', '1_a#x', '1_a b', '1_a%2e%2e', '1_a\n', '..', '', '1_a∕b',
  1, null, undefined, {}, ['1_abc'],
];
const BAD_INTS = [
  '1/../2', '123?x=1', '123#x', '123&serviceurl=https://evil.example', '12 3', '0x10', '1e3',
  0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, {}, [1],
];

describe('SEC-07: captions editor request and data attributes', () => {
  const base = { partnerId: 123, ks: 'ks1', entryId: '1_abc123' };
  const dataOf = (iframe: Element) =>
    Object.fromEntries([...iframe.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name.slice(5), a.value]));
  const mountEditor = async (props: Record<string, unknown>) => {
    const view = await mount(CaptionsEditorCore, props);
    await captions.ready();
    return view;
  };
  const mountBad = async (props: Record<string, unknown>) => (await mount(CaptionsEditorCore, props)).container;

  it('SEC-07: valid input keeps every parameter and origin in the data attributes', async () => {
    const { container } = await mountEditor({ ...base, uiconfId: 55 });
    expect(dataOf(container.querySelector('iframe')!)).toEqual({
      pid: '123',
      ks: 'ks1',
      entryid: '1_abc123',
      cdnurl: 'https://cdnapisec.kaltura.com',
      serviceurl: 'https://www.kaltura.com',
      uiconfid: '55',
    });
  });

  it('SEC-07: omits uiconfid when not given', async () => {
    const { container } = await mountEditor(base);
    expect(container.querySelector('iframe')!.hasAttribute('data-uiconfid')).toBe(false);
  });

  it('SEC-07: the page is fetched from the fixed URL, with no query string and no credentials', async () => {
    await mountEditor({ ...base, uiconfId: 55 });
    expect(captions.fetches).toEqual([{ url: EDITOR_URL, init: { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' } }]);
  });

  it('SEC-07: the iframe src is the blob URL, with no KS in it', async () => {
    const { container } = await mountEditor(base);
    expect(container.querySelector('iframe')!.getAttribute('src')).toBe(captions.blobs[0]);
  });

  it('SEC-07: a hostile ks stays inside one data attribute and reaches no URL', async () => {
    const { container } = await mountEditor({ ...base, ks: INJECT });
    const iframe = container.querySelector('iframe')!;
    expect([iframe.getAttribute('data-ks'), iframe.getAttribute('src'), captions.fetches.map(f => f.url)]).toEqual([INJECT, captions.blobs[0], [EDITOR_URL]]);
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-07: rejects partnerId %j', async v => {
    const container = await mountBad({ ...base, partnerId: v });
    expect([container.querySelector('iframe'), captions.fetches]).toEqual([null, []]);
  });

  it.each(BAD_INTS.filter(v => v != null).map(v => [v]))('SEC-07: rejects uiconfId %j', async v => {
    const container = await mountBad({ ...base, uiconfId: v });
    expect([container.querySelector('iframe'), captions.fetches]).toEqual([null, []]);
  });

  it.each(BAD_IDS.map(v => [v]))('SEC-07: rejects entryId %j', async v => {
    const container = await mountBad({ ...base, entryId: v });
    expect([container.querySelector('iframe'), captions.fetches]).toEqual([null, []]);
  });

  it('SEC-07: component shows a plain-text error and no iframe for bad input', async () => {
    const container = await mountBad({ partnerId: '123&serviceurl=https://evil.example', ks: 'k', entryId: '1_abc' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-07: component mounts the iframe for valid input', async () => {
    const { container } = await mountEditor({ partnerId: 123, ks: 'k', entryId: '1_abc' });
    expect(container.querySelector('iframe')).not.toBeNull();
  });
});

describe('SEC-07: analytics iframe URL and messages', () => {
  const mountAnalytics = (props: Record<string, unknown>) => {
    setKsProvider(() => 'ks1');
    return mount(AnalyticsCore, props);
  };

  it('SEC-07: the URL is fixed: no query string, no fragment', () => {
    const u = new URL(buildAnalyticsUrl());
    expect([`${u.origin}${u.pathname}`, u.search, u.hash]).toEqual(['https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html', '', '']);
  });

  it.each(['entryId', 'reportType', 'fromDate', 'toDate'])('SEC-07: a hostile %s cannot reach the iframe URL', async key => {
    const { container } = await mountAnalytics({ partnerId: 123, fromDate: '2026-01-01', toDate: '2026-02-01', [key]: INJECT });
    expect([container.querySelector('iframe'), container.textContent]).toEqual([null, `Failed to load analytics: Invalid ${key}`]);
  });

  it.each(BAD_INTS.filter(v => v !== undefined).map(v => [v]))('SEC-07: rejects partnerId %j', async v => {
    const { container } = await mountAnalytics({ partnerId: v });
    expect([container.querySelector('iframe'), container.textContent]).toEqual([null, 'Failed to load analytics: Invalid partnerId']);
  });

  it.each(BAD_IDS.filter(v => v !== '' && v != null).map(v => [v]))('SEC-07: rejects entryId %j', async v => {
    const { container } = await mountAnalytics({ partnerId: 123, entryId: v });
    expect([container.querySelector('iframe'), container.textContent]).toEqual([null, 'Failed to load analytics: Invalid entryId']);
  });

  it('SEC-07: component shows a plain-text error and no iframe for bad input', async () => {
    const { container } = await mountAnalytics({ partnerId: '1&ks=x' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-07: component mounts the iframe for valid input', async () => {
    const { container } = await mountAnalytics({ partnerId: 123 });
    expect(container.querySelector('iframe')).not.toBeNull();
  });
});

describe('SEC-11: player ids', () => {
  const base = { partnerId: 123, uiconfId: 456, entryId: '1_abc123' };
  const mountBad = async (props: Record<string, unknown>) => {
    const { container } = await mount(PlayerCore, props);
    return [container.querySelector('iframe'), player.urls, player.created];
  };

  it('SEC-11: valid input loads the bundle of that partner and uiconf and plays that entry', async () => {
    await mount(PlayerCore, base);
    await player.ready();
    expect([player.urls, player.created[0].loads.map(load => load.info)]).toEqual([[scriptUrl(123, 456)], [{ entryId: '1_abc123' }]]);
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-11: rejects partnerId %j', async v => {
    expect(await mountBad({ ...base, partnerId: v })).toEqual([null, [], []]);
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-11: rejects uiconfId %j', async v => {
    expect(await mountBad({ ...base, uiconfId: v })).toEqual([null, [], []]);
  });

  it.each(BAD_IDS.map(v => [v]))('SEC-11: rejects entryId %j', async v => {
    expect(await mountBad({ ...base, entryId: v })).toEqual([null, [], []]);
  });

  it('SEC-11: component shows a plain-text error and no iframe for a path-traversal id', async () => {
    const { container } = await mount(PlayerCore, { ...base, partnerId: '1/../../x' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-11: component mounts the player container for valid input', async () => {
    const { container } = await mount(PlayerCore, base);
    expect(container.querySelector('[role="region"]')).not.toBeNull();
  });
});
