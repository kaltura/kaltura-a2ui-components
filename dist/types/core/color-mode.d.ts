export type ColorMode = 'dark' | 'light';
/**
 * Which look the widgets use. The host's choice wins in this order:
 * `data-theme` on the root element, an `a2ui-dark` or `a2ui-light` class on
 * the root, the body or `from`'s ancestors, then `prefers-color-scheme`.
 * `fallback` applies only where the browser has no `matchMedia`.
 */
export declare function readColorMode(fallback: ColorMode, from?: Element | null): ColorMode;
//# sourceMappingURL=color-mode.d.ts.map