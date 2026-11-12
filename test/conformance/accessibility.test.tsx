// Covers: T10. Every widget passes the component's `accessibility` to assistive technology (A2UI 1.0).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { A2uiSurface } from '@a2ui/react';
import axe from 'axe-core';
import { installRemote, resetFakes, settle } from '../components/cases';
import { setKsProvider } from '../../src/core/ks';
import streamsJson from './fixtures/streams.json';

vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

type Message = Record<string, unknown>;
const STREAMS = streamsJson as unknown as { component: string; messages: Message[] }[];

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

/** The stream, with `accessibility` on the root component and one data model value for the label. */
async function mount(stream: { messages: Message[] }, accessibility: Record<string, unknown>) {
  const messages = stream.messages.map(message => {
    const update = message.updateComponents as { surfaceId: string; components: Message[] } | undefined;
    if (!update) return message;
    return { ...message, updateComponents: { ...update, components: update.components.map(item => (item.id === 'root' ? { ...item, accessibility } : item)) } };
  });
  const processor = new MessageProcessor([adapter.kalturaReactCatalog] as never);
  processor.processMessages([...messages, { version: '1.0', updateDataModel: { surfaceId: 's', path: '/a11y', value: 'From the model' } }] as never);
  await act(async () => root.render(createElement(A2uiSurface, { surface: processor.model.getSurface('s')! as never })));
  await settle();
  return processor;
}

const group = () => host.querySelector('[aria-label], [aria-hidden="true"]');

describe('T10: accessibility on the 12 widgets', () => {
  it.each(STREAMS.map(stream => [stream.component, stream] as const))('T10: %s sets label, description and live', async (_name, stream) => {
    await mount(stream, { label: 'Lesson video', description: 'Plays the lesson', live: 'polite' });
    const el = group();
    expect([el?.getAttribute('aria-label'), el?.getAttribute('aria-description'), el?.getAttribute('aria-live'), el?.getAttribute('role')]).toEqual([
      'Lesson video',
      'Plays the lesson',
      'polite',
      'group',
    ]);
  });

  it.each(STREAMS.map(stream => [stream.component, stream] as const))('T10: %s hides itself from assistive technology', async (_name, stream) => {
    await mount(stream, { hidden: true });
    expect(group()?.getAttribute('aria-hidden')).toBe('true');
  });

  it('T10: a bound label follows the data model', async () => {
    const processor = await mount(STREAMS[0], { label: { '@path': '/a11y' } });
    const before = group()?.getAttribute('aria-label');
    await act(async () => processor.processMessages([{ version: '1.0', updateDataModel: { surfaceId: 's', path: '/a11y', value: 'Changed' } }] as never));
    expect([before, group()?.getAttribute('aria-label')]).toEqual(['From the model', 'Changed']);
  });

  it('T10: no accessibility means the wrapper has no role, label or aria-hidden', async () => {
    await mount(STREAMS[0], {});
    expect(host.querySelector('[style*="display: contents"][role], [style*="display: contents"][aria-label], [aria-hidden]')).toBeNull();
  });
});

describe('T22: axe finds no ARIA error on the 12 widgets with accessibility set', () => {
  const RULES = ['button-name', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-allowed-attr', 'aria-allowed-role', 'aria-hidden-focus', 'aria-hidden-body'];
  const violations = async () => {
    const { violations: found } = await axe.run(host, { iframes: false, runOnly: { type: 'rule', values: RULES } });
    return found.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
  };

  it.each(STREAMS.map(stream => [stream.component, stream] as const))('T22: %s with label, description and live', async (_name, stream) => {
    await mount(stream, { label: 'Lesson video', description: 'Plays the lesson', live: 'polite' });
    expect(await violations()).toEqual([]);
  });

  it.each(STREAMS.map(stream => [stream.component, stream] as const))('T22: %s when hidden', async (_name, stream) => {
    await mount(stream, { hidden: true });
    expect(await violations()).toEqual([]);
  });

  it('T22: the check catches a bad ARIA value (control)', async () => {
    host.innerHTML = '<div role="group" aria-live="loud" aria-foo="x"></div>';
    expect((await violations()).map(line => line.split(':')[0]).sort()).toEqual(['aria-valid-attr', 'aria-valid-attr-value']);
  });
});
