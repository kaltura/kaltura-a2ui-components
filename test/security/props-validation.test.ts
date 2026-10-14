// Covers: SEC-03, SEC-07, SEC-11, SEC-12 root cause (core components trusted raw agent props).
// Plan item 1.5: every core component checks its resolved props and shows a plain-text error.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react/v0_9';
import { mount } from '../helpers/render';
import { playerRemote } from '../helpers/player-remote';
import { captionsRemote } from '../helpers/captions-remote';
import { checkProps } from '../../src/core/validate-props';
import { setKsProvider } from '../../src/core/ks';
import { kalturaReactCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';
import { KalturaPlayerApi } from '../../src/schemas/player';
import { KalturaFlashcardsApi } from '../../src/schemas/flashcards';
import { KalturaMediaManagerApi } from '../../src/schemas/media-manager';
import { KalturaAnalyticsApi } from '../../src/schemas/analytics';
import { KalturaCaptionsEditorApi } from '../../src/schemas/captions-editor';
import { KalturaRecorderApi } from '../../src/schemas/recorder';
import { KalturaAvatarApi } from '../../src/schemas/avatar';
import { KalturaGenieApi } from '../../src/schemas/genie';
import { KalturaContentLabApi } from '../../src/schemas/content-lab';
import { KalturaAgentsWidgetApi } from '../../src/schemas/agents-widget';
import { KalturaVodAvatarApi } from '../../src/schemas/vod-avatar';
import { KalturaChartApi } from '../../src/schemas/chart';

const SERVER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
const calls = vi.hoisted(() => ({ loader: 0, createWorkspace: 0, embeds: 0 }));

// A harmless loader, so valid Unisphere widgets can start without network.
vi.mock('https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js', () => ({
  loader: async () => {
    calls.loader++;
    return {
      kill() {},
      getRuntimeAsync: async () => ({
        openDrawer() {},
        openApplication() {},
        partnerChecks: { onChanges: (listener: (checks: unknown) => void) => listener({ status: 'loaded', isAvailable: true }) },
      }),
    };
  },
  createWorkspace: async () => {
    calls.createWorkspace++;
    return new Promise(() => {});
  },
  embeds: {
    workspace: async () => {
      calls.embeds++;
      return new Promise(() => {});
    },
  },
}));

(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

// The avatar and analytics take their KS from the provider only. The others fall back to their ks prop.
let player: ReturnType<typeof playerRemote>;
let captions: ReturnType<typeof captionsRemote>;
beforeEach(() => {
  setKsProvider(widget => (widget === 'avatar' || widget === 'analytics' ? 'dummy-ks' : undefined));
  player = playerRemote();
  captions = captionsRemote();
});
afterEach(() => {
  player.restore();
  captions.restore();
  setKsProvider(undefined);
  document.body.innerHTML = '';
  calls.loader = 0;
  calls.createWorkspace = 0;
  calls.embeds = 0;
});

const base = { partnerId: 1, ks: 'dummy-ks' };
const unisphere = { ...base, serverUrl: SERVER_URL, uiconfId: 2 };

type Entry = {
  label: string;
  load: () => Promise<unknown>;
  api: { name: string; schema: never };
  valid: Record<string, unknown>;
};

const ENTRIES: Entry[] = [
  { label: 'player', load: async () => (await import('../../src/core/player')).PlayerCore, api: KalturaPlayerApi as never, valid: { ...base, uiconfId: 2, entryId: '0_abc' } },
  { label: 'flashcards', load: async () => (await import('../../src/core/flashcards')).FlashcardsCore, api: KalturaFlashcardsApi as never, valid: { title: 'Deck', cards: [{ title: 'C', content: 'x', clips: [{ entryId: '0_abc', startTime: 0, endTime: 1 }] }] } },
  { label: 'Media Manager', load: async () => (await import('../../src/core/media-manager')).MediaManagerCore, api: KalturaMediaManagerApi as never, valid: unisphere },
  { label: 'analytics', load: async () => (await import('../../src/core/analytics')).AnalyticsCore, api: KalturaAnalyticsApi as never, valid: { partnerId: 1 } },
  { label: 'captions editor', load: async () => (await import('../../src/core/captions-editor')).CaptionsEditorCore, api: KalturaCaptionsEditorApi as never, valid: { ...base, entryId: '0_abc' } },
  { label: 'recorder', load: async () => (await import('../../src/core/recorder')).RecorderCore, api: KalturaRecorderApi as never, valid: { ...base, uiconfId: 2 } },
  { label: 'Kaltura Avatar', load: async () => (await import('../../src/core/avatar')).AvatarCore, api: KalturaAvatarApi as never, valid: { partnerId: 1, serverUrl: SERVER_URL } },
  { label: 'Kaltura Genie', load: async () => (await import('../../src/core/genie')).GenieCore, api: KalturaGenieApi as never, valid: unisphere },
  { label: 'Kaltura Content Lab', load: async () => (await import('../../src/core/content-lab')).ContentLabCore, api: KalturaContentLabApi as never, valid: { ...unisphere, entryId: '0_abc' } },
  { label: 'Kaltura AI Agents', load: async () => (await import('../../src/core/agents-widget')).AgentsWidgetCore, api: KalturaAgentsWidgetApi as never, valid: unisphere },
  { label: 'Kaltura VOD Avatar', load: async () => (await import('../../src/core/vod-avatar')).VodAvatarCore, api: KalturaVodAvatarApi as never, valid: { ...unisphere, entryId: '0_abc' } },
  { label: 'chart', load: async () => (await import('../../src/core/chart')).ChartCore, api: KalturaChartApi as never, valid: { chartType: 'bar', data: [{ n: 'a', v: 1 }] } },
];

const byLabel = (label: string) => ENTRIES.find(e => e.label === label)!;
const HOSTILE = '<img src=x onerror="window.__pwned=1">';

describe('SEC-03: valid props still render every component', () => {
  it.each(ENTRIES.map(e => [e.label] as const))('SEC-03: %s renders without an error box', async label => {
    const entry = byLabel(label);
    const { container } = await mount(await entry.load(), entry.valid);
    expect([container.querySelector('.kaltura-load-error'), container.firstElementChild === null]).toEqual([null, false]);
  });

  it('SEC-03: valid Unisphere props reach the loader', async () => {
    const entry = byLabel('Kaltura Genie');
    await mount(await entry.load(), entry.valid);
    expect(calls.loader).toBe(1);
  });
});

// [component label, props, the one prop that must be named in the error]
const BAD: Array<[string, Record<string, unknown>, string]> = [
  ['player', { ...base, uiconfId: 2, entryId: '0_abc', partnerId: '1/../x' }, 'partnerId'],
  ['player', { ...base, uiconfId: 1.5, entryId: '0_abc' }, 'uiconfId'],
  ['player', { ...base, uiconfId: 2, entryId: '0_abc', partnerId: '123' }, 'partnerId'],
  ['player', { ...base, uiconfId: 2, entryId: 'a/b' }, 'entryId'],
  ['player', { ...base, uiconfId: 2, entryId: { path: '/not/resolved' } }, 'entryId'],
  ['player', { ...base, uiconfId: 2, entryId: '0_abc', ks: 'a\nb' }, 'ks'],
  ['player', { ...base, uiconfId: 2, entryId: '0_abc', autoplay: 'yes' }, 'autoplay'],
  ['flashcards', { title: 'D', cards: 'not an array' }, 'cards'],
  ['flashcards', { title: 'D', cards: [], ks: { path: '/x' } }, 'ks'],
  ['Media Manager', { ...unisphere, partnerId: -1 }, 'partnerId'],
  ['Media Manager', { ...unisphere, mode: 'admin' }, 'mode'],
  ['Media Manager', { ...unisphere, theme: 'neon' }, 'theme'],
  ['analytics', { ...base, partnerId: '1&serviceurl=https://evil.example' }, 'partnerId'],
  ['analytics', { ...base, partnerId: '123' }, 'partnerId'],
  ['analytics', { ...base, entryId: 'a b' }, 'entryId'],
  ['analytics', { partnerId: 1, reportType: 'top' }, 'reportType'],
  ['analytics', { partnerId: 1, reportType: '<b>x</b>' }, 'reportType'],
  ['analytics', { partnerId: 1, fromDate: '2026-01-01' }, 'toDate'],
  ['analytics', { partnerId: 1, toDate: '2026-01-01' }, 'fromDate'],
  ['analytics', { partnerId: 1, fromDate: '2026-02-31', toDate: '2026-03-01' }, 'fromDate'],
  ['analytics', { partnerId: 1, fromDate: '2026-01-01', toDate: 'yesterday' }, 'toDate'],
  ['captions editor', { ...base, entryId: '0_abc', uiconfId: 0 }, 'uiconfId'],
  ['recorder', { ...base, uiconfId: null }, 'uiconfId'],
  ['Kaltura Avatar', { partnerId: 1, serverUrl: SERVER_URL, theme: 'custom' }, 'theme'],
  ['Kaltura Avatar', { partnerId: 1, serverUrl: SERVER_URL, openingPhrase: 'a'.repeat(501) }, 'openingPhrase'],
  ['Kaltura Genie', { ...unisphere, ks: null }, 'ks'],
  ['Kaltura Genie', { ...unisphere, partnerId: 0 }, 'partnerId'],
  ['Kaltura Content Lab', { ...unisphere, entryId: '../x' }, 'entryId'],
  ['chart', { chartType: 'pie-of-doom', data: [{ a: 1 }] }, 'chartType'],
  ['chart', { chartType: 'bar', data: [null] }, 'data.0'],
  ['chart', { chartType: 'bar', data: 'rows' }, 'data'],
  ['chart', { chartType: 'bar', data: [{ a: 1 }], height: '300' }, 'height'],
  ['chart', { chartType: 'bar', data: [{ a: 1 }], colors: ['url(https://example.invalid/x)'] }, 'colors.0'],
  ['chart', { chartType: 'bar', data: [{ a: 1 }], annotations: [{ x: 'a', label: 'l', color: 'url(https://example.invalid/x)' }] }, 'annotations.0.color'],
];

describe('SEC-03: invalid props show a plain-text error and never the widget', () => {
  it.each(BAD.map(([label, props, field]) => [label, field, props] as const))(
    'SEC-03: %s with bad %s',
    async (label, field, props) => {
      const entry = byLabel(label);
      const { container } = await mount(await entry.load(), props as Record<string, unknown>);
      // Recorder keeps its error inside its own container, the others render the box alone.
      const box = container.querySelector('.kaltura-load-error');
      expect(box?.textContent).toBe(`Failed to load ${label}: Invalid ${field}`);
      expect([container.querySelectorAll('iframe').length, calls.loader, calls.createWorkspace, calls.embeds]).toEqual([0, 0, 0, 0]);
    },
  );

  it('SEC-03: the error names props only and never echoes the value', async () => {
    const entry = byLabel('player');
    const { container } = await mount(await entry.load(), { ...base, uiconfId: 2, entryId: HOSTILE });
    expect([container.textContent, container.querySelectorAll('*').length]).toEqual(['Failed to load player: Invalid entryId', 1]);
  });

  it('SEC-03: hostile prop names in the payload are not echoed', async () => {
    const entry = byLabel('analytics');
    const { container } = await mount(await entry.load(), { ...base, [HOSTILE]: 1, partnerId: 'x' });
    expect(container.textContent).not.toContain('<img');
  });

  it('SEC-03: a bad flashcards partnerId still shows the deck (clips are checked on their own, SEC-11)', async () => {
    const entry = byLabel('flashcards');
    const { container } = await mount(await entry.load(), { ...entry.valid, partnerId: '1/../x' });
    expect(container.querySelector('.kaltura-load-error')).toBeNull();
  });

  it('SEC-03: a prop that turns bad after the first render replaces the widget with the error', async () => {
    const entry = byLabel('analytics');
    const Component = (await entry.load()) as never;
    const { container, root } = await mount(Component, base);
    await act(async () => root.render(createElement(Component, { ...base, partnerId: 'x' })));
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.kaltura-load-error').length]).toEqual([0, 1]);
  });
});

// [component label, props with one required prop still undefined]
const PENDING_CASES: Array<[string, Record<string, unknown>, string]> = [
  ['flashcards', { title: 'D' }, 'cards'],
  ['Media Manager', { partnerId: 1, serverUrl: SERVER_URL }, 'ks'],
  ['captions editor', base, 'entryId'],
  ['Kaltura Avatar', { partnerId: 1 }, 'serverUrl'],
  ['Kaltura Genie', { ...unisphere, ks: undefined }, 'ks'],
  ['Kaltura Content Lab', unisphere, 'entryId'],
  ['analytics', {}, 'partnerId'],
  ['player', { ...base, uiconfId: 2 }, 'entryId'],
  ['chart', { chartType: 'bar' }, 'data'],
];

describe('SEC-03: a required prop that is still undefined is pending, not an error', () => {
  it.each(PENDING_CASES.map(([label, props, field]) => [label, field, props] as const))(
    'SEC-03: %s with %s undefined renders nothing',
    async (label, _field, props) => {
      const entry = byLabel(label);
      const { container } = await mount(await entry.load(), props as Record<string, unknown>);
      expect([container.textContent, container.querySelectorAll('iframe, [role="alert"]').length, calls.loader, calls.createWorkspace, calls.embeds]).toEqual(['', 0, 0, 0, 0]);
    },
  );

  it('SEC-03: recorder with ks undefined shows no error and loads no script', async () => {
    const entry = byLabel('recorder');
    const { container } = await mount(await entry.load(), { partnerId: 1, uiconfId: 2 });
    expect([container.textContent, container.querySelectorAll('iframe, [role="alert"]').length]).toEqual(['', 0]);
  });

  // ks is optional for agents (the host provider supplies it). The core components
  // keep it required at runtime, see test/security/ks-provider.test.tsx.
  it.each(PENDING_CASES.filter(([, , field]) => field !== 'ks').map(([label, props, field]) => [label, field, props] as const))(
    'SEC-03: %s with %s undefined is pending for checkProps',
    (label, _field, props) => {
      expect(checkProps(byLabel(label).api.schema, props)).toEqual({ invalid: [], pending: true });
    },
  );

  it.each(PENDING_CASES.filter(([, , field]) => field !== 'ks').map(([label, props, field]) => [label, field, props] as const))(
    'SEC-03: %s with %s undefined is invalid for checkProps in strict mode',
    (label, field, props) => {
      expect(checkProps(byLabel(label).api.schema, props, true)).toEqual({ invalid: [field], pending: false });
    },
  );

  it('SEC-03: an undefined value inside literal data is invalid, not pending', () => {
    const cards = [{ title: 'C', content: 'x', clips: [{ entryId: '0_a', endTime: 1 }] }, { title: 'C' }];
    expect(checkProps(byLabel('flashcards').api.schema, { title: 'D', cards })).toEqual({
      invalid: ['cards.0.clips.0.startTime', 'cards.1.content'],
      pending: false,
    });
  });

  it('SEC-03: a flashcard without content shows the error, not a blank', async () => {
    const entry = byLabel('flashcards');
    const { container } = await mount(await entry.load(), { title: 'D', cards: [{ title: 'C' }] });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Failed to load flashcards: Invalid cards.0.content');
  });

  it('SEC-03: a defined but invalid value is an error even when another prop is pending', () => {
    expect(checkProps(byLabel('captions editor').api.schema, { partnerId: 'x' })).toEqual({ invalid: ['partnerId'], pending: true });
  });

  it('SEC-03: the widget appears once the missing prop arrives', async () => {
    const entry = byLabel('analytics');
    const Component = (await entry.load()) as never;
    const { container, root } = await mount(Component, {});
    await act(async () => root.render(createElement(Component, { partnerId: 1 })));
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('[role="alert"]').length]).toEqual([1, 0]);
  });
});

