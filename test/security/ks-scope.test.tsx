// Covers: SEC-05 / ADR 0009 (per-instance KS scope). The provider gets the widget, a frozen scope of
// the props that name data, and an abort signal. It is called from an effect, only for props that passed
// the pre-check, once per scope, after a quiet period when the scope changes.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, Fragment, StrictMode, act } from 'react';
import { afterQuietPeriod, mount } from '../helpers/render';
import { playerRemote } from '../helpers/player-remote';
import { renderSurface } from './surface-helper';
import { setKsProvider, type KsProvider, type KsRequest } from '../../src/core/ks';
import { setAllowedPartners } from '../../src/core/allowed-ids';
import { setRegion } from '../../src/core/region';
import { kalturaReactCatalog } from '../../src/adapters/react/index';
import { PlayerCore } from '../../src/core/player';
import { FlashcardsCore } from '../../src/core/flashcards';
import { AnalyticsCore } from '../../src/core/analytics';
import { RecorderCore } from '../../src/core/recorder';
import { GenieCore } from '../../src/core/genie';
import { CaptionsEditorCore } from '../../src/core/captions-editor';
import { captionsRemote } from '../helpers/captions-remote';
import { MediaManagerCore } from '../../src/core/media-manager';

let player: ReturnType<typeof playerRemote>;

beforeEach(() => {
  player = playerRemote();
});

afterEach(() => {
  player.restore();
  setKsProvider(undefined);
  setAllowedPartners(undefined);
  setRegion('nvp1');
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const PLAYER = { partnerId: 1, uiconfId: 2, entryId: '0_a' };
// A bound value that has not arrived yet.
const PENDING = { ...PLAYER, entryId: undefined } as unknown as typeof PLAYER;
const SERVER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1';

const requests = (provider: { mock: { calls: unknown[][] } }) => provider.mock.calls.map(([, request]) => request as KsRequest);
const scopes = (provider: { mock: { calls: unknown[][] } }) => requests(provider).map(request => request.scope);
const alertOf = (container: Element) => container.querySelector('[role="alert"]')?.textContent;

/** A provider whose replies the test settles by hand. */
function deferred() {
  const pending: Array<{ request: KsRequest; resolve: (ks: string) => void }> = [];
  const provider = vi.fn<KsProvider>(
    (_widget, request) => new Promise<string>(resolve => pending.push({ request, resolve })),
  );
  return { provider, pending };
}

describe('KS-SCOPE: what the provider gets', () => {
  it('two players with different entries give two requests with the right scope', async () => {
    const provider = vi.fn<KsProvider>((_widget, { scope }) => `ks-for-${'entryId' in scope ? scope.entryId : ''}`);
    setKsProvider(provider);
    const two = () => createElement(Fragment, null, createElement(PlayerCore, PLAYER), createElement(PlayerCore, { ...PLAYER, entryId: '0_b' }));
    await mount(two, {});
    expect(scopes(provider)).toEqual([
      { region: 'nvp1', partnerId: 1, entryId: '0_a' },
      { region: 'nvp1', partnerId: 1, entryId: '0_b' },
    ]);
  });

  it('the scope holds only the known data props, not ks, config or unknown props', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(PlayerCore, { ...PLAYER, ks: 'agent-ks', autoplay: true, startTime: 3, entryName: 'x', surprise: 'y' });
    expect(Object.keys(scopes(provider)[0]).sort()).toEqual(['entryId', 'partnerId', 'region']);
  });

  it('the web component path passes no A2UI identity', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(PlayerCore, PLAYER);
    expect(Object.keys(requests(provider)[0]).sort()).toEqual(['scope', 'signal', 'version', 'widget']);
  });

  it('the request and its scope are frozen', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(FlashcardsCore, {
      title: 'D',
      partnerId: 1,
      uiconfId: 2,
      cards: [{ title: 'A', content: 'a', clips: [{ entryId: '0_a', startTime: 0, endTime: 1 }] }],
    });
    const [request] = requests(provider);
    const ids = request.widget === 'flashcards' ? request.scope.entryIds : [];
    expect([Object.isFrozen(request), Object.isFrozen(request.scope), Object.isFrozen(ids)]).toEqual([true, true, true]);
  });

  it('the scope region is the region of the host', async () => {
    setRegion('irp2');
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(PlayerCore, PLAYER);
    expect(scopes(provider)[0]).toMatchObject({ region: 'irp2' });
  });

  it('the scope region is the region of the serverUrl of a Unisphere widget', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: 'https://unisphere.frp2.ovp.kaltura.com/v1' });
    expect(scopes(provider)[0]).toMatchObject({ region: 'frp2' });
  });

  it('Analytics, Genie and Media Manager scopes hold their own props', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(AnalyticsCore, { partnerId: 1, entryId: '0_a', reportType: 'live', fromDate: '2026-01-01', toDate: '2026-01-31' });
    await mount(GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: SERVER_URL, categoryId: '123' });
    await mount(MediaManagerCore, { partnerId: 1, serverUrl: SERVER_URL, contextId: '456' });
    expect(scopes(provider)).toEqual([
      { region: 'nvp1', partnerId: 1, entryId: '0_a', reportType: 'live', fromDate: '2026-01-01', toDate: '2026-01-31' },
      { region: 'nvp1', partnerId: 1, categoryId: '123' },
      { region: 'nvp1', partnerId: 1, contextId: '456' },
    ]);
  });

  it('the Captions editor scope holds its entry and its caption asset', async () => {
    const captions = captionsRemote();
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_a', assetId: '1_asset' });
    captions.restore();
    expect(scopes(provider)).toEqual([{ region: 'nvp1', partnerId: 1, entryId: '0_a', assetId: '1_asset' }]);
  });

  it('a new assetId asks the provider again with the new scope', async () => {
    const captions = captionsRemote();
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(CaptionsEditorCore, { partnerId: 1, entryId: '0_a', assetId: '1_aaa' });
    await act(async () => root.render(createElement(CaptionsEditorCore, { partnerId: 1, entryId: '0_a', assetId: '1_bbb' })));
    await afterQuietPeriod();
    captions.restore();
    expect(scopes(provider).map(scope => (scope as { assetId?: string }).assetId)).toEqual(['1_aaa', '1_bbb']);
  });

  it('an empty optional id is left out of the scope', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: SERVER_URL, categoryId: '' });
    expect(scopes(provider)[0]).toEqual({ region: 'nvp1', partnerId: 1 });
  });
});

