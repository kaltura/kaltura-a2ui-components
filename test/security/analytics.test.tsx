// Covers: ANA-01 (the analytics embed moves to the documented postMessage handshake).
// Guide: https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/. Decision: docs/adr/0005-analytics-and-recorder-integration.md.
// jsdom does not load the iframe, so the tests play the Analytics app: they dispatch
// the `message` events the app would send and read what the component posts back.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { afterQuietPeriod, mount } from '../helpers/render';
import { setKsProvider } from '../../src/core/ks';
import { AnalyticsCore, AnalyticsFrame, analyticsNavigation } from '../../src/core/analytics';
import { setRegion, kalturaHosts, KALTURA_REGIONS } from '../../src/core/region';
import { KalturaAnalyticsApi } from '../../src/schemas/analytics';
import catalog from '../../src/catalog/kaltura_catalog.json';

const KMC = 'https://kmc.kaltura.com';
const KS = 'djJ8MTIzfGFkbWluLWtzLWZyb20taG9zdA';
const VIEWS = { entry: { backBtn: {}, totals: { social: {} } }, audience: { engagement: {} } };

afterEach(() => {
  setKsProvider(undefined);
  setRegion('nvp1');
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

type Posted = { messageType: string; payload: unknown };

/** Mounts the component and returns the Analytics app's side of the wire. */
async function setup(props: Record<string, unknown> = { partnerId: 123 }, provider: Parameters<typeof setKsProvider>[0] = () => KS) {
  setKsProvider(provider);
  const view = await mount(AnalyticsCore, props);
  return { ...view, ...wire(view.container) };
}

function wire(container: Element) {
  const frame = container.querySelector('iframe') as HTMLIFrameElement;
  const win = frame.contentWindow as Window;
  const spy = vi.spyOn(win, 'postMessage').mockImplementation(() => {});
  /** What the component posted to the iframe: [message, targetOrigin]. */
  const sent = () => spy.mock.calls.map(([message, target]) => [message as Posted, target] as const);
  const types = () => sent().map(([message]) => message.messageType);
  const emit = async (data: unknown, from: { origin?: string; source?: Window | null } = {}) => {
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data, origin: from.origin ?? KMC, source: from.source === undefined ? win : from.source }));
    });
  };
  /** The full handshake of the guide, up to analyticsInitComplete. */
  const handshake = async () => {
    await emit({ messageType: 'analyticsInit', payload: { menuConfig: {}, viewsConfig: VIEWS } });
    await emit({ messageType: 'analyticsInitComplete' });
  };
  return { frame, win, spy, sent, types, emit, handshake };
}

describe('ANA-01: the iframe URL', () => {
  it('ANA-01: the iframe loads the Analytics app of the region and holds no KS or id', async () => {
    const { frame } = await setup({ partnerId: 123, entryId: '0_abc' });
    expect(frame.getAttribute('src')).toBe(`${KMC}/apps/kmc-analytics/latest/index.html`);
  });

  it('ANA-01: the KS is not in the URL, the DOM text or the console', async () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(m => vi.spyOn(console, m));
    const { container, handshake } = await setup();
    await handshake();
    expect([container.innerHTML.includes(KS), JSON.stringify(logs.flatMap(l => l.mock.calls)).includes(KS)]).toEqual([false, false]);
  });
});

