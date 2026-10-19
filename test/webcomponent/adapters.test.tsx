// Covers: QA-18 (every web component adapter has a happy render, a hostile
// input case and an unmount cleanup case).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { CASES, installRemote, remote, resetFakes, settle, expectInert } from '../components/cases';

vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

type KalturaElement = HTMLElement & { config: unknown };
const create = (tag: string) => document.createElement(tag) as KalturaElement;
const attach = (el: Element) => act(async () => void document.body.appendChild(el));
const detach = (el: Element) => act(async () => el.remove());

let errors: ReturnType<typeof vi.spyOn>;
let uncaught: unknown[];
const onError = (e: ErrorEvent) => uncaught.push(e.error);

beforeAll(async () => {
  installRemote();
  await import('../../src/adapters/webcomponent/index');
});
beforeEach(() => {
  resetFakes();
  uncaught = [];
  window.addEventListener('error', onError);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  window.removeEventListener('error', onError);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('QA-18: the table covers exactly the tags the bundle defines', async () => {
  const { KALTURA_WC_TAGS } = await import('../../src/adapters/webcomponent/index');
  expect(CASES.map(c => c.tag).sort()).toEqual([...KALTURA_WC_TAGS].sort());
});

describe.each(CASES)('QA-18: <$tag>', c => {
  it(`QA-18: <${c.tag}> renders its happy path from config`, async () => {
    const el = create(c.tag);
    el.config = c.valid;
    await attach(el);
    await settle();
    c.happy(el);
    c.effect?.();
  });

  it(`QA-18: <${c.tag}> shows a plain-text alert for an invalid config`, async () => {
    const el = create(c.tag);
    el.config = c.invalid;
    await attach(el);
    await settle();
    expect([el.querySelectorAll('[role="alert"]').length, el.querySelector('iframe')]).toEqual([1, null]);
    expect(remote.log).toEqual([]);
  });

  it(`QA-18: <${c.tag}> keeps a hostile config inert`, async () => {
    const el = create(c.tag);
    el.config = c.hostile;
    await attach(el);
    await settle();
    expectInert(el);
  });

  it.each([[null], [[]]])(`QA-18: <${c.tag}> survives config %j`, async garbage => {
    const el = create(c.tag);
    el.config = garbage;
    await attach(el);
    await settle();
    expect(uncaught).toEqual([]);
  });

  it(`QA-18: <${c.tag}> cleans up when removed`, async () => {
    const el = create(c.tag);
    el.config = c.valid;
    await attach(el);
    await settle();
    const wrapper = el.firstElementChild!;
    await detach(el);
    await settle();
    expect([el.innerHTML, errors.mock.calls.length, uncaught]).toEqual(['', 0, []]);
    if (c.clearsWrapper) expect(wrapper.childElementCount).toBe(0);
    c.afterUnmount?.();
  });
});

describe('QA-18: non-object config', () => {
  const thrownInMicrotask = () => {
    const thrown: unknown[] = [];
    const real = globalThis.queueMicrotask;
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb =>
      real(() => {
        try {
          cb();
        } catch (e) {
          thrown.push(e);
        }
      }),
    );
    return thrown;
  };

  it.each([['text'], [42], [true], [null], [[]], [['a']]])(
    'QA-18: a config of %j shows the plain-text alert and does not throw',
    async garbage => {
      const thrown = thrownInMicrotask();
      const el = create('kaltura-flashcards');
      el.config = garbage;
      await attach(el);
      await settle();
      expect([thrown, uncaught, el.querySelectorAll('[role="alert"]').length]).toEqual([[], [], 1]);
    },
  );

  it.each([['text'], [42]])('QA-18: a config of %j on an element without defaults shows the alert', async garbage => {
    const el = create('kaltura-chart');
    el.config = garbage;
    await attach(el);
    await settle();
    expect(el.querySelectorAll('[role="alert"]').length).toBe(1);
  });

  it('QA-18: a null config on an element without defaults renders nothing', async () => {
    const el = create('kaltura-chart');
    el.config = null;
    await attach(el);
    await settle();
    expect(el.childElementCount).toBe(0);
  });
});