describe('SEC-03: web components never get a later config, so a missing prop is an error', () => {
  const connect = async (tag: string, config: Record<string, unknown>) => {
    const el = document.createElement(tag) as HTMLElement & { config: Record<string, unknown> };
    el.config = config;
    await act(async () => {
      document.body.appendChild(el);
    });
    return el;
  };

  it('SEC-03: a missing top-level partnerId stays pending in React', async () => {
    const { container } = await mount(await byLabel('analytics').load(), { ks: 'dummy-ks' });
    expect([container.textContent, container.querySelectorAll('[role="alert"]').length]).toEqual(['', 0]);
  });

  it('SEC-03: a missing top-level partnerId shows the error in the web component', async () => {
    const { defineAnalyticsWebComponent, ANALYTICS_TAG } = await import('../../src/adapters/webcomponent/analytics');
    defineAnalyticsWebComponent();
    const el = await connect(ANALYTICS_TAG, { ks: 'dummy-ks' });
    expect(el.querySelector('[role="alert"]')?.textContent).toBe('Failed to load analytics: Invalid partnerId');
  });

  it('SEC-03: every web component shows the error for an empty config', async () => {
    const { defineKalturaWebComponents, KALTURA_WC_TAGS } = await import('../../src/adapters/webcomponent/index');
    defineKalturaWebComponents();
    const silent: string[] = [];
    for (const tag of KALTURA_WC_TAGS) {
      const el = await connect(tag, {});
      if (!el.querySelector('[role="alert"]')) silent.push(tag);
    }
    expect(silent).toEqual([]);
  });
});

