// Covers: SEC-05 (a USER KS must not travel through agent output or the A2UI data model).
// Plan item 3.1, pulled forward: the host supplies the KS through setKsProvider.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react/v0_9';
import { mount } from '../helpers/render';
import { setKsProvider, type KsWidget } from '../../src/core/ks';
import { kalturaReactCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';
import { PlayerCore } from '../../src/core/player';
import { AnalyticsCore } from '../../src/core/analytics';
import { CaptionsEditorCore } from '../../src/core/captions-editor';
import { RecorderCore } from '../../src/core/recorder';
import { GenieCore } from '../../src/core/genie';
import { ContentLabCore } from '../../src/core/content-lab';
import { AgentsWidgetCore } from '../../src/core/agents-widget';
import { VodAvatarCore } from '../../src/core/vod-avatar';
import { MediaManagerCore } from '../../src/core/media-manager';
import { AvatarCore } from '../../src/core/avatar';

const SERVER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
const seen = vi.hoisted(() => ({ configs: [] as unknown[] }));

vi.mock('https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js', () => ({
  loader: async (config: unknown) => {
    seen.configs.push(config);
    return { kill() {} };
  },
  createWorkspace: async (config: unknown) => {
    seen.configs.push(config);
    return new Promise(() => {});
  },
  embeds: {
    workspace: async (config: unknown) => {
      seen.configs.push(config);
      return new Promise(() => {});
    },
  },
}));

afterEach(() => {
  setKsProvider(undefined);
  document.body.innerHTML = '';
  seen.configs = [];
  vi.restoreAllMocks();
});

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const AGENT_KS = 'agent-written-ks';
const iframeSrc = (container: Element) => container.querySelector('iframe')?.getAttribute('src') ?? '';
const unisphere = { partnerId: 1, serverUrl: SERVER_URL };

// [label, component, props without ks]. The KS lands in the iframe URL.
const IFRAME_CASES = [
  ['player', PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc' }],
  ['captions editor', CaptionsEditorCore, { partnerId: 1, entryId: '0_abc' }],
  ['recorder', RecorderCore, { partnerId: 1 }],
] as const;

// The analytics iframe gets its KS by postMessage: test/security/analytics.test.tsx.
const LEAK_CASES = [...IFRAME_CASES, ['analytics', AnalyticsCore, { partnerId: 1 }]] as const;

const UNISPHERE_CASES = [
  ['Kaltura Genie', GenieCore, unisphere],
  ['Kaltura Content Lab', ContentLabCore, unisphere],
  ['Kaltura AI Agents', AgentsWidgetCore, unisphere],
  ['Kaltura VOD Avatar', VodAvatarCore, { ...unisphere, entryId: '0_abc' }],
  ['Media Manager', MediaManagerCore, unisphere],
  ['Kaltura Avatar', AvatarCore, unisphere],
] as const;

describe('SEC-05: setKsProvider supplies the KS', () => {
  it.each(IFRAME_CASES)('SEC-05: %s uses the provider KS with no ks prop', async (_label, component, props) => {
    setKsProvider(() => HOST_KS);
    const { container } = await mount(component, props);
    expect(iframeSrc(container)).toContain(`ks=${HOST_KS}`);
  });

  it.each(UNISPHERE_CASES)('SEC-05: %s passes the provider KS to Unisphere', async (_label, component, props) => {
    setKsProvider(() => HOST_KS);
    await mount(component, props);
    expect(JSON.stringify(seen.configs)).toContain(HOST_KS);
  });

  it('SEC-05: an async provider is awaited', async () => {
    setKsProvider(async () => HOST_KS);
    const { container } = await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc' });
    expect(iframeSrc(container)).toContain(`ks=${HOST_KS}`);
  });

  it('SEC-05: nothing renders while the async provider is still running', async () => {
    setKsProvider(() => new Promise<string>(() => {}));
    const { container } = await mount(AnalyticsCore, { partnerId: 1, ks: AGENT_KS });
    expect([container.textContent, container.querySelectorAll('iframe, [role="alert"]').length]).toEqual(['', 0]);
  });

  it('SEC-05: the provider KS wins over a ks prop', async () => {
    setKsProvider(() => HOST_KS);
    const { container } = await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc', ks: AGENT_KS });
    expect([iframeSrc(container).includes(HOST_KS), iframeSrc(container).includes(AGENT_KS)]).toEqual([true, false]);
  });

  it('SEC-05: the real A2UI pipeline renders a component the agent sent without ks', async () => {
    setKsProvider(() => HOST_KS);
    const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog]);
    processor.processMessages([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: KALTURA_CATALOG_ID } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'KalturaCaptionsEditor', partnerId: 1, entryId: '0_abc' }] } },
    ] as never);
    const container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      createRoot(container).render(createElement(A2uiSurface, { surface: processor.model.getSurface('s')! }));
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 30));
    });
    expect(iframeSrc(container)).toContain(`ks=${HOST_KS}`);
  });

  it('SEC-05: the web component uses the provider KS', async () => {
    const { defineCaptionsEditorWebComponent, CAPTIONS_EDITOR_TAG } = await import('../../src/adapters/webcomponent/captions-editor');
    defineCaptionsEditorWebComponent();
    setKsProvider(() => HOST_KS);
    const el = document.createElement(CAPTIONS_EDITOR_TAG) as HTMLElement & { config: Record<string, unknown> };
    el.config = { partnerId: 1, entryId: '0_abc' };
    await act(async () => {
      document.body.appendChild(el);
    });
    expect(iframeSrc(el)).toContain(`ks=${HOST_KS}`);
  });
});

