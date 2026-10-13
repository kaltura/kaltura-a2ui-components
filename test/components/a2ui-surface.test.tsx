// Covers: QA-18 (every React adapter implementation renders through a real
// A2UI surface: happy path, hostile input, unmount cleanup). Green since plan item 2.12.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react/v0_9';
import { CASES, installRemote, remote, resetFakes, settle, expectInert, type Case } from './cases';

vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

let kalturaReactCatalog: typeof import('../../src/adapters/react/index').kalturaReactCatalog;
let catalogId: string;
let root: Root;
let host: HTMLElement;
let errors: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  installRemote();
  const adapter = await import('../../src/adapters/react/index');
  kalturaReactCatalog = adapter.kalturaReactCatalog;
  catalogId = adapter.KALTURA_CATALOG_ID;
});
beforeEach(() => {
  resetFakes();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function surface(c: Case, props: Record<string, unknown>) {
  const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog]);
  // The A2UI schema check may refuse a bad shape before anything mounts.
  try {
    processor.processMessages([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: c.component, ...props }] } },
    ] as never);
  } catch (e) {
    return (e as Error).name;
  }
  const model = processor.model.getSurface('s')!;
  await act(async () => root.render(createElement(A2uiSurface, { surface: model })));
  await settle();
  return 'mounted';
}

describe.each(CASES)('QA-18: A2UI $component', c => {
  it(`QA-18: ${c.component} renders its happy path in a surface`, async () => {
    await surface(c, c.valid);
    c.happy(host);
    c.effect?.();
  });

  it(`QA-18: ${c.component} shows a plain-text alert for invalid props`, async () => {
    const outcome = await surface(c, c.invalid);
    // Either the processor refuses the shape (nothing mounts) or the core shows one alert.
    expect(
      outcome === 'A2uiValidationError'
        ? host.innerHTML
        : [host.querySelectorAll('[role="alert"]').length, host.querySelector('iframe')],
    ).toEqual(outcome === 'A2uiValidationError' ? '' : [1, null]);
    expect(remote.log).toEqual([]);
  });

  it(`QA-18: ${c.component} keeps hostile props inert`, async () => {
    await surface(c, c.hostile);
    expectInert(host);
  });

  it(`QA-18: ${c.component} cleans up when the surface unmounts`, async () => {
    await surface(c, c.valid);
    const wrapper = host.querySelector('[class^="kaltura-"][class$="-container"]')!;
    await act(async () => root.unmount());
    await settle();
    root = createRoot(host);
    expect([host.innerHTML, errors.mock.calls.length]).toEqual(['', 0]);
    if (c.clearsWrapper) expect(wrapper.childElementCount).toBe(0);
    c.afterUnmount?.();
  });
});
