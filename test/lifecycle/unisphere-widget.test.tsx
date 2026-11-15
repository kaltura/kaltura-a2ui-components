// Covers: QA-03 (an editor follows prop changes and closes its visual) and the latest-wins rule:
// the editors cover the page, so one request is open at a time and the newest one works.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { URL_A, URL_B, loaderUrl, gate, render, fakeLoader, errorSpy, tick, type LoadedRuntime, type MountedVisual } from './harness';

const base = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A };
let log: string[];
let configs: Record<string, unknown>[];
let options: unknown[];
let loads: LoadedRuntime[];
let visuals: MountedVisual[];
let sessions: unknown[];

beforeEach(() => {
  vi.resetModules();
  log = [];
  configs = [];
  options = [];
  loads = [];
  visuals = [];
  sessions = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const fake = (extra: Partial<Parameters<typeof fakeLoader>[0]> = {}) => fakeLoader({ log, configs, options, loads, visuals, sessions, ...extra });

async function core(mock: Record<string, unknown>, file = 'vod-avatar', name = 'VodAvatarCore') {
  vi.doMock(loaderUrl(URL_A), () => mock);
  vi.doMock(loaderUrl(URL_B), () => mock);
  return (await import(`../../src/core/${file}.tsx`))[name];
}

describe('QA-03: editor lifecycle', () => {
  it('QA-03: a new ks closes the old visual and mounts a new one', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect(log).toEqual(['loader 1', 'mount 1', 'unmount 1', 'loader 2', 'mount 2']);
  });

  it('QA-03: the new ks reaches the loader and the session', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect([(configs[1].session as { ks: string }).ks, sessions]).toEqual(['ks-2', [{ ks: 'ks-1', partnerId: 1 }, { ks: 'ks-2', partnerId: 1 }]]);
  });

  it('QA-03: a new serverUrl re-inits', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base, serverUrl: URL_B });
    expect(configs.map(c => c.serverUrl)).toEqual([URL_A, URL_B]);
  });

  it('QA-03: new settings re-init', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base, initialView: 'projectBuilder' });
    expect(log).toEqual(['loader 1', 'mount 1', 'unmount 1', 'loader 2', 'mount 2']);
  });

  it('QA-03: a rerender with equal props does not re-init', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base });
    expect(log).toEqual(['loader 1', 'mount 1']);
  });

  it('QA-03: unmount closes the visual and leaves the workspace alone', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    await view.unmount();
    expect(log).toEqual(['loader 1', 'mount 1', 'unmount 1']);
  });

  it('QA-03: unmount mid-load never mounts', async () => {
    const slow = gate();
    const VodAvatar = await core(fake({ wait: slow.wait }));
    const view = await render(VodAvatar, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['loader 1']);
  });

  it('QA-03: unmount while the main runtime loads skips the extra runtimes', async () => {
    const slow = gate();
    const ContentLab = await core(fake({ waitLoad: slow.wait }), 'content-lab', 'ContentLabCore');
    const view = await render(ContentLab, { ...base, uiconfId: 2, entryId: '0_a' });
    await view.unmount();
    slow.open();
    await tick();
    expect(loads).toHaveLength(1);
  });

  it('QA-03: a new ks mid-load drops the first load and mounts the second', async () => {
    const slow = gate();
    const VodAvatar = await core(fake({ waits: { 1: slow.wait } }));
    const view = await render(VodAvatar, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    slow.open();
    await tick();
    expect(log).toEqual(['loader 1', 'loader 2', 'mount 1']);
  });

  it('QA-03: a missing loader export shows the generic alert', async () => {
    const VodAvatar = await core({ loader: undefined });
    const view = await render(VodAvatar, base);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Failed to load Kaltura VOD Avatar: Unisphere loader is missing');
  });

  it('QA-03: a loader export that is not a function shows the alert', async () => {
    const VodAvatar = await core({ loader: 'nope' });
    const view = await render(VodAvatar, base);
    expect(view.container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('QA-03: a workspace without loadRuntime shows the alert', async () => {
    const VodAvatar = await core({ loader: async () => ({}) });
    const view = await render(VodAvatar, base);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Failed to load Kaltura VOD Avatar: Unisphere workspace is missing');
  });

  it('QA-03: a visual the runtime refuses shows the alert, with fixed text', async () => {
    const VodAvatar = await core(fake({ failMount: new Error('<img src=x onerror=alert(1)> secret') }));
    const view = await render(VodAvatar, base);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe('Failed to load Kaltura VOD Avatar: Unisphere visual could not mount');
  });

  it('QA-03: no React error after unmount mid-load', async () => {
    const spy = errorSpy();
    const slow = gate();
    const VodAvatar = await core(fake({ wait: slow.wait }));
    const view = await render(VodAvatar, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('QA-03: the config has no hard-coded appVersion', async () => {
    const VodAvatar = await core(fake());
    await render(VodAvatar, base);
    expect(configs[0]).not.toHaveProperty('appVersion');
  });
});

describe('Latest request wins', () => {
  it('the editor that loads next closes the one that is open', async () => {
    const VodAvatar = await core(fake());
    const { AgentsWidgetCore } = await import('../../src/core/agents-widget');
    await render(VodAvatar, base);
    await render(AgentsWidgetCore, base);
    expect(log).toEqual(['loader 1', 'mount 1', 'unmount 1', 'loader 2', 'mount 2']);
  });

  it('every request joins the one shared workspace', async () => {
    const VodAvatar = await core(fake());
    const { AgentsWidgetCore } = await import('../../src/core/agents-widget');
    await render(VodAvatar, base);
    await render(AgentsWidgetCore, base);
    expect([new Set(configs.map(c => c.appId)).size, options]).toEqual([1, [{ existsConflictStrategy: 'proxy' }, { existsConflictStrategy: 'proxy' }]]);
  });

  it('asks for no named workspace, because the Kaltura runtimes look up the default one', async () => {
    const VodAvatar = await core(fake());
    await render(VodAvatar, base);
    expect(Object.keys(configs[0])).not.toEqual(expect.arrayContaining(['workspaceName']));
  });

  it('every editor loads its own runtime into the shared workspace', async () => {
    const VodAvatar = await core(fake());
    const { AgentsWidgetCore } = await import('../../src/core/agents-widget');
    await render(VodAvatar, base);
    await render(AgentsWidgetCore, base);
    expect(loads.map(load => [load.widgetName, load.runtimeName])).toEqual([
      ['unisphere.widget.vod-avatars', 'studio'],
      ['unisphere.widget.agents', 'manager'],
    ]);
  });

  it('a request that is still loading never mounts once a newer one took over', async () => {
    const slow = gate();
    const VodAvatar = await core(fake({ waits: { 1: slow.wait } }));
    const { AgentsWidgetCore } = await import('../../src/core/agents-widget');
    await render(VodAvatar, base);
    await render(AgentsWidgetCore, base);
    slow.open();
    await tick();
    expect(loads.map(load => load.runtimeName)).toEqual(['manager']);
  });

  it('an older editor that unmounts later does not close the newer one', async () => {
    const VodAvatar = await core(fake());
    const { AgentsWidgetCore } = await import('../../src/core/agents-widget');
    const first = await render(VodAvatar, base);
    await render(AgentsWidgetCore, base);
    log.length = 0;
    await first.unmount();
    expect(log).toEqual([]);
  });

  it('the visual mounts into the container element by its id', async () => {
    const VodAvatar = await core(fake());
    const view = await render(VodAvatar, base);
    expect(visuals[0].target).toEqual({ type: 'element', elementId: view.container.firstElementChild?.id });
  });

  it('the same editor can load again after it closed', async () => {
    const VodAvatar = await core(fake());
    const first = await render(VodAvatar, base);
    await first.unmount();
    await render(VodAvatar, base);
    expect(log).toEqual(['loader 1', 'mount 1', 'unmount 1', 'loader 2', 'mount 2']);
  });
});