describe('ANA-01: init', () => {
  it('ANA-01: analyticsInit is answered with an init that holds the KS, partner and echoed viewsConfig', async () => {
    const { emit, sent } = await setup();
    await emit({ messageType: 'analyticsInit', payload: { menuConfig: { items: [] }, viewsConfig: VIEWS } });
    expect(sent()).toEqual([
      [
        {
          messageType: 'init',
          payload: {
            kalturaServer: { uri: 'https://www.kaltura.com' },
            cdnServers: { serverUri: 'https://cdnapisec.kaltura.com', securedServerUri: 'https://cdnapisec.kaltura.com' },
            ks: KS,
            pid: 123,
            locale: 'en',
            live: { pollInterval: 30, healthNotificationsCount: 50 },
            menuConfig: { showMenu: false },
            viewsConfig: VIEWS,
          },
        },
        KMC,
      ],
    ]);
  });

  it('ANA-01: init leaves viewsConfig out when the app sent none', async () => {
    const { emit, sent } = await setup();
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect('viewsConfig' in (sent()[0][0].payload as object)).toBe(false);
  });

  it.each(KALTURA_REGIONS)('ANA-01: region %s sends init to its own KMC origin with its own hosts', async region => {
    setRegion(region);
    const hosts = kalturaHosts();
    const { frame, emit, sent } = await setup();
    await emit({ messageType: 'analyticsInit', payload: { viewsConfig: VIEWS } }, { origin: new URL(hosts.kmc).origin });
    const [message, target] = sent()[0];
    const payload = message.payload as { kalturaServer: { uri: string }; cdnServers: { securedServerUri: string } };
    expect([frame.getAttribute('src'), target, payload.kalturaServer.uri, payload.cdnServers.securedServerUri]).toEqual([
      `${hosts.kmc}/apps/kmc-analytics/latest/index.html`,
      new URL(hosts.kmc).origin,
      hosts.serviceUrl,
      hosts.cdn,
    ]);
  });

  it('ANA-01: the provider is asked as the analytics widget and its ADMIN KS goes into init', async () => {
    const provider = vi.fn((widget: string) => (widget === 'analytics' ? 'admin-ks' : 'user-ks'));
    const { emit, sent } = await setup({ partnerId: 123 }, provider as never);
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect([provider.mock.calls, (sent()[0][0].payload as { ks: string }).ks]).toEqual([[['analytics', expect.objectContaining({ widget: 'analytics' })]], 'admin-ks']);
  });

  it('ANA-01: a ks prop from the agent is ignored', async () => {
    const { emit, sent } = await setup({ partnerId: 123, ks: 'agent-written-ks' });
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect(JSON.stringify(sent()).includes('agent-written-ks')).toBe(false);
  });

  it('ANA-01: with no provider the widget renders nothing, even with a ks prop', async () => {
    setKsProvider(undefined);
    const { container } = await mount(AnalyticsCore, { partnerId: 123, ks: 'agent-written-ks' });
    expect([container.textContent, container.querySelectorAll('iframe').length]).toEqual(['', 0]);
  });

  it('ANA-01: the schema and the catalog have no ks prop', () => {
    const props = (catalog.components.KalturaAnalytics.allOf as Array<{ properties?: Record<string, unknown> }>).flatMap(part => Object.keys(part.properties ?? {}));
    expect(['ks' in KalturaAnalyticsApi.schema.shape, props.includes('ks')]).toEqual([false, false]);
  });

  it('ANA-01: a second analyticsInit (the app reloaded) is answered again', async () => {
    const { emit, handshake, types } = await setup();
    await handshake();
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect(types()).toEqual(['init', 'navigate', 'updateFilters', 'init']);
  });
});

describe('ANA-01: navigation and filters', () => {
  const afterHandshake = async (props: Record<string, unknown>) => {
    const { handshake, sent } = await setup(props);
    await handshake();
    return sent().slice(1).map(([message, target]) => [message, target]);
  };
  const wrap = (navigate: unknown, queryParams: unknown) => [
    [{ messageType: 'navigate', payload: navigate }, KMC],
    [{ messageType: 'updateFilters', payload: { queryParams } }, KMC],
  ];

  it('ANA-01: analyticsInitComplete sends the engagement view and the last 30 days by default', async () => {
    expect(await afterHandshake({ partnerId: 123 })).toEqual(wrap({ url: '/analytics/engagement' }, { dateBy: 'last30days' }));
  });

  it('ANA-01: entryId opens the entry view and wins over reportType', async () => {
    expect(await afterHandshake({ partnerId: 123, entryId: '0_abc', reportType: 'live' })).toEqual(
      wrap({ url: '/analytics/entry', queryParams: { id: '0_abc' } }, { dateBy: 'last30days' }),
    );
  });

  it.each([
    [{ categoryId: '123' }, 'category'],
    [{ playlistId: '1_bbbbbbbb' }, 'playlist'],
    [{ virtualEventId: '456' }, 'virtual-event'],
  ])('ANA-01: %j opens the %s view and wins over reportType', async (subject, route) => {
    expect(await afterHandshake({ partnerId: 123, reportType: 'live', ...subject })).toEqual(
      wrap({ url: `/analytics/${route}`, queryParams: { id: Object.values(subject)[0] } }, { dateBy: 'last30days' }),
    );
  });

  it('ANA-01: reportType and a date range map to navigate and updateFilters', async () => {
    expect(await afterHandshake({ partnerId: 123, reportType: 'geo-location', fromDate: '2026-01-01', toDate: '2026-03-31' })).toEqual(
      wrap({ url: '/analytics/geo-location' }, { dateFrom: '2026-01-01', dateTo: '2026-03-31' }),
    );
  });

  it('ANA-01: nothing is sent before analyticsInitComplete', async () => {
    const { emit, types } = await setup();
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect(types()).toEqual(['init']);
  });

  it('ANA-01: a prop that changes after the handshake navigates again, with no reload', async () => {
    const { container, root, frame, handshake, sent } = await setup();
    await handshake();
    await act(async () => root.render(createElement(AnalyticsCore, { partnerId: 123, reportType: 'technology' })));
    await afterQuietPeriod();
    expect([container.querySelector('iframe') === frame, sent().slice(3).map(([message]) => message)]).toEqual([
      true,
      [
        { messageType: 'navigate', payload: { url: '/analytics/technology' } },
        { messageType: 'updateFilters', payload: { queryParams: { dateBy: 'last30days' } } },
      ],
    ]);
  });

  it.each([
    [{ reportType: 'top' }, 'Invalid reportType'],
    [{ reportType: '../../x' }, 'Invalid reportType'],
    [{ entryId: '0_abc', categoryId: '123' }, 'Invalid categoryId'],
    [{ playlistId: '1_a', virtualEventId: '4' }, 'Invalid virtualEventId'],
    [{ categoryId: 'abc' }, 'Invalid categoryId'],
    [{ virtualEventId: '1_a' }, 'Invalid virtualEventId'],
    [{ playlistId: 'a b' }, 'Invalid playlistId'],
    [{ fromDate: '2026-01-01' }, 'Invalid toDate'],
    [{ toDate: '2026-01-01' }, 'Invalid fromDate'],
    [{ fromDate: '2026-13-01', toDate: '2026-01-01' }, 'Invalid fromDate'],
    [{ fromDate: '2026-01-01', toDate: '2026-01-01T00:00:00Z' }, 'Invalid toDate'],
  ])('ANA-01: bad props %j give a plain-text error, no iframe and no message listener', async (props, message) => {
    const listen = vi.spyOn(window, 'addEventListener');
    setKsProvider(() => KS);
    const { container } = await mount(AnalyticsCore, { partnerId: 123, ...props });
    expect([container.textContent, container.querySelectorAll('iframe').length, listen.mock.calls.filter(([type]) => type === 'message').length]).toEqual([
      `Failed to load analytics: ${message}`,
      0,
      0,
    ]);
  });

  it('ANA-01: analyticsNavigation names the prop and never the value', () => {
    expect(() => analyticsNavigation({ reportType: '<img src=x onerror=alert(1)>' })).toThrow(new Error('Invalid reportType'));
  });
});

