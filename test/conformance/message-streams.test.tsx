// Covers: CONF-09..13 (plan item 3.3c): A2UI message streams run through the
// real MessageProcessor and A2uiSurface for all 12 components. The fixtures are
// in fixtures/streams.json (valid) and fixtures/invalid-components.json.
// The host supplies the KS with setKsProvider, so no stream carries one.
//
// Peer range: package.json asks for @a2ui/web_core ^0.13.0 and @a2ui/react ^0.13.0.
// The installed versions are the lowest the range allows (CONF-14 pins that), so
// this run is the "oldest peer" run. A newer peer needs a separate install; see CONTRIBUTING.md.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { installRemote, remote, resetFakes, settle, fakes } from '../components/cases';
import { setKsProvider } from '../../src/core/ks';
import { afterQuietPeriod } from '../helpers/render';
import { messageListValidator, componentValidator, readJson } from './helpers';
import streamsJson from './fixtures/streams.json';

vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

interface Expect {
  selector?: string;
  textContains?: string[];
  iframeSrcContains?: string[];
}
interface Stream {
  component: string;
  description: string;
  messages: Record<string, unknown>[];
  expect: Expect;
  after?: { messages: Record<string, unknown>[]; expect: Expect };
}
const STREAMS = streamsJson as unknown as Stream[];
const INVALID = readJson<Record<string, { why: string; props: Record<string, unknown>; stripped?: boolean; leak?: string }[]>>('test/conformance/fixtures/invalid-components.json');

let adapter: typeof import('../../src/adapters/react/index');
let root: Root;
let host: HTMLElement;

beforeAll(async () => {
  installRemote();
  adapter = await import('../../src/adapters/react/index');
});
beforeEach(() => {
  resetFakes();
  setKsProvider(() => 'ks-fixture');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  setKsProvider(undefined);
  vi.restoreAllMocks();
});

const process = (processor: MessageProcessor<never>, messages: Record<string, unknown>[]) => processor.processMessages(messages as never);

// The fixture key `iframeSrcContains` dates from when every embed was an iframe URL. The analytics
// widget still is one. The player has no iframe, and the captions editor sets its ids as data
// attributes. So the facts are read where they live now, and written the way the fixtures write them.
function embedFacts(): string {
  const frame = host.querySelector('iframe');
  const facts = [frame?.getAttribute('src') ?? ''];
  for (const { name, value } of frame?.attributes ?? []) if (name.startsWith('data-')) facts.push(`${name.slice(5)}=${value}`);
  const player = fakes.player.created.at(-1);
  if (player) {
    const { partnerId, uiConfId } = player.config.provider;
    facts.push(`/partner_id/${partnerId}/uiconf_id/${uiConfId}`, ...player.loads.map(load => `entry_id=${(load.info as { entryId: string }).entryId}`));
  }
  return facts.join(' ');
}

function check(expected: Expect): void {
  const facts = embedFacts();
  if (expected.selector) expect(host.querySelector(expected.selector)).not.toBeNull();
  for (const text of expected.textContains ?? []) expect(host.textContent).toContain(text);
  for (const part of expected.iframeSrcContains ?? []) expect(facts).toContain(part);
}

async function mount(messages: Record<string, unknown>[]) {
  const processor = new MessageProcessor([adapter.kalturaReactCatalog] as never);
  process(processor as never, messages);
  const surface = processor.model.getSurface('s')!;
  await act(async () => root.render(createElement(A2uiSurface, { surface: surface as never })));
  await settle();
  return processor;
}

describe('CONF-09: every stream fixture is valid against the A2UI message schema', () => {
  const validate = messageListValidator();

  it.each(STREAMS.map(stream => [stream.component, stream] as const))('CONF-09: %s stream', (_name, stream) => {
    const all = [...stream.messages, ...(stream.after?.messages ?? [])];
    validate(all);
    expect(validate.errors ?? []).toEqual([]);
  });

  it('CONF-09: the fixtures cover all 12 Kaltura components, once each', () => {
    const names = Object.keys(readJson<{ components: object }>('src/catalog/kaltura_catalog.json').components);
    expect(STREAMS.map(stream => stream.component)).toEqual(names.filter(name => name.startsWith('Kaltura')));
  });

  it('CONF-09: the catalog id in the streams is the id the adapter registers', () => {
    const ids = STREAMS.map(stream => (stream.messages[0] as { createSurface: { catalogId: string } }).createSurface.catalogId);
    expect([...new Set(ids)]).toEqual([adapter.KALTURA_CATALOG_ID]);
  });
});