describe('KS-SCOPE: A2UI identity', () => {
  it('the request carries surfaceId, componentId and dataPath', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await renderSurface(kalturaReactCatalog, [{ id: 'root', component: 'KalturaPlayer', ...PLAYER }]);
    expect(requests(provider).map(({ surfaceId, componentId, dataPath }) => ({ surfaceId, componentId, dataPath }))).toEqual([
      { surfaceId: 's', componentId: 'root', dataPath: '/' },
    ]);
  });

  it('two template items give two requests that differ by dataPath and scope', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await renderSurface(
      kalturaReactCatalog,
      [
        { id: 'root', component: 'Column', children: { componentId: 'item', path: '/items' } },
        { id: 'item', component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, entryId: { path: 'entry' } },
      ],
      { items: [{ entry: '0_a' }, { entry: '0_b' }] },
    );
    expect(requests(provider).map(({ componentId, dataPath, scope }) => [componentId, dataPath, 'entryId' in scope ? scope.entryId : ''])).toEqual([
      ['item', '/items/0', '0_a'],
      ['item', '/items/1', '0_b'],
    ]);
  });

  it('a bound entry that changes asks again with the new scope', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { update } = await renderSurface(
      kalturaReactCatalog,
      [{ id: 'root', component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, entryId: { path: '/entry' } }],
      { entry: '0_a' },
    );
    await update('/entry', '0_b');
    await afterQuietPeriod();
    expect(scopes(provider).map(scope => ('entryId' in scope ? scope.entryId : ''))).toEqual(['0_a', '0_b']);
  });
});

