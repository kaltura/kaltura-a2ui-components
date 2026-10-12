// Covers: SEC-08 / QA-04 (Avatar SDK: `latest` URL, no SRI, id-keyed script
// tag breaks StrictMode and multi-instance).
// Turns green: plan item 1.9 (avatar).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AvatarWindow = Window & { KalturaAvatar?: { create: (cfg: unknown) => unknown } };
const win = window as AvatarWindow;

const roots: Root[] = [];
async function render(...children: ReturnType<typeof createElement>[]) {
  for (const child of children) {
    const root = createRoot(document.body.appendChild(document.createElement('div')));
    roots.push(root);
    await act(async () => root.render(child));
  }
}
const avatar = async (id: string) => createElement((await import('../../src/core/avatar')).AvatarCore, { avatarId: id });
const newCreate = () => vi.fn<(cfg: unknown) => unknown>();
const finishLoading = (create: ReturnType<typeof newCreate>) => {
  win.KalturaAvatar = { create };
  return act(async () => {
    document.querySelectorAll('script').forEach(s => s.dispatchEvent(new Event('load')));
  });
};

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  roots.splice(0).forEach(r => act(() => r.unmount()));
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete win.KalturaAvatar;
});

describe('SEC-08 / QA-04: AvatarCore SDK loading', () => {
  it('SEC-08: SDK script is pinned (not `latest`) and has integrity + crossorigin', async () => {
    await render(await avatar('av1'));
    const script = document.querySelector('script');
    expect([script?.src.includes('/latest/'), script?.hasAttribute('integrity'), script?.crossOrigin]).toEqual([
      false,
      true,
      'anonymous',
    ]);
  });

  it('QA-04: StrictMode creates the avatar exactly once after the SDK loads', async () => {
    const create = newCreate();
    await render(createElement(StrictMode, null, await avatar('av1')));
    await finishLoading(create);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('QA-04: two instances of the same avatar both initialise', async () => {
    const create = newCreate();
    await render(await avatar('same'), await avatar('same'));
    await finishLoading(create);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('QA-04: two different avatar ids add one SDK script tag', async () => {
    await render(await avatar('a'), await avatar('b'));
    expect(document.querySelectorAll('script').length).toBe(1);
  });
});