describe('SEC-03: resolved props never carry bindings or function calls', () => {
  const dynamicKeys = (api: Entry['api']) => {
    const shape = (api.schema as { shape: Record<string, { _def: Record<string, unknown> }> }).shape;
    return Object.entries(shape)
      .filter(([, field]) => {
        const inner = (field._def.innerType ?? field) as { _def: { description?: string } };
        return String(inner._def.description ?? '').includes('$defs/Dynamic');
      })
      .map(([key]) => key);
  };

  const cases = ENTRIES.flatMap(e => dynamicKeys(e.api).map(key => [e.label, key] as const));

  it('SEC-03: the schemas have dynamic props to check', () => {
    expect(cases.length).toBeGreaterThan(30);
  });

  it.each(cases)('SEC-03: %s: %s rejects a path binding and a function call', (label, key) => {
    const entry = byLabel(label);
    const schema = entry.api.schema;
    // A literal passes where a binding does not. Leave the prop unset first, so the base stays valid.
    expect(checkProps(schema, entry.valid).invalid).toEqual([]);
    expect(checkProps(schema, { ...entry.valid, [key]: { path: '/x' } }).invalid).toContain(key);
    expect(checkProps(schema, { ...entry.valid, [key]: { call: 'now', args: {} } }).invalid).toContain(key);
  });
});