describe('CONF-10: the processor accepts every stream', () => {
  it.each(STREAMS.map(stream => [stream.component, stream] as const))('CONF-10: %s builds a root component of its own type', (_name, stream) => {
    const processor = new MessageProcessor([adapter.kalturaReactCatalog] as never);
    process(processor as never, stream.messages);
    expect(processor.model.getSurface('s')!.componentsModel.get('root')!.type).toBe(stream.component);
  });

  it.each(STREAMS.map(stream => [stream.component, stream] as const))('CONF-10: %s surface goes away with deleteSurface', (_name, stream) => {
    const processor = new MessageProcessor([adapter.kalturaReactCatalog] as never);
    process(processor as never, [...stream.messages, { version: 'v0.9', deleteSurface: { surfaceId: 's' } }]);
    expect(processor.model.getSurface('s')).toBeUndefined();
  });
});

describe('CONF-11: every stream renders its widget through A2uiSurface', () => {
  it.each(STREAMS.map(stream => [stream.component, stream] as const))('CONF-11: %s', async (_name, stream) => {
    await mount(stream.messages);
    check(stream.expect);
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it.each(STREAMS.filter(stream => stream.after).map(stream => [stream.component, stream] as const))(
    'CONF-12: %s follows a later updateDataModel',
    async (_name, stream) => {
      const processor = await mount(stream.messages);
      await act(async () => process(processor as never, stream.after!.messages));
      await afterQuietPeriod();
      await settle();
      check(stream.after!.expect);
    },
  );

  it('CONF-12: the Unisphere widgets start the fake remote once per stream', async () => {
    const unisphere = STREAMS.filter(stream => stream.expect.selector?.includes('unisphere-'));
    expect(unisphere.map(stream => stream.component)).toEqual([
      'KalturaMediaManager',
      'KalturaGenie',
      'KalturaContentLab',
      'KalturaAgentsWidget',
      'KalturaVodAvatar',
    ]);
    const starts: number[] = [];
    for (const stream of unisphere) {
      remote.log = [];
      await mount(stream.messages);
      starts.push(remote.log.filter(entry => entry === 'loader' || entry === 'create').length);
      act(() => root.unmount());
      root = createRoot(host);
    }
    expect(starts).toEqual([1, 1, 1, 1, 1]);
  });
});

describe('CONF-13: invalid components are rejected', () => {
  const cases = Object.entries(INVALID).flatMap(([component, list]) => list.map(item => [component, item.why, item] as const));
  const render = async (component: string, props: Record<string, unknown>) => {
    const processor = new MessageProcessor([adapter.kalturaReactCatalog] as never);
    try {
      process(processor as never, [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: adapter.KALTURA_CATALOG_ID } },
        { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component, ...props }] } },
      ]);
      await act(async () => root.render(createElement(A2uiSurface, { surface: processor.model.getSurface('s')! as never })));
      await settle();
    } catch {
      // The processor may refuse the shape before anything mounts. That is a pass.
    }
  };

  it('CONF-13: every component has at least three invalid fixtures', () => {
    expect(Object.entries(INVALID).filter(([, list]) => list.length < 3)).toEqual([]);
  });

  it.each([
    ['an entry', { entryId: '0_abc' }],
    ['a playlist', { playlistId: '1_list' }],
  ])('CONF-13: the catalog schema accepts a Player with %s', (_why, ids) => {
    expect(componentValidator('KalturaPlayer')({ id: 'root', component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, ...ids })).toBe(true);
  });

  it.each(cases)('CONF-13: the catalog schema rejects %s: %s', (component, _why, item) => {
    expect(componentValidator(component)({ id: 'root', component, ...item.props })).toBe(false);
  });

  // The runtime zod schemas drop unknown props, so the widget still mounts. The prop must not reach the page.
  it.each(cases.filter(([, , item]) => !item.stripped))('CONF-13: %s with %s never mounts an iframe or a widget', async (component, _why, item) => {
    await render(component, item.props);
    expect(host.querySelector('iframe, div[id^="unisphere-"], div[id^="kaltura-avatar-"]')).toBeNull();
  });

  it.each(cases.filter(([, , item]) => item.stripped))('CONF-13: %s with %s: the unknown prop is dropped', async (component, _why, item) => {
    await render(component, item.props);
    expect(item.leak ? host.innerHTML.includes(item.leak) : false).toBe(false);
  });
});
