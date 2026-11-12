// Covers: T12 (@path and @call round trip), T21 (message list order and error isolation, S11),
// T23 (unknown component type and cycle). All run through a real MessageProcessor and surface.
import { describe, it, expect, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react';
import { kalturaReactCatalog } from '../../src/adapters/react/index';
import { KALTURA_CATALOG_ID } from '../../src/adapters/react/index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Message = Record<string, unknown>;
const create: Message = { version: '1.0', createSurface: { surfaceId: 's', catalogId: KALTURA_CATALOG_ID } };
const components = (list: Message[]): Message => ({ version: '1.0', updateComponents: { surfaceId: 's', components: list } });
const text = (value: unknown): Message => components([{ id: 'root', component: 'Text', text: value }]);

let unmount: Array<() => void> = [];
afterEach(() => {
  for (const fn of unmount) fn();
  unmount = [];
  document.body.innerHTML = '';
});

const newProcessor = () => new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog]);
const send = (processor: MessageProcessor<ReactCatalogComponent>, messages: Message[]) => processor.processMessagesWithErrors(messages as never);

async function render(processor: MessageProcessor<ReactCatalogComponent>) {
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  unmount.push(() => act(() => root.unmount()));
  await act(async () => root.render(createElement(A2uiSurface, { surface: processor.model.getSurface('s')! as never })));
  await act(async () => new Promise(r => setTimeout(r, 30)));
  return host;
}

const settle = () => act(async () => new Promise(r => setTimeout(r, 30)));

describe('T12: @path and @call reach the widget through a live processor', () => {
  it('T12: a bound Text follows updateDataModel', async () => {
    const processor = newProcessor();
    send(processor, [create, text({ '@path': '/name' }), { version: '1.0', updateDataModel: { surfaceId: 's', path: '/name', value: 'Ada' } }]);
    const host = await render(processor);
    const before = host.textContent;
    send(processor, [{ version: '1.0', updateDataModel: { surfaceId: 's', path: '/name', value: 'Grace' } }]);
    await settle();
    expect([before?.trim(), host.textContent?.trim()]).toEqual(['Ada', 'Grace']);
  });

  it('T12: a formatString call reads the data model', async () => {
    const processor = newProcessor();
    const call = { '@call': 'formatString', args: { value: 'Hello ${/name}' }, returnType: 'string' };
    send(processor, [create, text(call), { version: '1.0', updateDataModel: { surfaceId: 's', path: '/name', value: 'Ada' } }]);
    expect((await render(processor)).textContent?.trim()).toBe('Hello Ada');
  });

  it('T12: a bound Kaltura prop follows the data model', async () => {
    const processor = newProcessor();
    send(processor, [
      create,
      components([{ id: 'root', component: 'KalturaChart', chartType: 'bar', title: { '@path': '/title' }, data: [{ d: 'Mon', v: 1 }], xKey: 'd', yKeys: ['v'] }]),
      { version: '1.0', updateDataModel: { surfaceId: 's', path: '/title', value: 'First title' } },
    ]);
    const host = await render(processor);
    const before = host.textContent?.includes('First title');
    send(processor, [{ version: '1.0', updateDataModel: { surfaceId: 's', path: '/title', value: 'Second title' } }]);
    await settle();
    expect([before, host.textContent?.includes('Second title')]).toEqual([true, true]);
  });
});

describe('T21: message list order and error isolation (S11)', () => {
  const list = [create, text('one'), { version: '1.0', updateDataModel: { surfaceId: 'missing', path: '/', value: {} } }, text('three')];

  it('T21: processMessagesWithErrors runs the messages around a bad one and returns one error', () => {
    const processor = newProcessor();
    const errors = send(processor, list);
    const root = processor.model.getSurface('s')?.componentsModel.get('root');
    expect([root?.properties, errors.map(e => (e as { error: { code: string; surfaceId: string } }).error.surfaceId)]).toEqual([{ text: 'three' }, ['missing']]);
  });

  it('T21: the messages run in order, so the last write wins', () => {
    const processor = newProcessor();
    send(processor, [create, text('one'), text('two'), text('three')]);
    expect(processor.model.getSurface('s')?.componentsModel.get('root')?.properties).toEqual({ text: 'three' });
  });

  it('T21: processMessages throws at the bad message and skips the rest (host-api.md says so)', () => {
    const processor = newProcessor();
    expect(() => processor.processMessages(list as never)).toThrow('Surface not found');
    expect(processor.model.getSurface('s')?.componentsModel.get('root')?.properties).toEqual({ text: 'one' });
  });

  it('T21: a schema error is a VALIDATION_FAILED message and the old component stays', () => {
    const processor = newProcessor();
    const errors = send(processor, [create, text('keep'), components([{ id: 'root', component: 'KalturaPlayer', partnerId: 'x' }])]);
    expect([errors.map(e => (e as { error: { code: string } }).error.code), processor.model.getSurface('s')?.componentsModel.get('root')?.properties]).toEqual([
      ['VALIDATION_FAILED'],
      { text: 'keep' },
    ]);
  });
});

describe('T23: an unknown type and a cycle are reported, not thrown', () => {
  const surfaceErrors = (processor: MessageProcessor<ReactCatalogComponent>) => {
    const codes: string[] = [];
    processor.model.getSurface('s')?.onError.subscribe(e => { codes.push((e as { code: string }).code); });
    return codes;
  };

  it('T23: an unknown type renders its siblings and sends UNKNOWN_COMPONENT_TYPE', async () => {
    const processor = newProcessor();
    send(processor, [
      create,
      components([{ id: 'root', component: 'Column', children: ['a', 'b'] }, { id: 'a', component: 'Nope' }, { id: 'b', component: 'Text', text: 'sibling' }]),
    ]);
    const codes = surfaceErrors(processor);
    const host = await render(processor);
    expect([host.textContent?.trim(), codes]).toEqual(['sibling', ['UNKNOWN_COMPONENT_TYPE']]);
  });

  it('T23: a cycle ends at the repeat and sends CYCLIC_REFERENCE', async () => {
    const processor = newProcessor();
    send(processor, [
      create,
      components([
        { id: 'root', component: 'Column', children: ['x', 'b'] },
        { id: 'x', component: 'Column', children: ['y'] },
        { id: 'y', component: 'Column', children: ['x'] },
        { id: 'b', component: 'Text', text: 'after the cycle' },
      ]),
    ]);
    const codes = surfaceErrors(processor);
    const host = await render(processor);
    expect([host.textContent?.includes('after the cycle'), codes]).toEqual([true, ['CYCLIC_REFERENCE']]);
  });
});