describe('SEC-11: clip ids are checked per clip, not by the deck schema', () => {
  const deck = (entryIds: unknown[]) => ({
    title: 'Deck',
    partnerId: 1,
    uiconfId: 2,
    cards: [{ title: 'C', content: 'x', clips: entryIds.map(entryId => ({ entryId, startTime: 0, endTime: 1 })) }],
  });
  const ids = ['a/b', '../x', '1_a?x=1', 'a b', '1_a\n', '', '0'.repeat(65), 7, null, { path: '/x' }, undefined];

  it.each(ids.map(id => [id] as const))('SEC-11: the deck schema does not reject clip entryId %j', id => {
    expect(checkProps(KalturaFlashcardsApi.schema.omit({ partnerId: true, uiconfId: true }), deck([id]))).toEqual({ invalid: [], pending: false });
  });

  it('SEC-11: the deck schema still rejects a clip with a bad time', () => {
    expect(checkProps(KalturaFlashcardsApi.schema, { ...deck(['0_a']), cards: [{ title: 'C', content: 'x', clips: [{ entryId: '0_a', startTime: 'x', endTime: 1 }] }] }).invalid).toEqual(['cards.0.clips.0.startTime']);
  });

  it.each([0, -1, 1.5, NaN, Infinity, '1', null])('SEC-03: plain partnerId schemas reject %j', value => {
    expect(KalturaGenieApi.schema.shape.partnerId.safeParse(value).success).toBe(false);
  });
});

