import { type KalturaWidget } from './host-hooks.js';
/**
 * Shows a load failure as plain text. Never builds markup from the message.
 * The error handler gets the message of a `KalturaFailure` only, never remote
 * error text.
 */
export declare function renderLoadError(container: HTMLElement, label: string, error: unknown, widget: KalturaWidget): void;
//# sourceMappingURL=render-load-error.d.ts.map