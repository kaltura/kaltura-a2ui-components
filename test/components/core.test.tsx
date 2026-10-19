// Covers: QA-18 (every core component has a happy render, a hostile input
// case and an unmount cleanup case).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CASES, PAYLOAD, installRemote, remote, resetFakes, settle, expectInert, type Case } from './cases';

// The first import of a core loads its libraries, which is slow on a busy machine.
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

let root: Root;
let host: HTMLElement;
let errors: ReturnType<typeof vi.spyOn>;

beforeAll(() => installRemote());
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

async function mount(c: Case, props: Record<string, unknown>) {
  const Core = await c.load();
  await act(async () => root.render(createElement(Core, props as never)));
  await settle();
}

describe.each(CASES)('QA-18: $name core', c => {
  it(`QA-18: ${c.name} renders its happy path`, async () => {
    await mount(c, c.valid);
    c.happy(host);
    c.effect?.();
  });

  it(`QA-18: ${c.name} shows a plain-text alert for invalid props`, async () => {
    await mount(c, c.invalid);
    const alerts = host.querySelectorAll('[role="alert"]');
    expect([alerts.length, alerts[0]?.textContent?.startsWith('Failed to load'), host.querySelector('iframe')]).toEqual([1, true, null]);
    expectInert(host);
    expect(remote.log).toEqual([]);
  });

  it(`QA-18: ${c.name} keeps hostile text inert`, async () => {
    await mount(c, c.hostile);
    expectInert(host);
  });

  it(`QA-18: ${c.name} cleans up on unmount`, async () => {
    await mount(c, c.valid);
    const wrapper = host.firstElementChild!;
    await act(async () => root.unmount());
    await settle();
    root = createRoot(host);
    expect([host.innerHTML, errors.mock.calls.length]).toEqual(['', 0]);
    if (c.clearsWrapper) expect(wrapper.childElementCount).toBe(0);
    c.afterUnmount?.();
  });
});

describe.each(CASES.filter(c => c.remoteFailure))('QA-18: $name remote failure', c => {
  it(`QA-18: ${c.name} shows fixed text and logs the remote error`, async () => {
    remote.failWith = PAYLOAD;
    await mount(c, c.valid);
    const box = host.querySelector('[role="alert"]');
    expect([box?.children.length, box?.textContent?.includes(PAYLOAD), errors.mock.calls.flat().map(String).join().includes(PAYLOAD)]).toEqual([0, false, true]);
    expectInert(host);
  });
});
