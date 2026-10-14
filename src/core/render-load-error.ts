import { KalturaFailure, reportError, type KalturaReporter, type KalturaWidget } from './host-hooks';

/**
 * Shows a load failure as plain text. Never builds markup from the message.
 * The page and the error handler get the message of a `KalturaFailure` only.
 * Any other error is remote: the page shows `Failed to load <label>` and the
 * real error goes to `console.error`. `reporter` is the component's `ReporterContext`.
 */
export function renderLoadError(container: HTMLElement, label: string, error: unknown, widget: KalturaWidget, reporter?: KalturaReporter): void {
  const box = document.createElement('div');
  box.className = 'kaltura-load-error';
  box.setAttribute('role', 'alert');
  const failure = error instanceof KalturaFailure ? error : undefined;
  box.textContent = `Failed to load ${label}${failure ? `: ${failure.message}` : ''}`;
  container.replaceChildren(box);
  if (failure) return reportError(failure.code, widget, box.textContent, reporter, failure.invalidProps);
  console.error(box.textContent, error);
  reportError('load-failed', widget, box.textContent, reporter);
}
