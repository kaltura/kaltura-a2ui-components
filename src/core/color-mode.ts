export type ColorMode = 'dark' | 'light';

/**
 * Which look the widgets use. The host's choice wins in this order:
 * `data-theme` on the root element, an `a2ui-dark` or `a2ui-light` class on
 * the root, the body or `from`'s ancestors, then `prefers-color-scheme`.
 * `fallback` applies only where the browser has no `matchMedia`.
 */
export function readColorMode(fallback: ColorMode, from?: Element | null): ColorMode {
  const root = document.documentElement;
  const attribute = root.getAttribute('data-theme');
  if (attribute === 'dark' || attribute === 'light') return attribute;
  const marked = (from ?? document.body ?? root).closest('.a2ui-dark, .a2ui-light') ?? root.closest('.a2ui-dark, .a2ui-light');
  if (marked) return marked.classList.contains('a2ui-dark') ? 'dark' : 'light';
  if (typeof matchMedia === 'function') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return fallback;
}
