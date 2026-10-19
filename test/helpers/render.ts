// Shared helpers for the security and lifecycle tests.
// Sets IS_REACT_ACT_ENVIRONMENT, mounts a component inside act(), and scans for unsafe DOM.
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { KS_QUIET_MS } from '../../src/core/ks';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots = new Set<Root>();

// Unmount every root a test mounted, so no React work runs after the jsdom teardown.
afterEach(async () => {
  await act(async () => {
    for (const root of roots) root.unmount();
  });
  roots.clear();
});

/** Waits out the quiet period after which a changed scope asks the provider again. */
export const afterQuietPeriod = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, KS_QUIET_MS + 50));
  });

export const PAYLOAD = '<img src=x onerror="window.__pwned=1">';

export async function mount(component: unknown, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: Root;
  await act(async () => {
    root = createRoot(container);
    roots.add(root);
    root.render(createElement(component as never, props as never));
  });
  // Let the rejected import() settle and the .catch handler run. A fixed delay
  // is too short on a busy CI runner, so wait until the DOM stops changing.
  let last = '';
  for (let stable = 0, waited = 0; stable < 3 && waited < 3000; waited += 25) {
    await act(async () => {
      await new Promise(r => setTimeout(r, 25));
    });
    stable = container.innerHTML === last && waited >= 50 ? stable + 1 : 0;
    last = container.innerHTML;
  }
  return { container, root };
}

/** Returns an array of unsafe things found anywhere under `el`. */
export function findUnsafe(el: Element): string[] {
  const out: string[] = [];
  for (const n of Array.from(el.querySelectorAll('*'))) {
    const tag = n.tagName.toLowerCase();
    if (['script', 'img', 'iframe', 'object', 'embed', 'svg', 'style', 'link'].includes(tag)) out.push(`<${tag}>`);
    for (const a of Array.from(n.attributes)) {
      if (/^on/i.test(a.name)) out.push(`<${tag} ${a.name}>`);
      if (/^\s*javascript:/i.test(a.value)) out.push(`<${tag} ${a.name}=javascript:>`);
    }
  }
  return out;
}
