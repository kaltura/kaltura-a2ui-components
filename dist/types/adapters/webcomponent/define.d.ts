import { type ComponentType } from 'react';
/**
 * Defines a custom element that renders `Core` from its `config` property.
 * One React root per element: created on connect, unmounted on disconnect.
 * Setting `config` at any time re-renders. With `initial` null, nothing renders
 * until `config` is set. A `config` that is not a plain object (text, number,
 * array) counts as empty props, so the element shows its plain-text error.
 * The unmount waits one microtask, so moving the element keeps its widget.
 * Idempotent.
 */
export declare function defineKalturaElement<P extends object>(tag: string, Core: ComponentType<P>, initial?: Partial<P> | null): void;
//# sourceMappingURL=define.d.ts.map