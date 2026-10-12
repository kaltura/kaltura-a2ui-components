// Covers: SEC-08 / QA-04 (avatar SDK loader) and the innerHTML error sink.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { AvatarCoreProps } from '../../src/core/avatar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AvatarWindow = Window & { KalturaAvatar?: { create: (cfg: unknown) => unknown } };
const win = window as AvatarWindow;
const SRC = 'https://example.test/sdk-one.js';

type AvatarModule = typeof import('../../src/core/avatar');
let loadScriptOnce: AvatarModule['loadScriptOnce'];
let AvatarCore: AvatarModule['AvatarCore'];
let root: Root | undefined;
let host: HTMLElement;
const mount = (props: AvatarCoreProps) =>
  act(async () => root!.render(createElement(AvatarCore, props)));
const fire = (type: 'load' | 'error') =>
  act(async () => {
    document.querySelectorAll('script').forEach(s => s.dispatchEvent(new Event(type)));
  });

beforeEach(async () => {
  vi.resetModules();
  ({ loadScriptOnce, AvatarCore } = await import('../../src/core/avatar'));
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete win.KalturaAvatar;
});

describe('SEC-08: loadScriptOnce', () => {
  it('SEC-08: sets crossorigin=anonymous', () => {
    void loadScriptOnce(`${SRC}?a`);
    expect(document.querySelector('script')?.crossOrigin).toBe('anonymous');
  });

  it('SEC-08: sets the integrity attribute when one is given', () => {
    void loadScriptOnce(`${SRC}?b`, 'sha384-test');
    expect(document.querySelector('script')?.getAttribute('integrity')).toBe('sha384-test');
  });

  it('QA-04: the same URL gives one tag and one shared promise', () => {
    const first = loadScriptOnce(`${SRC}?c`);
    const second = loadScriptOnce(`${SRC}?c`);
    expect([first === second, document.querySelectorAll('script').length]).toEqual([true, 1]);
  });

  it('QA-04: a failed load removes the tag so a retry adds a new one', async () => {
    const failed = loadScriptOnce(`${SRC}?d`);
    document.querySelector('script')?.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow();
    void loadScriptOnce(`${SRC}?d`);
    expect(document.querySelectorAll('script').length).toBe(1);
  });
});

describe('SEC-08 / QA-04: AvatarCore', () => {
  it('SEC-08: a load error shows plain text, never markup', async () => {
    await mount({ avatarId: 'x' });
    await fire('error');
    const box = host.querySelector('.kaltura-load-error');
    expect([box?.children.length, box?.textContent]).toEqual([0, expect.stringContaining('avatar SDK')]);
  });

  it('QA-04: changing language re-initialises the avatar with the new value', async () => {
    const create = vi.fn<(cfg: unknown) => unknown>();
    win.KalturaAvatar = { create };
    await mount({ avatarId: 'x', language: 'en' });
    await fire('load');
    await mount({ avatarId: 'x', language: 'fr' });
    expect(create.mock.calls.map(c => (c[0] as { language: string }).language)).toEqual(['en', 'fr']);
  });

  it('QA-04: unmount before the SDK loads does not initialise', async () => {
    const create = vi.fn<(cfg: unknown) => unknown>();
    win.KalturaAvatar = { create };
    await mount({ avatarId: 'x' });
    await act(async () => root!.unmount());
    root = createRoot(host);
    await fire('load');
    expect(create).not.toHaveBeenCalled();
  });
});
