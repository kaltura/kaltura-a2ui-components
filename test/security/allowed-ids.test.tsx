// Covers: F11 (the agent picks partnerId and uiconfId, which decides whose code runs in the host
// origin). setAllowedPartners and setAllowedUiconfs let the host limit both. Default open.
// A refused id shows fixed text, reports `origin-not-allowed` and loads no script, fetch or iframe.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { mount } from '../helpers/render';
import { playerRemote, scriptUrl } from '../helpers/player-remote';
import { recorderRemote } from '../helpers/recorder-remote';
import { captionsRemote } from '../helpers/captions-remote';
import { URL_A, loaderUrl } from '../lifecycle/harness';
import type { KalturaError } from '../../src/core/host-hooks';

const KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const REFUSED = 'Failed to load';

let errors: KalturaError[];

beforeEach(() => {
  vi.resetModules();
  errors = [];
});

afterEach(() => {
  document.querySelectorAll('script').forEach(tag => tag.remove());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Fresh modules, so script caches start empty. The setters come from the same graph as the components. */
async function host() {
  const ids = await import('../../src/core/allowed-ids');
  const hooks = await import('../../src/core/host-hooks');
  const ks = await import('../../src/core/ks');
  hooks.setErrorHandler(error => errors.push(error));
  ks.setKsProvider(() => KS);
  return ids;
}

describe('F11: how a rule matches', () => {
  const idsOf = async () => (await import('../../src/core/allowed-ids')).refusedIdProp;
  const setters = async () => import('../../src/core/allowed-ids');
  const partner = async (id: number) => (await idsOf())({ partnerId: id });

  it('F11: with no rule every id is allowed', async () => {
    expect(await partner(123)).toBeUndefined();
  });

  it('F11: a list allows the numbers and strings in it and refuses the rest', async () => {
    (await setters()).setAllowedPartners([123, '456']);
    expect([await partner(123), await partner(456), await partner(789)]).toEqual([undefined, undefined, 'partnerId']);
  });

  it('F11: a number or string must equal the id, not contain it', async () => {
    (await setters()).setAllowedPartners([12, '3']);
    expect([await partner(123), await partner(12)]).toEqual(['partnerId', undefined]);
  });

  it('F11: "*" allows every id again', async () => {
    const { setAllowedPartners } = await setters();
    setAllowedPartners([1]);
    setAllowedPartners('*');
    expect(await partner(123)).toBeUndefined();
  });

  it('F11: undefined resets the rule', async () => {
    const { setAllowedPartners } = await setters();
    setAllowedPartners([1]);
    setAllowedPartners(undefined);
    expect(await partner(123)).toBeUndefined();
  });

  it('F11: a RegExp is tested against the id as text', async () => {
    (await setters()).setAllowedPartners(/^(123|456)$/);
    expect([await partner(123), await partner(456), await partner(1234)]).toEqual([undefined, undefined, 'partnerId']);
  });

  it('F11: an unanchored RegExp also matches ids that only contain the text', async () => {
    (await setters()).setAllowedPartners(/123/);
    expect([await partner(123), await partner(91234), await partner(124)]).toEqual([undefined, undefined, 'partnerId']);
  });

  it('F11: a list can mix ids and RegExps', async () => {
    (await setters()).setAllowedPartners([7, /^20\d\d$/]);
    expect([await partner(7), await partner(2024), await partner(8)]).toEqual([undefined, undefined, 'partnerId']);
  });

  it('F11: a /g RegExp gives the same answer on every call', async () => {
    const rule = /^123$/g;
    (await setters()).setAllowedPartners(rule);
    expect([await partner(123), await partner(123), await partner(123)]).toEqual([undefined, undefined, undefined]);
  });

  it('F11: a /g RegExp keeps its lastIndex', async () => {
    const rule = /^123$/g;
    (await setters()).setAllowedPartners(rule);
    await partner(123);
    expect(rule.lastIndex).toBe(0);
  });

  it('F11: a /y RegExp gives the same answer on every call', async () => {
    (await setters()).setAllowedPartners(/123/y);
    expect([await partner(123), await partner(123), await partner(5123)]).toEqual([undefined, undefined, 'partnerId']);
  });

  it('F11: an empty list refuses every id', async () => {
    (await setters()).setAllowedPartners([]);
    expect(await partner(123)).toBe('partnerId');
  });

  it('F11: a later change to the host array does not change the rule', async () => {
    const list = [123];
    (await setters()).setAllowedPartners(list);
    list.push(456);
    expect(await partner(456)).toBe('partnerId');
  });

  it.each([['abc'], [5], [{}], [[{}]], [[null]], [[['x']]]])('F11: refuses the rule %j and keeps the old one', async rule => {
    const { setAllowedPartners } = await setters();
    setAllowedPartners([123]);
    expect(() => setAllowedPartners(rule as never)).toThrow('Allowed ids must be');
    expect(await partner(456)).toBe('partnerId');
  });

  it('F11: the partner rule and the uiconf rule are separate', async () => {
    const { setAllowedUiconfs, refusedIdProp } = await setters();
    setAllowedUiconfs([9]);
    expect([refusedIdProp({ partnerId: 1, uiconfId: 9 }), refusedIdProp({ partnerId: 1, uiconfId: 8 })]).toEqual([undefined, 'uiconfId']);
  });

  it('F11: a prop that is not set is not checked', async () => {
    const { setAllowedPartners, setAllowedUiconfs, refusedIdProp } = await setters();
    setAllowedPartners([1]);
    setAllowedUiconfs([1]);
    expect(refusedIdProp({ partnerId: undefined, uiconfId: null })).toBeUndefined();
  });
});

describe('F11: Player', () => {
  let remote: ReturnType<typeof playerRemote>;
  beforeEach(() => {
    remote = playerRemote();
  });
  afterEach(() => remote.restore());

  const props = { partnerId: 123, uiconfId: 456, entryId: '0_abc12345' };
  const mountPlayer = async (extra: Record<string, unknown> = {}) => {
    const { PlayerCore } = await import('../../src/core/player');
    return mount(PlayerCore, { ...props, ...extra });
  };

  it('F11: default open: the script loads', async () => {
    await host();
    await mountPlayer();
    await remote.ready();
    expect(remote.urls).toEqual([scriptUrl(123, 456)]);
  });

  it('F11: a refused partner loads no script', async () => {
    (await host()).setAllowedPartners([1]);
    await mountPlayer();
    expect([remote.urls, remote.created]).toEqual([[], []]);
  });

  it('F11: a refused uiconf loads no script', async () => {
    (await host()).setAllowedUiconfs([1]);
    await mountPlayer();
    expect([remote.urls, remote.created]).toEqual([[], []]);
  });

  it('F11: a refused id shows fixed text without the id', async () => {
    (await host()).setAllowedPartners([1]);
    const { container } = await mountPlayer();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Failed to load player: partnerId is not allowed');
  });

  it('F11: a refused id reports origin-not-allowed with the widget', async () => {
    (await host()).setAllowedUiconfs([1]);
    await mountPlayer();
    expect(errors).toEqual([{ code: 'origin-not-allowed', widget: 'player', message: 'Failed to load player: uiconfId is not allowed' }]);
  });

  it('F11: an allowed pair loads the script', async () => {
    const { setAllowedPartners, setAllowedUiconfs } = await host();
    setAllowedPartners(/^12\d$/);
    setAllowedUiconfs([456]);
    await mountPlayer();
    await remote.ready();
    expect(remote.urls).toEqual([scriptUrl(123, 456)]);
  });

  it('F11: a bad id still gives invalid-props, not origin-not-allowed', async () => {
    (await host()).setAllowedPartners([1]);
    await mountPlayer({ entryId: '<bad>' });
    expect(errors.map(e => e.code)).toEqual(['invalid-props']);
  });
});

describe('F11: Flashcards clips', () => {
  let remote: ReturnType<typeof playerRemote>;
  beforeEach(() => {
    remote = playerRemote();
  });
  afterEach(() => remote.restore());

  const clips = [
    { entryId: '1_abc', startTime: 0, endTime: 1 },
    { entryId: '1_def', startTime: 2, endTime: 3 },
  ];
  const openDeck = async () => {
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container } = await mount(FlashcardsCore, { title: 'Deck', partnerId: 123, uiconfId: 456, cards: [{ title: 'C1', content: 'x', clips }] });
    await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')?.click());
    return container;
  };

  it('F11: default open: the clip loads its script and shows thumbnails', async () => {
    await host();
    const container = await openDeck();
    await remote.ready();
    expect([remote.urls, container.querySelectorAll('img.clip-thumb-img').length]).toEqual([[scriptUrl(123, 456)], 2]);
  });

  it('F11: a refused uiconf loads no script and keeps the deck', async () => {
    (await host()).setAllowedUiconfs([1]);
    const container = await openDeck();
    expect([remote.urls, container.querySelector('.flashcard-carousel') !== null]).toEqual([[], true]);
  });

  it('F11: a refused uiconf reports origin-not-allowed for flashcards', async () => {
    (await host()).setAllowedUiconfs([1]);
    await openDeck();
    expect(errors.map(e => [e.code, e.widget])).toEqual([['origin-not-allowed', 'flashcards']]);
  });

  it('F11: a refused partner requests no thumbnail', async () => {
    (await host()).setAllowedPartners([1]);
    const container = await openDeck();
    expect(container.querySelectorAll('img.clip-thumb-img').length).toBe(0);
  });

  it('F11: a refused partner builds no thumbnail URL', async () => {
    (await host()).setAllowedPartners([1]);
    const { buildThumbnailUrl } = await import('../../src/core/flashcards');
    expect(buildThumbnailUrl(clips[0], 123)).toBe('');
  });
});

describe('F11: Recorder', () => {
  let remote: ReturnType<typeof recorderRemote>;
  beforeEach(() => {
    remote = recorderRemote();
  });
  afterEach(() => remote.restore());

  const mountRecorder = async () => {
    const { RecorderCore } = await import('../../src/core/recorder');
    return mount(RecorderCore, { partnerId: 123, uiconfId: 456 });
  };

  it('F11: default open: the recorder is created', async () => {
    await host();
    await mountRecorder();
    await remote.ready();
    expect(remote.created.length).toBe(1);
  });

  it.each([
    ['partner', (ids: Awaited<ReturnType<typeof host>>) => ids.setAllowedPartners([1]), 'partnerId'],
    ['uiconf', (ids: Awaited<ReturnType<typeof host>>) => ids.setAllowedUiconfs([1]), 'uiconfId'],
  ])('F11: a refused %s loads no script', async (_name, refuse, prop) => {
    refuse(await host());
    const { container } = await mountRecorder();
    expect([remote.tags().length, remote.created.length, container.querySelector('[role="alert"]')?.textContent]).toEqual([
      0,
      0,
      `${REFUSED} recorder: ${prop} is not allowed`,
    ]);
  });

  it('F11: a refused id reports origin-not-allowed', async () => {
    (await host()).setAllowedPartners([1]);
    await mountRecorder();
    expect(errors).toEqual([{ code: 'origin-not-allowed', widget: 'recorder', message: 'Failed to load recorder: partnerId is not allowed' }]);
  });
});

describe('F11: Captions editor', () => {
  let remote: ReturnType<typeof captionsRemote>;
  beforeEach(() => {
    remote = captionsRemote();
  });
  afterEach(() => remote.restore());

  const props = { partnerId: 123, entryId: '0_abc', uiconfId: 456 };
  const mountEditor = async () => {
    const { CaptionsEditorCore } = await import('../../src/core/captions-editor');
    return mount(CaptionsEditorCore, props);
  };

  it('F11: default open: the page is fetched', async () => {
    await host();
    await mountEditor();
    await remote.ready();
    expect(remote.fetches.length).toBe(1);
  });

  it.each([
    ['partner', (ids: Awaited<ReturnType<typeof host>>) => ids.setAllowedPartners([1])],
    ['uiconf', (ids: Awaited<ReturnType<typeof host>>) => ids.setAllowedUiconfs([1])],
  ])('F11: a refused %s fetches nothing and adds no iframe', async (_name, refuse) => {
    refuse(await host());
    const { container } = await mountEditor();
    expect([remote.fetches.length, container.querySelectorAll('iframe').length, errors.map(e => [e.code, e.widget])]).toEqual([
      0,
      0,
      [['origin-not-allowed', 'captions-editor']],
    ]);
  });

  it('F11: an editor without a uiconf is not checked against the uiconf rule', async () => {
    (await host()).setAllowedUiconfs([1]);
    const { CaptionsEditorCore } = await import('../../src/core/captions-editor');
    await mount(CaptionsEditorCore, { partnerId: 123, entryId: '0_abc' });
    await remote.ready();
    expect(remote.fetches.length).toBe(1);
  });
});

describe('F11: Analytics', () => {
  it('F11: a refused partner adds no iframe', async () => {
    (await host()).setAllowedPartners([1]);
    const { AnalyticsCore } = await import('../../src/core/analytics');
    const { container } = await mount(AnalyticsCore, { partnerId: 123 });
    expect([container.querySelectorAll('iframe').length, errors.map(e => [e.code, e.widget])]).toEqual([0, [['origin-not-allowed', 'analytics']]]);
  });

  it('F11: default open: the iframe is added', async () => {
    await host();
    const { AnalyticsCore } = await import('../../src/core/analytics');
    const { container } = await mount(AnalyticsCore, { partnerId: 123 });
    expect(container.querySelectorAll('iframe').length).toBe(1);
  });
});

// Components that load a Unisphere workspace. The loader module must never be imported for a refused id.
describe('F11: Unisphere widgets', () => {
  const SERVER = { serverUrl: URL_A, ks: KS };
  const CASES: Array<[string, string, string, Record<string, unknown>]> = [
    ['genie', '../../src/core/genie', 'GenieCore', { partnerId: 123, uiconfId: 456 }],
    ['content-lab', '../../src/core/content-lab', 'ContentLabCore', { partnerId: 123, uiconfId: 456, entryId: '0_abc' }],
    ['agents-widget', '../../src/core/agents-widget', 'AgentsWidgetCore', { partnerId: 123 }],
    ['vod-avatar', '../../src/core/vod-avatar', 'VodAvatarCore', { partnerId: 123 }],
    ['media-manager', '../../src/core/media-manager', 'MediaManagerCore', { partnerId: 123 }],
    ['avatar', '../../src/core/avatar', 'AvatarCore', { partnerId: 123 }],
  ];

  let imported: boolean;
  beforeEach(() => {
    imported = false;
    vi.doMock(loaderUrl(URL_A), () => {
      imported = true;
      return { loader: async () => ({ kill() {} }), createWorkspace: async () => ({ kill() {} }), embeds: {} };
    });
  });

  const mountWidget = async (path: string, name: string, props: Record<string, unknown>) => {
    const mod = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
    return mount(mod[name], { ...SERVER, ...props });
  };

  it.each(CASES)('F11: %s: a refused partner loads no module and reports the code', async (widget, path, name, props) => {
    (await host()).setAllowedPartners([1]);
    const { container } = await mountWidget(path, name, props);
    expect([imported, container.querySelector('[role="alert"]')?.textContent?.endsWith('partnerId is not allowed'), errors.map(e => [e.code, e.widget])]).toEqual([
      false,
      true,
      [['origin-not-allowed', widget]],
    ]);
  });

  it.each(CASES.filter(([, , , props]) => 'uiconfId' in props))('F11: %s: a refused uiconf loads no module', async (_widget, path, name, props) => {
    (await host()).setAllowedUiconfs([1]);
    await mountWidget(path, name, props);
    expect([imported, errors.map(e => e.code)]).toEqual([false, ['origin-not-allowed']]);
  });

  it('F11: a refused partner loads no module for UnisphereWidgetCore used directly', async () => {
    (await host()).setAllowedPartners([1]);
    const { UnisphereWidgetCore } = await import('../../src/core/unisphere-widget');
    const { container } = await mount(UnisphereWidgetCore, {
      partnerId: 123,
      ks: KS,
      serverUrl: URL_A,
      widgetName: 'w',
      runtimeName: 'r',
      visualType: 'v',
      label: 'Widget',
    });
    expect([imported, container.textContent, errors.map(e => [e.code, e.widget])]).toEqual([
      false,
      'Failed to load Widget: partnerId is not allowed',
      [['origin-not-allowed', 'unisphere']],
    ]);
  });

  it('F11: default open: the module loads', async () => {
    await host();
    await mountWidget('../../src/core/genie', 'GenieCore', { partnerId: 123, uiconfId: 456 });
    expect(imported).toBe(true);
  });
});

describe('F11: web component and A2UI paths', () => {
  // The custom elements are defined once per page, so use the setters of the same copy.
  let wc: typeof import('../../src/adapters/webcomponent/index');
  beforeAll(async () => {
    wc = await import('../../src/adapters/webcomponent/index');
  });
  afterEach(() => {
    wc.setAllowedPartners(undefined);
    wc.setKsProvider(undefined);
  });

  it('F11: the web component bundle exports both setters', () => {
    expect([typeof wc.setAllowedPartners, typeof wc.setAllowedUiconfs]).toEqual(['function', 'function']);
  });

  it('F11: the React entry exports both setters', async () => {
    const react = await import('../../src/adapters/react/index');
    expect([typeof react.setAllowedPartners, typeof react.setAllowedUiconfs]).toEqual(['function', 'function']);
  });

  it('F11: a player element with a refused partner loads no script', async () => {
    const remote = playerRemote();
    try {
      wc.setKsProvider(() => KS);
      wc.setAllowedPartners([1]);
      const el = document.createElement('kaltura-player') as HTMLElement & { config?: unknown };
      el.config = { partnerId: 123, uiconfId: 456, entryId: '0_abc12345' };
      await act(async () => {
        document.body.append(el);
      });
      await vi.waitFor(() => expect(el.querySelector('[role="alert"]')?.textContent).toBe('Failed to load player: partnerId is not allowed'));
      expect(remote.urls).toEqual([]);
    } finally {
      remote.restore();
    }
  });

  it('F11: an A2UI surface with a refused partner loads no script', async () => {
    const remote = playerRemote();
    try {
      const { buildKalturaCatalog } = await import('../../src/adapters/react/index');
      const { renderSurface } = await import('./surface-helper');
      const ids = await host();
      ids.setAllowedPartners([1]);
      const { host: surface } = await renderSurface(buildKalturaCatalog(), [
        { id: 'root', component: 'KalturaPlayer', partnerId: 123, uiconfId: 456, entryId: '0_abc12345' },
      ]);
      expect([remote.urls, surface.textContent]).toEqual([[], 'Failed to load player: partnerId is not allowed']);
    } finally {
      remote.restore();
    }
  });
});
