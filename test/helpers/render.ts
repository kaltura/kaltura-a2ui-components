// Shared helpers for security and probe tests.
// Sets IS_REACT_ACT_ENVIRONMENT, mounts a component inside act(), and scans for unsafe DOM.
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export const PAYLOAD = '<img src=x onerror="window.__pwned=1">';

export async function mount(component: unknown, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: Root;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(component as never, props as never));
  });
  // let the rejected import() settle and the .catch handler run
  await act(async () => {
    await new Promise(r => setTimeout(r, 50));
  });
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
