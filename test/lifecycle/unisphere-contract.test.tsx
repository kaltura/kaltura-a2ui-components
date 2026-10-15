// The live Unisphere runtimes reject settings they do not declare, and skip the runtime
// without an error. Names, settings and visual types below were checked against
// https://unisphere.nvp1.ovp.kaltura.com/v1/runtime.json and a live render on 2026-10-13.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { URL_A, URL_B, loaderUrl, render } from './harness';

type Checks = { status: string; isAvailable: boolean };
interface Runtime { widgetName: string; runtimeName: string; settings: Record<string, unknown>; visuals: { type: string }[] }
let configs: { runtimes: Runtime[] }[];
let calls: string[];
let listeners: Array<(checks: Checks) => void>;

beforeEach(() => {
  vi.resetModules();
  configs = [];
  calls = [];
  listeners = [];
  vi.doMock(loaderUrl(URL_A), () => ({
    loader: async (cfg: { runtimes: Runtime[] }) => {
      configs.push(cfg);
      return {
        kill: () => {},
        getRuntimeAsync: async () => ({
          openDrawer: () => calls.push('openDrawer'),
          openApplication: (options: unknown) => calls.push(`openApplication ${JSON.stringify(options)}`),
          partnerChecks: { onChanges: (listener: (checks: Checks) => void) => listeners.push(listener) },
        }),
      };
    },
  }));
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const props = { partnerId: 1234567, ks: 'ks-1', serverUrl: URL_A };
const runtimeOf = async (module: string, name: string, extra: Record<string, unknown>) => {
  const Component = ((await import(/* @vite-ignore */ module)) as Record<string, never>)[name];
  await render(Component, { ...props, ...extra });
  return configs[0].runtimes[0];
};

describe('Unisphere runtime contract', () => {
  it('genie: application runtime, page visual, string pid and uiConfId', async () => {
    const runtime = await runtimeOf('../../src/core/genie', 'GenieCore', { uiconfId: 1000072 });
    expect([runtime.widgetName, runtime.runtimeName, runtime.visuals[0].type, runtime.settings]).toEqual([
      'unisphere.widget.genie',
      'application',
      'page',
      { ks: 'ks-1', pid: '1234567', uiConfId: '1000072', kalturaServerURI: 'https://cdnapisec.kaltura.com', language: 'en' },
    ]);
  });

  it('vod avatar: vod-avatars studio runtime, numeric partnerId, no extra settings', async () => {
    const runtime = await runtimeOf('../../src/core/vod-avatar', 'VodAvatarCore', { entryId: '0_abc' });
    expect([runtime.widgetName, runtime.runtimeName, runtime.visuals[0].type, runtime.settings]).toEqual([
      'unisphere.widget.vod-avatars',
      'studio',
      'application',
      { ks: 'ks-1', partnerId: 1234567, kalturaServerURI: 'https://www.kaltura.com' },
    ]);
  });

  it('agents: manager runtime, drawer visual, regional service URL', async () => {
    const runtime = await runtimeOf('../../src/core/agents-widget', 'AgentsWidgetCore', {});
    expect([runtime.widgetName, runtime.runtimeName, runtime.visuals[0].type, runtime.settings]).toEqual([
      'unisphere.widget.agents',
      'manager',
      'drawer',
      {
        ks: 'ks-1',
        pid: '1234567',
        agentsServiceURI: 'https://agents-manager.nvp1.ovp.kaltura.com',
        kalturaServerURI: 'https://www.kaltura.com',
        analyticsServerURI: 'analytics.kaltura.com',
        hostAppName: 1,
      },
    ]);
  });

  it('agents: opens the drawer once the workspace is up', async () => {
    await runtimeOf('../../src/core/agents-widget', 'AgentsWidgetCore', {});
    expect(calls).toEqual(['openDrawer']);
  });

  it('content lab: application runtime, drawer visual, schema version 1', async () => {
    const runtime = await runtimeOf('../../src/core/content-lab', 'ContentLabCore', { uiconfId: 1000072, entryId: '1_hpc1olo6' });
    expect([runtime.widgetName, runtime.runtimeName, runtime.visuals[0].type, runtime.settings]).toEqual([
      'unisphere.widget.content-lab',
      'application',
      'drawer',
      {
        _schemaVersion: '1',
        ks: 'ks-1',
        pid: '1234567',
        uiconfId: '1000072',
        kalturaServerURI: 'https://www.kaltura.com',
        analyticsServerURI: 'analytics.kaltura.com',
        hostAppName: 0,
        hostedInKalturaProduct: true,
        widget: '',
      },
    ]);
  });

  it('content lab: ai-consent runtime, announcement visual on the body', async () => {
    await runtimeOf('../../src/core/content-lab', 'ContentLabCore', { uiconfId: 1000072, entryId: '1_hpc1olo6' });
    const { widgetName, runtimeName, visuals, settings } = configs[0].runtimes[1] as Runtime & { visuals: { target: unknown }[] };
    expect([widgetName, runtimeName, visuals, settings]).toEqual([
      'unisphere.widget.content-lab',
      'ai-consent',
      [{ type: 'announcement', target: { target: 'body' }, settings: {} }],
      {
        _schemaVersion: '1',
        ks: 'ks-1',
        pid: '1234567',
        hostApp: 'kaltura-a2ui-components',
        kaltura: { analyticsServerURI: 'analytics.kaltura.com', hostAppName: 0, hostAppVersion: 'unknown' },
      },
    ]);
  });

  it('content lab: waits for the partner checks before it opens the entry', async () => {
    await runtimeOf('../../src/core/content-lab', 'ContentLabCore', { uiconfId: 2, entryId: '1_hpc1olo6' });
    listeners[0]({ status: 'loading', isAvailable: false });
    expect(calls).toEqual([]);
  });

  it('content lab: opens the entry once, after the checks load', async () => {
    await runtimeOf('../../src/core/content-lab', 'ContentLabCore', { uiconfId: 2, entryId: '1_hpc1olo6' });
    listeners[0]({ status: 'loading', isAvailable: false });
    listeners[0]({ status: 'loaded', isAvailable: true });
    listeners[0]({ status: 'loaded', isAvailable: true });
    expect(calls).toEqual(['openApplication {"entryId":"1_hpc1olo6","eventSessionContextId":"","type":"entry"}']);
  });

  it('content lab: does not open the entry when the account cannot use it', async () => {
    await runtimeOf('../../src/core/content-lab', 'ContentLabCore', { uiconfId: 2, entryId: '1_hpc1olo6' });
    listeners[0]({ status: 'loaded', isAvailable: false });
    expect(calls).toEqual([]);
  });

  it('content lab: does not open the entry after it was unmounted', async () => {
    const Component = (await import('../../src/core/content-lab')).ContentLabCore as never;
    const view = await render(Component, { ...props, uiconfId: 2, entryId: '1_hpc1olo6' });
    await view.unmount();
    listeners[0]({ status: 'loaded', isAvailable: true });
    expect(calls).toEqual([]);
  });

  it('agents: a private-cloud server takes the region set by setRegion', async () => {
    const privateUrl = 'https://unisphere.corp.example/v1';
    vi.doMock(loaderUrl(privateUrl), () => ({
      loader: async (cfg: { runtimes: Runtime[] }) => {
        configs.push(cfg);
        return { kill: () => {}, getRuntimeAsync: async () => ({ openDrawer: () => {} }) };
      },
    }));
    (await import('../../src/core/unisphere-loader')).setExtraAllowedOrigins(['https://unisphere.corp.example']);
    (await import('../../src/core/region')).setRegion('irp2');
    const Component = (await import('../../src/core/agents-widget')).AgentsWidgetCore as never;
    await render(Component, { ...props, serverUrl: privateUrl });
    expect(configs[0].runtimes[0].settings.agentsServiceURI).toBe('https://agents-manager.irp2.ovp.kaltura.com');
  });
});

describe('Unisphere widgets take every host from the region of their serverUrl', () => {
  beforeEach(() => {
    vi.doMock(loaderUrl(URL_B), () => ({
      loader: async (cfg: { runtimes: Runtime[] }) => {
        configs.push(cfg);
        return { kill: () => {}, getRuntimeAsync: async () => ({ openDrawer: () => {} }) };
      },
    }));
  });

  it.each([
    ['../../src/core/genie', 'GenieCore', { uiconfId: 1000072 }, 'https://api.eu.kaltura.com'],
    ['../../src/core/vod-avatar', 'VodAvatarCore', { entryId: '0_abc' }, 'https://api.eu.kaltura.com'],
    ['../../src/core/content-lab', 'ContentLabCore', { uiconfId: 1000072, entryId: '1_hpc1olo6' }, 'https://api.eu.kaltura.com'],
    ['../../src/core/agents-widget', 'AgentsWidgetCore', {}, 'https://api.eu.kaltura.com'],
  ])('%s: kalturaServerURI follows an irp2 serverUrl while the default region is nvp1', async (module, name, extra, host) => {
    const Component = ((await import(/* @vite-ignore */ module)) as Record<string, never>)[name];
    await render(Component, { ...props, ...extra, serverUrl: URL_B });
    expect(configs[0].runtimes[0].settings.kalturaServerURI).toBe(host);
  });
});
