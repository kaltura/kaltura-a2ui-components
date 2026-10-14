import { type KalturaReporter, type KalturaWidget } from './host-hooks.js';
/**
 * Shows a load failure as plain text. Never builds markup from the message.
 * The page and the error handler get the message of a `KalturaFailure` only.
 * Any other error is remote: the page shows `Failed to load <label>` and the
 * real error goes to `console.error`. `reporter` is the component's `ReporterContext`.
 */
export declare function renderLoadError(container: HTMLElement, label: string, error: unknown, widget: KalturaWidget, reporter?: KalturaReporter): void;
//# sourceMappingURL=render-load-error.d.ts.map