describe('ANA-01: origin and source checks', () => {
  const HOSTILE_ORIGINS = ['https://evil.example', 'https://kmc.kaltura.com.evil.example', 'http://kmc.kaltura.com', 'https://kmc.kaltura.com:8443', 'https://www.kaltura.com', 'null', ''];

  it.each(HOSTILE_ORIGINS)('ANA-01: a message from origin %j is ignored', async origin => {
    const { emit, handshake, spy } = await setup();
    await emit({ messageType: 'analyticsInit', payload: { viewsConfig: VIEWS } }, { origin });
    await emit({ messageType: 'analyticsInitComplete' }, { origin });
    await emit({ messageType: 'updateLayout', payload: { height: 900 } }, { origin });
    expect(spy).not.toHaveBeenCalled();
    await handshake();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('ANA-01: a message from the right origin but another window is ignored', async () => {
    const other = document.body.appendChild(document.createElement('iframe')).contentWindow;
    const { emit, spy } = await setup();
    for (const source of [window, other, null]) await emit({ messageType: 'analyticsInit', payload: {} }, { source });
    expect(spy).not.toHaveBeenCalled();
  });

  it('ANA-01: a message from another window cannot move the layout', async () => {
    const { container, emit } = await setup();
    await emit({ messageType: 'updateLayout', payload: { height: 900 } }, { source: window });
    expect((container.firstElementChild as HTMLElement).style.height).toBe('');
  });

  it('ANA-01: every message to the iframe goes to the KMC origin, never "*"', async () => {
    const { handshake, emit, sent } = await setup();
    await handshake();
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect([sent().length, [...new Set(sent().map(([, target]) => target))]]).toEqual([4, [KMC]]);
  });

  it('ANA-01: the component never posts to any other window', async () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const { handshake } = await setup();
    await handshake();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('ANA-01: messages the component ignores', () => {
  it.each([
    ['an unknown type', { messageType: 'somethingElse', payload: {} }],
    ['a drill-down request', { messageType: 'navigateTo', payload: '/content/entries/entry/0_abc' }],
    ['a logout request', { messageType: 'logout' }],
    ['a scroll request', { messageType: 'scrollTo', payload: '100' }],
    ['no messageType', { payload: {} }],
    ['a numeric messageType', { messageType: 5 }],
    ['a string', 'analyticsInit'],
    ['null', null],
    ['an array', ['analyticsInit']],
  ])('ANA-01: %s changes nothing and posts nothing', async (_label, data) => {
    const { container, emit, spy } = await setup();
    const before = container.innerHTML;
    await emit(data);
    expect([spy.mock.calls.length, container.innerHTML]).toEqual([0, before]);
  });
});

describe('ANA-01: updateLayout', () => {
  const heightAfter = async (payload: unknown) => {
    const { container, emit } = await setup();
    await emit({ messageType: 'updateLayout', payload });
    return (container.firstElementChild as HTMLElement).style.height;
  };

  it.each([
    [900, '900px'],
    [10, '400px'],
    [-50, '400px'],
    [99999, '10000px'],
  ])('ANA-01: a height of %s becomes %s', async (height, expected) => {
    expect(await heightAfter({ height })).toBe(expected);
  });

  it.each([['NaN', NaN], ['Infinity', Infinity], ['a string', '900'], ['an object', {}], ['null', null], ['a script', '900px; position:fixed']])(
    'ANA-01: a height that is %s is ignored',
    async (_label, height) => {
      expect(await heightAfter({ height })).toBe('');
    },
  );

  it.each([undefined, null, 5, 'x'])('ANA-01: a payload of %j is ignored', async payload => {
    expect(await heightAfter(payload)).toBe('');
  });
});

describe('ANA-01: KS renewal', () => {
  const nav = analyticsNavigation({});
  const render = (root: { render(node: unknown): void }, ks: string) => act(async () => root.render(createElement(AnalyticsFrame, { partnerId: 123, ks, nav })));

  it('ANA-01: a new KS goes out as updateConfig to the KMC origin, with no reload', async () => {
    const view = await mount(AnalyticsFrame, { partnerId: 123, ks: 'ks-one', nav });
    const { frame, handshake, sent } = wire(view.container);
    await handshake();
    await render(view.root, 'ks-two');
    expect([view.container.querySelector('iframe') === frame, sent().slice(3)]).toEqual([true, [[{ messageType: 'updateConfig', payload: { ks: 'ks-two' } }, KMC]]]);
  });

  it('ANA-01: init carries the newest KS when it changed before the app asked', async () => {
    const view = await mount(AnalyticsFrame, { partnerId: 123, ks: 'ks-one', nav });
    const { emit, sent } = wire(view.container);
    await render(view.root, 'ks-two');
    await emit({ messageType: 'analyticsInit', payload: {} });
    expect([sent().length, (sent()[0][0].payload as { ks: string }).ks]).toEqual([1, 'ks-two']);
  });

  it('ANA-01: a KS that changed between init and analyticsInitComplete is renewed once the app is ready', async () => {
    const view = await mount(AnalyticsFrame, { partnerId: 123, ks: 'ks-one', nav });
    const { emit, types, sent } = wire(view.container);
    await emit({ messageType: 'analyticsInit', payload: {} });
    await render(view.root, 'ks-two');
    expect(types()).toEqual(['init']);
    await emit({ messageType: 'analyticsInitComplete' });
    expect([types(), sent()[3][0].payload]).toEqual([['init', 'navigate', 'updateFilters', 'updateConfig'], { ks: 'ks-two' }]);
  });

  it('ANA-01: the same KS is not sent again', async () => {
    const view = await mount(AnalyticsFrame, { partnerId: 123, ks: 'ks-one', nav });
    const { handshake, types } = wire(view.container);
    await handshake();
    await render(view.root, 'ks-one');
    expect(types()).toEqual(['init', 'navigate', 'updateFilters']);
  });

  it('ANA-01: the KS never leaves in any message but init and updateConfig', async () => {
    const view = await mount(AnalyticsFrame, { partnerId: 123, ks: 'ks-one', nav });
    const { handshake, sent } = wire(view.container);
    await handshake();
    await render(view.root, 'ks-two');
    expect(sent().filter(([message]) => JSON.stringify(message).includes('ks-')).map(([message]) => message.messageType)).toEqual(['init', 'updateConfig']);
  });
});

describe('ANA-01: cleanup', () => {
  it('ANA-01: unmount removes the message listener, so a late message does nothing', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { root, win, spy, emit } = await setup();
    await act(async () => root.unmount());
    await emit({ messageType: 'analyticsInit', payload: {} }, { source: win });
    expect([remove.mock.calls.filter(([type]) => type === 'message').length, spy.mock.calls.length]).toEqual([1, 0]);
  });

  it('ANA-01: every listener added is removed again', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { root } = await setup();
    await act(async () => root.unmount());
    const count = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'message').length;
    expect([count(add), count(remove)]).toEqual([1, 1]);
  });

  it('ANA-01: two widgets answer only their own iframe', async () => {
    setKsProvider(() => KS);
    const first = await mount(AnalyticsCore, { partnerId: 1 });
    const second = await mount(AnalyticsCore, { partnerId: 2 });
    const a = wire(first.container);
    const b = wire(second.container);
    await a.emit({ messageType: 'analyticsInit', payload: {} });
    expect([a.types(), b.types()]).toEqual([['init'], []]);
    expect((a.sent()[0][0].payload as { pid: number }).pid).toBe(1);
  });
});
