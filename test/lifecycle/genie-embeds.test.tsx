// Covers: Genie loads through the Unisphere embeds API (`embeds.workspace` with `genieChat`),
// which gives each copy a workspace of its own, so Genie can share a page with anything.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { URL_A, loaderUrl, gate, render, tick } from './harness';

const base = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A };
let log: string[];
let configs: Record<string, unknown>[];
let params: Record<string, unknown>[];

beforeEach(() => {
  vi.resetModules();
  log = [];
  configs = [];
  params = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function genie(options: { gate?: Promise<void>; destroyName?: 'destroy' | 'destory'; contained?: boolean } = {}) {
  vi.doMock(loaderUrl(URL_A), () => ({
    embeds: {
      workspace: async (config: Record<string, unknown>) => {
        configs.push(config);
        log.push('workspace');
        await options.gate;
        return {
          apis: {
            genieChat: options.contained === false ? {} : { contained: (p: Record<string, unknown>) => (params.push(p), log.push('contained'), { remove: () => log.push('remove') }) },
          },
          [options.destroyName ?? 'destroy']: () => log.push('destroy'),
        };
      },
    },
  }));
  return (await import('../../src/core/genie')).GenieCore as never;
}

describe('Genie on the embeds API', () => {
  it('opens the chat in its container and closes it on unmount', async () => {
    const Genie = await genie();
    const view = await render(Genie, base);
    await view.unmount();
    expect(log).toEqual(['workspace', 'contained', 'remove', 'destroy']);
  });

  it('mounts into the container by its own id', async () => {
    const Genie = await genie();
    const view = await render(Genie, base);
    expect(params).toEqual([{ elementId: view.container.firstElementChild?.id }]);
  });

  it('gives two copies a workspace each', async () => {
    const Genie = await genie();
    await render(Genie, base);
    await render(Genie, base);
    expect(log).toEqual(['workspace', 'contained', 'workspace', 'contained']);
  });

  it('sends the session, the region and the dark or light theme', async () => {
    const Genie = await genie();
    await render(Genie, base);
    expect(configs[0]).toEqual({
      env: 'nvp1',
      session: { ks: 'ks-1', partnerId: 1 },
      apis: [{ name: 'genieChat', settings: { theme: { type: expect.stringMatching(/^(light|dark)$/) } } }],
    });
  });

  it('sends the environment of any Kaltura Unisphere host, such as a QA stack', async () => {
    const host = 'https://unisphere.nvq2.ovp.kaltura.com/v1';
    const workspace = vi.fn(async (config: unknown) => ({ config }));
    vi.doMock(loaderUrl(host), () => ({ embeds: { workspace } }));
    const { setEnvironments } = await import('../../src/core/region');
    setEnvironments({ qa: { serviceUrl: 'https://api.nvq2.ovp.kaltura.com', unisphere: 'https://unisphere.nvq2.ovp.kaltura.com' } });
    const { createEmbedsWorkspace } = await import('../../src/core/embeds');
    await createEmbedsWorkspace(host, () => false, { apis: [], session: { ks: 'ks-1', partnerId: 1 } });
    expect(workspace).toHaveBeenCalledWith(expect.objectContaining({ env: 'nvq2' }));
  });

  it('turns categoryId into the category context', async () => {
    const Genie = await genie();
    await render(Genie, { ...base, categoryId: '123' });
    expect((configs[0].apis as { settings: unknown }[])[0].settings).toEqual({ theme: expect.anything(), context: { type: 'category', id: '123' } });
  });

  it('sends language as the embeds UI language', async () => {
    const Genie = await genie();
    await render(Genie, { ...base, language: 'fr' });
    expect(configs[0].ui).toEqual({ language: 'fr' });
  });

  it('sends no ui option without a language', async () => {
    const Genie = await genie();
    await render(Genie, base);
    expect(configs[0]).not.toHaveProperty('ui');
  });

  it('accepts a page that still sends uiconfId, and ignores it', async () => {
    const Genie = await genie();
    await render(Genie, { ...base, uiconfId: 2 });
    expect(JSON.stringify(configs[0])).not.toContain('uiconf');
  });

  it('a new ks makes a new workspace and destroys the old one', async () => {
    const Genie = await genie();
    const view = await render(Genie, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect(log).toEqual(['workspace', 'contained', 'remove', 'destroy', 'workspace', 'contained']);
  });

  it('destroys a workspace that arrives after unmount, and never mounts it', async () => {
    const slow = gate();
    const Genie = await genie({ gate: slow.wait });
    const view = await render(Genie, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['workspace', 'destroy']);
  });

  it('uses the misspelled destory of the live loader', async () => {
    const Genie = await genie({ destroyName: 'destory' });
    const view = await render(Genie, base);
    await view.unmount();
    expect(log).toContain('destroy');
  });

  it('shows fixed text when the chat embed is missing', async () => {
    const Genie = await genie({ contained: false });
    const view = await render(Genie, base);
    expect([view.container.querySelector('[role="alert"]')?.textContent, log]).toEqual(['Failed to load Kaltura Genie: Genie embed is missing', ['workspace', 'destroy']]);
  });
});
