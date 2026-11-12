// Covers: T24. A component id that changes type gets a new widget with fresh state.
import { describe, it, expect, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react';
import { kalturaReactCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tabs = [{ title: 'First', child: 'one' }, { title: 'Second', child: 'two' }];
const body = [{ id: 'one', component: 'Text', text: 'Body one' }, { id: 'two', component: 'Text', text: 'Body two' }];
const set = (processor: MessageProcessor<ReactCatalogComponent>, root: Record<string, unknown>) =>
  act(async () => {
    processor.processMessages([{ version: '1.0', updateComponents: { surfaceId: 's', components: [{ id: 'root', ...root }, ...body] } }] as never);
  });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('T24: a type change under the same id resets the widget', () => {
  it('T24: Tabs, Card, Tabs shows the first tab again', async () => {
    const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog]);
    processor.processMessages([{ version: '1.0', createSurface: { surfaceId: 's', catalogId: KALTURA_CATALOG_ID } }] as never);
    await set(processor, { component: 'Tabs', tabs });
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () => root.render(createElement(A2uiSurface, { surface: processor.model.getSurface('s')! as never })));
    await act(async () => new Promise(r => setTimeout(r, 30)));
    const shown = () => host.textContent?.replace(/\s+/g, ' ').trim();
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Second')?.click());
    await act(async () => new Promise(r => setTimeout(r, 30)));
    const second = shown();
    await set(processor, { component: 'Card', child: 'one' });
    await act(async () => new Promise(r => setTimeout(r, 30)));
    const card = shown();
    await set(processor, { component: 'Tabs', tabs });
    await act(async () => new Promise(r => setTimeout(r, 30)));
    const again = shown();
    act(() => root.unmount());
    expect([second?.includes('Body two'), card?.includes('Body one'), card?.includes('Second'), again?.includes('Body one')]).toEqual([true, true, false, true]);
  });
});
