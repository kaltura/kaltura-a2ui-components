// Covers: REG-02 / ADR 0009 phase 2 (region per widget). The `region` prop picks the hosts of one
// widget instance. A name outside the host allowlist, an unknown name, or a prop that disagrees with
// `serverUrl` is refused before the provider, a script, a fetch or an iframe. Environments are named
// host sets that the host app registers: an agent sends the name, never a URL.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, Fragment } from 'react';
import { mount, afterQuietPeriod } from '../helpers/render';
import { playerRemote } from '../helpers/player-remote';
import { recorderRemote } from '../helpers/recorder-remote';
import { captionsRemote } from '../helpers/captions-remote';
import type { KsProvider, KsRequest } from '../../src/core/ks';

// A fresh module graph per test, so no script cache or host setting carries over.
async function load() {
  vi.resetModules();
  // One at a time: vitest can miss a module when two imports run at once.
  const ks = await import('../../src/core/ks');
  const ids = await import('../../src/core/allowed-ids');
  const region = await import('../../src/core/region');
  const { PlayerCore } = await import('../../src/core/player');
  const { RecorderCore } = await import('../../src/core/recorder');
  const { GenieCore } = await import('../../src/core/genie');
  const { CaptionsEditorCore } = await import('../../src/core/captions-editor');
  const { AnalyticsCore } = await import('../../src/core/analytics');
  const { buildThumbnailUrl } = await import('../../src/core/flashcards');
  return { setKsProvider: ks.setKsProvider, setAllowedRegions: ids.setAllowedRegions, setRegion: region.setRegion, setEnvironments: region.setEnvironments, PlayerCore, RecorderCore, GenieCore, CaptionsEditorCore, AnalyticsCore, buildThumbnailUrl };
}

let m: Awaited<ReturnType<typeof load>>;

let player: ReturnType<typeof playerRemote>;
let captions: ReturnType<typeof captionsRemote>;

beforeEach(async () => {
  m = await load();
  player = playerRemote();
  captions = captionsRemote();
});

