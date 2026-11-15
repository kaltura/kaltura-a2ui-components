// Covers: the editors open over the page, so their container has no box. Genie fills the page and keeps it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { URL_A, loaderUrl, render, fakeLoader } from './harness';

const base = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A };

beforeEach(() => vi.resetModules());
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe.each([
  ['Agents widget', 'agents-widget', 'AgentsWidgetCore', base, true],
  ['Content Lab', 'content-lab', 'ContentLabCore', { ...base, uiconfId: 2, entryId: '0_abc12345' }, true],
  ['VOD Avatar', 'vod-avatar', 'VodAvatarCore', base, true],
  ['Genie', 'genie', 'GenieCore', base, false],
] as const)('%s container box', (_label, file, exportName, props, overlay) => {
  async function container() {
    vi.doMock(loaderUrl(URL_A), () => ({ ...fakeLoader({ log: [], configs: [] }), embeds: {} }));
    const Core = (await import(`../../src/core/${file}.tsx`))[exportName];
    return (await render(Core, props)).container.firstElementChild as HTMLElement;
  }

  it(overlay ? 'has no min-height, because it opens over the page' : 'keeps its min-height, because it fills the page', async () => {
    expect((await container()).style.minHeight).toBe(overlay ? '' : '500px');
  });

  it(overlay ? 'carries the overlay class that removes the box' : 'has no overlay class', async () => {
    expect((await container()).classList.contains('kaltura-unisphere-overlay')).toBe(overlay);
  });
});