describe('SEC-03: real A2UI pipeline, bound values resolve before the check', () => {
  async function startSurface(component: Record<string, unknown>, data: Record<string, unknown>) {
    const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog]);
    processor.processMessages([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: KALTURA_CATALOG_ID } },
      { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: data } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', ...component }] } },
    ] as never);
    const surface = processor.model.getSurface('s');
    const container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      createRoot(container).render(createElement(A2uiSurface, { surface: surface! }));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 30));
    });
    return { container, processor };
  }

  const renderSurface = async (component: Record<string, unknown>, data: Record<string, unknown>) =>
    (await startSurface(component, data)).container;

  // On the A2UI path the host provider is the only KS source.
  beforeEach(() => setKsProvider(() => 'ks-from-host'));

  it('SEC-03: the provider KS reaches the player, and a bound ks from the agent is ignored', async () => {
    await renderSurface(
      { component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: { path: '/session/ks' } },
      { session: { ks: 'ks-from-agent' } },
    );
    await player.ready();
    expect(player.created[0].config.provider.ks).toBe('ks-from-host');
  });

  it('SEC-03: an unset optional binding does not fail the component', async () => {
    const container = await renderSurface(
      { component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, entryId: '0_abc', entryName: { path: '/missing' } },
      {},
    );
    expect(container.querySelector('.kaltura-load-error')).toBeNull();
  });

  it('SEC-03: a required binding with no data yields nothing, no error and no widget', async () => {
    const container = await renderSurface(
      { component: 'KalturaCaptionsEditor', partnerId: 1, entryId: { path: '/entry' } },
      {},
    );
    expect([container.querySelectorAll('iframe, [role="alert"]').length, container.textContent]).toEqual([0, '']);
  });

  it('SEC-03: the widget appears when the bound data arrives later', async () => {
    const { container, processor } = await startSurface({ component: 'KalturaCaptionsEditor', partnerId: 1, entryId: { path: '/entry' } }, {});
    await act(async () => {
      processor.processMessages([
        { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/entry', value: '0_abc' } },
      ] as never);
    });
    await captions.ready();
    await act(async () => {});
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('[role="alert"]').length]).toEqual([1, 0]);
  });

  it('SEC-03: a provider KS that is invalid shows the error', async () => {
    setKsProvider(() => 'a\nb');
    const { container } = await startSurface({ component: 'KalturaCaptionsEditor', partnerId: 1, entryId: '0_abc' }, {});
    expect(container.textContent).toBe('Failed to load captions editor: Invalid ks');
  });

  it('SEC-03: a hostile entryId arriving through the data model is refused', async () => {
    const container = await renderSurface(
      { component: 'KalturaCaptionsEditor', partnerId: 1, entryId: { path: '/entry' } },
      { entry: '1_abc&serviceurl=https://evil.example' },
    );
    expect([container.querySelectorAll('iframe').length, container.textContent]).toEqual([0, 'Failed to load captions editor: Invalid entryId']);
  });

  it('SEC-03: flashcards with nested bound text render', async () => {
    const container = await renderSurface(
      {
        component: 'KalturaFlashcards',
        title: { path: '/title' },
        cards: [{ title: { path: '/title' }, content: 'x', clips: [{ entryId: '0_abc', startTime: 0, endTime: 1 }] }],
      },
      { title: 'Deck' },
    );
    expect([container.querySelector('.kaltura-load-error'), container.textContent]).toEqual([null, expect.stringContaining('Deck')]);
  });

  it('SEC-03: a Genie widget with a provider KS reaches the loader', async () => {
    await renderSurface({ component: 'KalturaGenie', partnerId: 1, uiconfId: 2, serverUrl: SERVER_URL }, {});
    expect(calls.loader).toBe(1);
  });
});

describe('SEC-05: chart colors', () => {
  it.each(['#0af', '#00aaff80', 'rgb(0, 170, 255)', 'rgba(0 170 255 / 50%)', 'hsl(200deg 100% 50%)', 'var(--brand-color)', 'rebeccapurple'])(
    'SEC-05: %s is accepted',
    (value) => {
      expect(KalturaChartApi.schema.safeParse({ chartType: 'bar', data: [{ a: 1 }], colors: [value] }).success).toBe(true);
    },
  );

  it.each(['url(https://example.invalid/x)', 'image-set(red)', 'rgb(0,0,0); fill: url(x)', 'red url(x)', '#12'])(
    'SEC-05: %s is rejected',
    (value) => {
      expect(KalturaChartApi.schema.safeParse({ chartType: 'bar', data: [{ a: 1 }], colors: [value] }).success).toBe(false);
    },
  );
});