describe('KS-SCOPE: when the provider is asked', () => {
  it('a changed data prop asks again, a changed config prop does not', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, autoplay: true, startTime: 2 })));
    await afterQuietPeriod();
    const configOnly = provider.mock.calls.length;
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    expect([configOnly, provider.mock.calls.length]).toEqual([1, 2]);
  });

  it('a burst of changes gives one request after the quiet period', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    for (const entryId of ['0_b', '0_c', '0_d', '0_e']) await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId })));
    await afterQuietPeriod();
    expect(scopes(provider).map(scope => ('entryId' in scope ? scope.entryId : ''))).toEqual(['0_a', '0_e']);
  });

  it('StrictMode gives one request per scope', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(() => createElement(StrictMode, null, createElement(PlayerCore, PLAYER)), {});
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('StrictMode also gives one request when the first request is still running', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    await mount(() => createElement(StrictMode, null, createElement(PlayerCore, PLAYER)), {});
    await act(async () => pending[0].resolve('host-ks'));
    await player.ready();
    expect([provider.mock.calls.length, player.created[0].config.provider.ks]).toEqual([1, 'host-ks']);
  });

  it('renders nothing until the first KS arrives', async () => {
    const { provider } = deferred();
    setKsProvider(provider);
    const { container } = await mount(PlayerCore, PLAYER);
    expect([container.innerHTML, player.created.length]).toEqual(['', 0]);
  });

  it('the first request goes out at once, with no quiet period', async () => {
    const { provider } = deferred();
    setKsProvider(provider);
    await mount(PlayerCore, PLAYER);
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe('KS-SCOPE: a scope change', () => {
  it('keeps the last props with their KS until the new KS arrives, and never pairs new props with the old KS', async () => {
    const provider = vi.fn<KsProvider>(async (_widget, { scope }) => `ks-${'entryId' in scope ? scope.entryId : ''}`);
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await player.ready();
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    await player.ready(2);
    const pairs = player.created.flatMap(({ config, loads }) => loads.map(load => [config.provider.ks, (load.info as { entryId: string }).entryId]));
    expect(pairs).toEqual([
      ['ks-0_a', '0_a'],
      ['ks-0_b', '0_b'],
    ]);
  });

  it('while the new KS is on its way the old widget stays', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => pending[0].resolve('ks-a'));
    await player.ready();
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    expect([pending.length, player.created.length, player.log.filter(entry => entry === 'destroy').length]).toEqual([2, 1, 0]);
  });

  it('a late reply for an earlier scope is ignored', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    await act(async () => pending[1].resolve('ks-b'));
    await act(async () => pending[0].resolve('ks-a'));
    await player.ready();
    expect(player.created.map(({ config }) => config.provider.ks)).toEqual(['ks-b']);
  });

  it('a newer scope aborts the older request', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    expect(pending.map(({ request }) => request.signal.aborted)).toEqual([true, false]);
  });

  it('a burst of changes before the first reply gives one more request', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    for (const entryId of ['0_b', '0_c', '0_d', '0_e']) await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId })));
    await afterQuietPeriod();
    expect(pending.map(({ request }) => (request.scope as { entryId: string }).entryId)).toEqual(['0_a', '0_e']);
  });

  it('a scope that goes pending and comes back is minted again', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, PENDING)));
    await act(async () => root.render(createElement(PlayerCore, PLAYER)));
    await afterQuietPeriod();
    await act(async () => pending[pending.length - 1].resolve('ks-a'));
    await player.ready();
    expect(player.created.map(({ config }) => config.provider.ks)).toEqual(['ks-a']);
  });

  it('a held scope that changes, goes pending and comes back to the new value is minted', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => pending[0].resolve('ks-a'));
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await act(async () => root.render(createElement(PlayerCore, PENDING)));
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    expect(pending.map(({ request }) => (request.scope as { entryId: string }).entryId).pop()).toBe('0_b');
  });

  it('unmount aborts the request in flight', async () => {
    const { provider, pending } = deferred();
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.unmount());
    expect(pending[0].request.signal.aborted).toBe(true);
  });

  it('a scope that goes back to the held one needs no new request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await act(async () => root.render(createElement(PlayerCore, PLAYER)));
    await afterQuietPeriod();
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe('KS-SCOPE: flashcards', () => {
  const deck = (...ids: string[]) => ({
    title: 'Deck',
    partnerId: 1,
    uiconfId: 2,
    cards: ids.map(entryId => ({ title: 'C', content: 'c', clips: [{ entryId, startTime: 0, endTime: 1 }] })),
  });

  it('asks for the sorted unique clip entries', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(FlashcardsCore, deck('0_b', '0_a', '0_b'));
    expect(scopes(provider)).toEqual([{ region: 'nvp1', partnerId: 1, entryIds: ['0_a', '0_b'] }]);
  });

  it('a subset of the minted entries keeps the KS and needs no request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(FlashcardsCore, deck('0_a', '0_b'));
    await act(async () => root.render(createElement(FlashcardsCore, deck('0_a'))));
    await afterQuietPeriod();
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('a new entry asks again', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { root } = await mount(FlashcardsCore, deck('0_a'));
    await act(async () => root.render(createElement(FlashcardsCore, deck('0_a', '0_b'))));
    await afterQuietPeriod();
    expect(scopes(provider).map(scope => ('entryIds' in scope ? scope.entryIds : []))).toEqual([['0_a'], ['0_a', '0_b']]);
  });

  it('a bad clip entry is left out and the others still ask', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(FlashcardsCore, deck('0_a', '../x', ''));
    expect(scopes(provider).map(scope => ('entryIds' in scope ? scope.entryIds : []))).toEqual([['0_a']]);
  });

  it('no valid entry gives no request and the cards still show', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(FlashcardsCore, deck('../x'));
    expect([provider.mock.calls.length, container.textContent?.includes('Deck')]).toEqual([0, true]);
  });

  it('no partnerId gives no request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    await mount(FlashcardsCore, { ...deck('0_a'), partnerId: undefined });
    expect(provider).not.toHaveBeenCalled();
  });

  it('a partner the host refuses gives no request and the cards still show', async () => {
    setAllowedPartners([9]);
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(FlashcardsCore, deck('0_a'));
    expect([provider.mock.calls.length, container.textContent?.includes('Deck')]).toEqual([0, true]);
  });

  it('more than 20 entries show invalid cards and give no request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const ids = Array.from({ length: 21 }, (_, i) => `0_e${i}`);
    const { container } = await mount(FlashcardsCore, deck(...ids));
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, 'Failed to load flashcards: Invalid cards']);
  });

  it('exactly 20 entries are allowed', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const ids = Array.from({ length: 20 }, (_, i) => `0_e${i}`);
    await mount(FlashcardsCore, deck(...ids));
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe('KS-SCOPE: nothing bad reaches the provider', () => {
  it('a partner the host refuses gives the error and no request', async () => {
    setAllowedPartners([9]);
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(PlayerCore, PLAYER);
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, 'Failed to load player: partnerId is not allowed']);
  });

  it('a serverUrl that is not an allowed Unisphere origin gives the error and no request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: 'https://evil.example.com/v1' });
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, 'Failed to load Kaltura Genie: serverUrl is not an allowed Unisphere origin (see setExtraAllowedOrigins)']);
  });

  it('a recorder partner the host refuses gives the error and no request', async () => {
    setAllowedPartners([9]);
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(RecorderCore, { partnerId: 1, uiconfId: 2 });
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, 'Failed to load recorder: partnerId is not allowed']);
  });

  it.each([
    [{ reportType: 'top' }, 'Invalid reportType'],
    [{ fromDate: '2026-01-01' }, 'Invalid toDate'],
    [{ fromDate: '2026-02-30', toDate: '2026-03-01' }, 'Invalid fromDate'],
    [{ fromDate: '2026-03-01', toDate: '2026-01-01' }, 'Invalid toDate'],
  ])('Analytics props %j give the error and no request', async (props, message) => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(AnalyticsCore, { partnerId: 1, ...props });
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, `Failed to load analytics: ${message}`]);
  });

  it.each([
    ['player entryId', PlayerCore, { ...PLAYER, entryId: 'a b' }, 'Failed to load player: Invalid entryId'],
    ['player partnerId', PlayerCore, { ...PLAYER, partnerId: -1 }, 'Failed to load player: Invalid partnerId'],
    ['genie categoryId', GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: SERVER_URL, categoryId: 'abc' }, 'Failed to load Kaltura Genie: Invalid categoryId'],
    ['genie categoryId too long', GenieCore, { partnerId: 1, uiconfId: 2, serverUrl: SERVER_URL, categoryId: '1234567890123' }, 'Failed to load Kaltura Genie: Invalid categoryId'],
    ['media manager contextId', MediaManagerCore, { partnerId: 1, serverUrl: SERVER_URL, contextId: '1,2' }, 'Failed to load Media Manager: Invalid contextId'],
  ] as const)('a bad %s gives the error and no request', async (_name, component, props, message) => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(component, props);
    expect([provider.mock.calls.length, alertOf(container)]).toEqual([0, message]);
  });

  it('a prop that is still undefined waits without a request', async () => {
    const provider = vi.fn<KsProvider>(() => 'host-ks');
    setKsProvider(provider);
    const { container } = await mount(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: undefined });
    expect([provider.mock.calls.length, container.innerHTML]).toEqual([0, '']);
  });
});