describe('SEC-05: the provider learns which widget asks, for a least-privilege KS', () => {
  const WIDGETS = [
    ['player', PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc' }],
    ['analytics', AnalyticsCore, { partnerId: 1 }],
    ['captions-editor', CaptionsEditorCore, { partnerId: 1, entryId: '0_abc' }],
    ['recorder', RecorderCore, { partnerId: 1 }],
    ['media-manager', MediaManagerCore, unisphere],
    ['genie', GenieCore, unisphere],
    ['content-lab', ContentLabCore, unisphere],
    ['agents-widget', AgentsWidgetCore, unisphere],
    ['vod-avatar', VodAvatarCore, { ...unisphere, entryId: '0_abc' }],
    ['avatar', AvatarCore, unisphere],
  ] as const;

  it.each(WIDGETS)('SEC-05: %s passes its name to the provider', async (widget, component, props) => {
    const provider = vi.fn((_widget: KsWidget) => HOST_KS);
    setKsProvider(provider);
    await mount(component, props);
    expect(provider.mock.calls).toEqual([[widget]]);
  });

  it('SEC-05: a zero-argument provider still works', async () => {
    setKsProvider(() => HOST_KS);
    const { container } = await mount(RecorderCore, { partnerId: 1 });
    expect(iframeSrc(container)).toContain(`ks=${HOST_KS}`);
  });

  it('SEC-05: the provider is called once per mount, even after re-renders', async () => {
    const provider = vi.fn(() => HOST_KS);
    setKsProvider(provider);
    const { root } = await mount(AnalyticsCore, { partnerId: 1 });
    await act(async () => root.render(createElement(AnalyticsCore, { partnerId: 1, reportType: 'live' })));
    await act(async () => root.render(createElement(AnalyticsCore, { partnerId: 2, reportType: 'live' })));
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe('SEC-05: widgets that need a KS wait for it and refuse a bad one', () => {
  const NEEDS_KS = [
    ['captions editor', CaptionsEditorCore, { partnerId: 1, entryId: '0_abc' }],
    ['Kaltura Content Lab', ContentLabCore, unisphere],
    ['Kaltura AI Agents', AgentsWidgetCore, unisphere],
    ['Kaltura VOD Avatar', VodAvatarCore, { ...unisphere, entryId: '0_abc' }],
  ] as const;

  // The avatar drops a ks prop, so it is only in the no-KS case.
  it.each([...NEEDS_KS, ['Kaltura Avatar', AvatarCore, { ...unisphere, ks: AGENT_KS }] as const])('SEC-05: %s with no KS renders nothing and loads nothing', async (_label, component, props) => {
    const { container } = await mount(component, props);
    expect([container.textContent, container.querySelectorAll('iframe, [role="alert"]').length, seen.configs.length]).toEqual(['', 0, 0]);
  });

  it.each(NEEDS_KS.flatMap(([label, component, props]) => ['', 'bad\u0000ks'].map(ks => [label, ks, component, props] as const)))(
    'SEC-05: %s with ks %j shows the error and loads nothing',
    async (label, ks, component, props) => {
      const { container } = await mount(component, { ...props, ks });
      expect([container.textContent, container.querySelectorAll('iframe').length, seen.configs.length]).toEqual([`Failed to load ${label}: Invalid ks`, 0, 0]);
    },
  );
});

describe('SEC-05: ks prop fallback', () => {
  it('SEC-05: with no provider the ks prop is used', async () => {
    const { container } = await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc', ks: AGENT_KS });
    expect(iframeSrc(container)).toContain(`ks=${AGENT_KS}`);
  });

  it.each([undefined, ''])('SEC-05: a provider that returns %j falls back to the ks prop', async value => {
    setKsProvider(() => value);
    const { container } = await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_abc', ks: AGENT_KS });
    expect(iframeSrc(container)).toContain(`ks=${AGENT_KS}`);
  });

  it('SEC-05: with no provider and no ks prop a widget that needs a KS renders nothing', async () => {
    const { container } = await mount(AnalyticsCore, { partnerId: 1 });
    expect([container.textContent, container.querySelectorAll('iframe, [role="alert"]').length]).toEqual(['', 0]);
  });

  it('SEC-05: with no provider and no ks prop the player still renders', async () => {
    const { container } = await mount(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc' });
    expect([container.querySelectorAll('iframe').length, iframeSrc(container).includes('ks=')]).toEqual([1, false]);
  });
});

const SECRET = 'SECRET-KS-\u0000-VALUE';

describe('SEC-05: invalid provider output', () => {
  it.each([
    ['a control character', () => SECRET],
    ['a number', () => 42 as never],
    ['an object', () => ({ ks: HOST_KS }) as never],
    ['a rejected promise', () => Promise.reject(new Error(SECRET))],
    ['a throw', () => {
      throw new Error(SECRET);
    }],
  ])('SEC-05: %s shows the plain-text error and no widget', async (_name, provider) => {
    setKsProvider(provider as never);
    const { container } = await mount(AnalyticsCore, { partnerId: 1 });
    expect([container.textContent, container.querySelectorAll('iframe').length]).toEqual(['Failed to load analytics: Invalid ks', 0]);
  });

  it('SEC-05: the recorder shows the error inside its container', async () => {
    setKsProvider(() => SECRET);
    const { container } = await mount(RecorderCore, { partnerId: 1 });
    expect([container.textContent, container.querySelectorAll('iframe').length]).toEqual(['Failed to load recorder: Invalid ks', 0]);
  });

  it('SEC-05: a bad provider KS is refused even when the ks prop is fine', async () => {
    setKsProvider(() => SECRET);
    const { container } = await mount(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: AGENT_KS });
    expect(container.textContent).toBe('Failed to load player: Invalid ks');
  });
});

describe('SEC-05: the provider KS never reaches DOM text or the console', () => {
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const spyConsole = () => methods.map(m => vi.spyOn(console, m).mockImplementation(() => {}));
  const logged = (spies: ReturnType<typeof spyConsole>) => JSON.stringify(spies.flatMap(s => s.mock.calls), (_k, v) => (v instanceof Error ? v.message : v));

  it.each([...LEAK_CASES, ...UNISPHERE_CASES])('SEC-05: %s with a valid KS', async (_label, component, props) => {
    const spies = spyConsole();
    setKsProvider(() => HOST_KS);
    await mount(component, props);
    expect([document.body.textContent?.includes(HOST_KS), logged(spies).includes(HOST_KS)]).toEqual([false, false]);
  });

  it.each([...LEAK_CASES, ...UNISPHERE_CASES])('SEC-05: %s with an invalid KS', async (_label, component, props) => {
    const spies = spyConsole();
    setKsProvider(() => SECRET);
    await mount(component, props);
    expect([document.body.innerHTML.includes('SECRET'), logged(spies).includes('SECRET')]).toEqual([false, false]);
  });
});

describe('SEC-05: adapters export setKsProvider', () => {
  it('SEC-05: React and web component adapters export the same function', async () => {
    const react = await import('../../src/adapters/react/index');
    const wc = await import('../../src/adapters/webcomponent/index');
    expect([react.setKsProvider, wc.setKsProvider]).toEqual([setKsProvider, setKsProvider]);
  });
});
