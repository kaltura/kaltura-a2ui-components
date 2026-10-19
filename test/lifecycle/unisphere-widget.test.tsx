// Covers: QA-03 (the Unisphere widget follows prop changes and destroys the workspace).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { URL_A, URL_B, loaderUrl, gate, render, fakeLoader, errorSpy, tick } from './harness';

const base = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A, uiconfId: 2 };
let log: string[];
let configs: Record<string, unknown>[];

beforeEach(() => {
  vi.resetModules();
  log = [];
  configs = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function genie(mock: Record<string, unknown>) {
  vi.doMock(loaderUrl(URL_A), () => mock);
  vi.doMock(loaderUrl(URL_B), () => mock);
  return (await import('../../src/core/genie')).GenieCore;
}

describe('QA-03: Unisphere widget lifecycle', () => {
  it('QA-03: a new ks re-inits and kills the old workspace', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect(log).toEqual(['loader 1', 'kill 1', 'loader 2']);
  });

  it('QA-03: the new ks reaches the loader', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect((configs[1].session as { ks: string }).ks).toBe('ks-2');
  });

  it('QA-03: a new serverUrl re-inits', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.rerender({ ...base, serverUrl: URL_B });
    expect(configs.map(c => c.serverUrl)).toEqual([URL_A, URL_B]);
  });

  it('QA-03: new settings re-init', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.rerender({ ...base, categoryId: '123' });
    expect(log).toEqual(['loader 1', 'kill 1', 'loader 2']);
  });

  it('QA-03: a rerender with equal props does not re-init', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.rerender({ ...base });
    expect(log).toEqual(['loader 1']);
  });

  it('QA-03: unmount after load kills the workspace', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    const view = await render(Genie, base);
    await view.unmount();
    expect(log).toEqual(['loader 1', 'kill 1']);
  });

  it('QA-03: unmount mid-load kills the workspace once the load ends', async () => {
    const slow = gate();
    const Genie = await genie(fakeLoader({ log, configs, wait: slow.wait }));
    const view = await render(Genie, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['loader 1', 'kill 1']);
  });

  it('QA-03: a new ks mid-load kills the first workspace and keeps the second', async () => {
    const slow = gate();
    const Genie = await genie(fakeLoader({ log, configs, wait: slow.wait }));
    const view = await render(Genie, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    slow.open();
    await tick();
    expect(log).toEqual(['loader 1', 'loader 2', 'kill 1']);
  });

  it('QA-03: a missing loader export shows the generic alert', async () => {
    const Genie = await genie({ loader: undefined });
    const view = await render(Genie, base);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      'Failed to load Kaltura Genie: Unisphere loader is missing',
    );
  });

  it('QA-03: a loader export that is not a function shows the alert', async () => {
    const Genie = await genie({ loader: 'nope' });
    const view = await render(Genie, base);
    expect(view.container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('QA-03: no React error after unmount mid-load', async () => {
    const spy = errorSpy();
    const slow = gate();
    const Genie = await genie(fakeLoader({ log, configs, wait: slow.wait }));
    const view = await render(Genie, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('QA-03: the config has no hard-coded appVersion', async () => {
    const Genie = await genie(fakeLoader({ log, configs }));
    await render(Genie, base);
    expect(configs[0]).not.toHaveProperty('appVersion');
  });
});