describe('KS-SCOPE: a failing provider', () => {
  it.each([
    ['rejects', () => Promise.reject(new Error('secret-ks-in-error'))],
    [
      'throws',
      () => {
        throw new Error('secret-ks-in-error');
      },
    ],
  ])('one that %s shows Invalid ks, leaks nothing and is not retried', async (_name, fail) => {
    const provider = vi.fn<KsProvider>(fail);
    setKsProvider(provider);
    const { container } = await mount(PlayerCore, PLAYER);
    await afterQuietPeriod();
    expect([provider.mock.calls.length, alertOf(container), container.innerHTML.includes('secret-ks-in-error')]).toEqual([
      1,
      'Failed to load player: Invalid ks: call setKsProvider',
      false,
    ]);
  });

  it('a failed request is replaced by the next scope, which asks again', async () => {
    let first = true;
    const provider = vi.fn<KsProvider>(() => {
      if (first) {
        first = false;
        return Promise.reject(new Error('no'));
      }
      return 'host-ks';
    });
    setKsProvider(provider);
    const { root } = await mount(PlayerCore, PLAYER);
    await act(async () => root.render(createElement(PlayerCore, { ...PLAYER, entryId: '0_b' })));
    await afterQuietPeriod();
    await player.ready();
    expect(player.created.map(({ config }) => config.provider.ks)).toEqual(['host-ks']);
  });
});

describe('KS-SCOPE: compatibility', () => {
  it('a provider that takes one argument still works', async () => {
    setKsProvider(widget => (widget === 'player' ? 'host-ks' : undefined));
    await mount(PlayerCore, PLAYER);
    await player.ready();
    expect(player.created[0].config.provider.ks).toBe('host-ks');
  });

  it('with no provider the ks prop is used and nothing is checked early', async () => {
    await mount(PlayerCore, { ...PLAYER, ks: 'prop-ks' });
    await player.ready();
    expect(player.created[0].config.provider.ks).toBe('prop-ks');
  });

  it('a provider that returns undefined falls back to the ks prop on the web component path', async () => {
    setKsProvider(() => undefined);
    await mount(PlayerCore, { ...PLAYER, ks: 'prop-ks' });
    await player.ready();
    expect(player.created[0].config.provider.ks).toBe('prop-ks');
  });
});