afterEach(() => {
  player.restore();
  captions.restore();
  m.setKsProvider(undefined);
  m.setAllowedRegions(undefined);
  m.setEnvironments(undefined);
  m.setRegion('nvp1');
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const PLAYER = { partnerId: 1, uiconfId: 2, entryId: '0_a' };
const NVP1_PLAYER = 'https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2';
const EU_PLAYER = 'https://api.eu.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2';
const LAB = { serviceUrl: 'https://lab.example.com', unisphere: 'https://unisphere.lab.example.com' };

const alertOf = (container: Element) => container.querySelector('[role="alert"]')?.textContent;
const scopes = (provider: { mock: { calls: unknown[][] } }) => provider.mock.calls.map(([, request]) => (request as KsRequest).scope);

describe('REG-02: one region per widget', () => {
  it('two players with different regions load two different scripts and ask for two scopes', async () => {
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    await mount(() => createElement(Fragment, null, createElement(m.PlayerCore, PLAYER), createElement(m.PlayerCore, { ...PLAYER, region: 'irp2' })), {});
    await player.ready(2);
    expect([[...player.urls].sort(), scopes(provider).map(scope => scope.region).sort()]).toEqual([[EU_PLAYER, NVP1_PLAYER].sort(), ['irp2', 'nvp1']]);
  });

  it('the region prop wins over setRegion', async () => {
    m.setRegion('frp2');
    await mount(m.PlayerCore, { ...PLAYER, ks: 'k', region: 'irp2' });
    await player.ready();
    expect(player.urls).toEqual([EU_PLAYER]);
  });

  it('analytics frames the KMC of its region', async () => {
    m.setKsProvider(() => 'ks');
    const { container } = await mount(m.AnalyticsCore, { partnerId: 1, region: 'syp2' });
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://kmc.ap.kaltura.com/apps/kmc-analytics/latest/index.html');
  });

  it('a flashcards thumbnail uses the VOD host of its region', () => {
    expect(m.buildThumbnailUrl({ entryId: '0_a', startTime: 0, endTime: 1 }, 1, 'frp2')).toBe('https://cfvod.frp2.ovp.kaltura.com/p/1/thumbnail/entry_id/0_a/width/200/vid_sec/1');
  });
});

describe('REG-02: recorder', () => {
  let recorder: ReturnType<typeof recorderRemote>;

  beforeEach(() => {
    // Both fakes patch `document.head.append`, so the player fake goes first.
    player.restore();
    recorder = recorderRemote();
  });

  afterEach(() => recorder.restore());

  it('the recorder takes the script, the API and the player host from its own region', async () => {
    await mount(m.RecorderCore, { partnerId: 1, ks: 'k', uiconfId: 2, region: 'irp2' });
    await recorder.ready();
    expect([recorder.tags().map(tag => tag.src), recorder.created[0].options.serviceUrl]).toEqual([
      ['https://api.eu.kaltura.com/apps/expressrecorder/v2.2.10/express-recorder.js'],
      'https://api.eu.kaltura.com',
    ]);
  });

  it('a recorder in another region loads that region script, not the cached one', async () => {
    await mount(m.RecorderCore, { partnerId: 1, ks: 'k', uiconfId: 2 });
    await recorder.ready();
    await mount(m.RecorderCore, { partnerId: 1, ks: 'k', uiconfId: 2, region: 'irp2' });
    await recorder.ready(2);
    expect(recorder.created.map(({ options }) => options.serviceUrl)).toEqual(['https://www.kaltura.com', 'https://api.eu.kaltura.com']);
  });
});

describe('REG-02: refused before any request', () => {
  it('a region outside m.setAllowedRegions: no provider call and no script', async () => {
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    m.setAllowedRegions(['nvp1']);
    const { container } = await mount(m.PlayerCore, { ...PLAYER, region: 'irp2' });
    expect([alertOf(container), provider.mock.calls.length, player.urls]).toEqual(['Failed to load player: region is not allowed', 0, []]);
  });

  it('the default region is checked too', async () => {
    m.setAllowedRegions(['irp2']);
    const { container } = await mount(m.PlayerCore, { ...PLAYER, ks: 'k' });
    expect([alertOf(container), player.urls]).toEqual(['Failed to load player: region is not allowed', []]);
  });

  it.each(['nope', 'IRP2', 'https://evil.example', 'a'.repeat(40)])('an unknown name never reaches the provider: %j', async region => {
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    const { container } = await mount(m.PlayerCore, { ...PLAYER, region });
    expect([alertOf(container) !== undefined, provider.mock.calls.length, player.urls]).toEqual([true, 0, []]);
  });

  it('a prop that disagrees with serverUrl is refused', async () => {
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    const { container } = await mount(m.GenieCore, { partnerId: 1, uiconfId: 2, region: 'irp2', serverUrl: 'https://unisphere.frp2.ovp.kaltura.com/v1' });
    expect([alertOf(container), provider.mock.calls.length]).toEqual(['Failed to load Kaltura Genie: region is not allowed', 0]);
  });

  it('a Unisphere widget in sgp2 is refused: that region has no Unisphere host', async () => {
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    const { container } = await mount(m.GenieCore, { partnerId: 1, uiconfId: 2, region: 'sgp2' });
    expect([alertOf(container), provider.mock.calls.length]).toEqual(['Failed to load Kaltura Genie: region is not allowed', 0]);
  });

  it('the error text holds no value from the prop', async () => {
    const { container } = await mount(m.PlayerCore, { ...PLAYER, ks: 'k', region: 'secret-name' });
    expect(alertOf(container)).not.toContain('secret-name');
  });

  it('the captions editor fails closed in a region with no pinned page', async () => {
    const { container } = await mount(m.CaptionsEditorCore, { partnerId: 1, ks: 'k', entryId: '0_a', region: 'sgp2' });
    expect([container.querySelector('iframe'), captions.fetches]).toEqual([null, []]);
  });
});

describe('REG-02: environments', () => {
  it('a registered environment reaches the provider and resolves to its hosts', async () => {
    m.setEnvironments({ lab: LAB });
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    await mount(m.PlayerCore, { ...PLAYER, region: 'lab' });
    await player.ready();
    expect([player.urls, scopes(provider)[0].region]).toEqual([['https://lab.example.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2'], 'lab']);
  });

  it('an environment is subject to m.setAllowedRegions', async () => {
    m.setEnvironments({ lab: LAB });
    m.setAllowedRegions(['nvp1']);
    const { container } = await mount(m.PlayerCore, { ...PLAYER, ks: 'k', region: 'lab' });
    expect([alertOf(container), player.urls]).toEqual(['Failed to load player: region is not allowed', []]);
  });

  it('the registered Unisphere origin matches serverUrl', async () => {
    m.setEnvironments({ lab: LAB });
    const provider = vi.fn<KsProvider>(() => 'ks');
    m.setKsProvider(provider);
    await mount(m.GenieCore, { partnerId: 1, uiconfId: 2, region: 'lab', serverUrl: 'https://unisphere.lab.example.com/v1' });
    expect(scopes(provider)[0].region).toBe('lab');
  });

  it('an environment without a Unisphere host is refused by a Unisphere widget', async () => {
    m.setEnvironments({ lab: { serviceUrl: 'https://lab.example.com' } });
    const { container } = await mount(m.GenieCore, { partnerId: 1, uiconfId: 2, ks: 'k', region: 'lab' });
    expect(alertOf(container)).toBe('Failed to load Kaltura Genie: region is not allowed');
  });

  it('cdn, vod, kmc and recorder default to serviceUrl', async () => {
    m.setEnvironments({ lab: LAB });
    m.setKsProvider(() => 'ks');
    const { container } = await mount(m.AnalyticsCore, { partnerId: 1, region: 'lab' });
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://lab.example.com/apps/kmc-analytics/latest/index.html');
  });

  it('the captions editor does not run in an environment: its page has no pinned hash', async () => {
    m.setEnvironments({ lab: LAB });
    const { container } = await mount(m.CaptionsEditorCore, { partnerId: 1, ks: 'k', entryId: '0_a', region: 'lab' });
    expect([container.querySelector('iframe'), captions.fetches]).toEqual([null, []]);
  });

  it('http: works for localhost and private IPs, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => m.setEnvironments({ local: { serviceUrl: 'http://localhost:8080' }, lan: { serviceUrl: 'http://192.168.1.5:8080' }, loop: { serviceUrl: 'http://127.0.0.1' }, v6: { serviceUrl: 'http://[::1]:3000' } })).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['http: on a public host', { serviceUrl: 'http://example.com' }],
    ['http: on a look-alike private name', { serviceUrl: 'http://10.0.0.1.evil.example' }],
    ['a path', { serviceUrl: 'https://lab.example.com/api' }],
    ['userinfo', { serviceUrl: 'https://user:pw@lab.example.com' }],
    ['a query', { serviceUrl: 'https://lab.example.com?x=1' }],
    ['another scheme', { serviceUrl: 'ftp://lab.example.com' }],
    ['a non-URL', { serviceUrl: 'lab' }],
    ['no serviceUrl', { cdn: 'https://lab.example.com' }],
    ['a bad cdn', { serviceUrl: 'https://lab.example.com', cdn: 'javascript:alert(1)' }],
  ] as const)('refuses %s', (_why, environment) => {
    expect(() => m.setEnvironments({ lab: environment as never })).toThrow(/Environment "lab"/);
  });

  it.each(['irp2', 'nvp1', 'Lab', '1lab', 'a_b', '', 'a'.repeat(33)])('refuses the name %j', name => {
    expect(() => m.setEnvironments({ [name]: LAB })).toThrow('Environment name');
  });

  it('a failed call keeps the earlier list', async () => {
    m.setEnvironments({ lab: LAB });
    expect(() => m.setEnvironments({ other: LAB, bad: { serviceUrl: 'http://example.com' } })).toThrow();
    await mount(m.PlayerCore, { ...PLAYER, ks: 'k', region: 'lab' });
    await player.ready();
    expect(player.urls).toEqual(['https://lab.example.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2']);
  });

  it('undefined clears the list', async () => {
    m.setEnvironments({ lab: LAB });
    m.setEnvironments(undefined);
    const { container } = await mount(m.PlayerCore, { ...PLAYER, ks: 'k', region: 'lab' });
    expect(alertOf(container)).toBe('Failed to load player: region is not allowed');
  });
});

describe('REG-02: Unisphere URL from the region', () => {
  // Each widget gets the Unisphere host of its region when it has no serverUrl.
  const WIDGETS: Array<[string, string, Record<string, unknown>]> = [
    ['genie', 'GenieCore', { uiconfId: 2 }],
    ['content-lab', 'ContentLabCore', { uiconfId: 2, entryId: '0_a' }],
    ['vod-avatar', 'VodAvatarCore', {}],
    ['agents-widget', 'AgentsWidgetCore', {}],
    ['media-manager', 'MediaManagerCore', {}],
    ['avatar', 'AvatarCore', {}],
  ];

  async function loadWithSpy() {
    vi.resetModules();
    const urls: string[] = [];
    vi.doMock('../../src/core/unisphere-loader', async importOriginal => ({
      ...(await importOriginal<typeof import('../../src/core/unisphere-loader')>()),
      loadUnisphereModule: (url: string) => {
        urls.push(url);
        return new Promise(() => undefined);
      },
    }));
    const ks = await import('../../src/core/ks');
    const widgets = {
      GenieCore: (await import('../../src/core/genie')).GenieCore,
      ContentLabCore: (await import('../../src/core/content-lab')).ContentLabCore,
      VodAvatarCore: (await import('../../src/core/vod-avatar')).VodAvatarCore,
      AgentsWidgetCore: (await import('../../src/core/agents-widget')).AgentsWidgetCore,
      MediaManagerCore: (await import('../../src/core/media-manager')).MediaManagerCore,
      AvatarCore: (await import('../../src/core/avatar')).AvatarCore,
    };
    ks.setKsProvider(() => 'ks');
    return { urls, widgets, setKsProvider: ks.setKsProvider };
  }

  afterEach(() => vi.doUnmock('../../src/core/unisphere-loader'));

  it.each(WIDGETS)('%s loads the Unisphere host of its region', async (_name, core, extra) => {
    const spy = await loadWithSpy();
    await mount(spy.widgets[core as keyof typeof spy.widgets], { partnerId: 1, region: 'irp2', ...extra });
    spy.setKsProvider(undefined);
    expect(spy.urls).toEqual(['https://unisphere.irp2.ovp.kaltura.com/v1']);
  });

  it('a registered Unisphere origin is used for a named environment', async () => {
    const spy = await loadWithSpy();
    const region = await import('../../src/core/region');
    region.setEnvironments({ lab: LAB });
    await mount(spy.widgets.GenieCore, { partnerId: 1, uiconfId: 2, region: 'lab' });
    region.setEnvironments(undefined);
    spy.setKsProvider(undefined);
    expect(spy.urls).toEqual(['https://unisphere.lab.example.com/v1']);
  });

  it('serverUrl does not bypass a region with no Unisphere host', async () => {
    const spy = await loadWithSpy();
    const { unisphereUrl } = await import('../../src/core/region');
    spy.setKsProvider(undefined);
    expect(() => unisphereUrl('sgp2', 'https://extra.example.com/v1')).toThrow('region has no Unisphere host');
  });
});

describe('REG-02: recorder without a provider', () => {
  it('a refused region loads no script', async () => {
    player.restore();
    const recorder = recorderRemote();
    try {
      m.setAllowedRegions(['nvp1']);
      const before = recorder.tags().length;
      await mount(m.RecorderCore, { partnerId: 1, ks: 'k', uiconfId: 2, region: 'irp2' });
      expect([recorder.tags().length - before, recorder.created]).toEqual([0, []]);
    } finally {
      recorder.restore();
    }
  });
});

describe('REG-02: analytics frame', () => {
  it('a new frame starts when only the service host changes', async () => {
    m.setEnvironments({
      one: { serviceUrl: 'https://one.example.com', kmc: 'https://kmc.example.com' },
      two: { serviceUrl: 'https://two.example.com', kmc: 'https://kmc.example.com' },
    });
    m.setKsProvider(() => 'ks');
    const { container, root } = await mount(m.AnalyticsCore, { partnerId: 1, region: 'one' });
    const before = container.querySelector('iframe');
    const { act } = await import('react');
    await act(async () => root.render(createElement(m.AnalyticsCore, { partnerId: 1, region: 'two' })));
    await afterQuietPeriod();
    expect(container.querySelector('iframe')).not.toBe(before);
  });
});
