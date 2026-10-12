import { KalturaFailure, reportError, type KalturaWidget } from './host-hooks';

/**
 * Shows a load failure as plain text. Never builds markup from the message.
 * The error handler gets the message of a `KalturaFailure` only, never remote
 * error text.
 */
export function renderLoadError(container: HTMLElement, label: string, error: unknown, widget: KalturaWidget): void {
  const message = error instanceof Error ? error.message : String(error);
  const box = document.createElement('div');
  box.className = 'kaltura-load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `Failed to load ${label}: ${message}`;
  container.replaceChildren(box);
  if (error instanceof KalturaFailure) reportError(error.code, widget, box.textContent);
  else reportError('load-failed', widget, `Failed to load ${label}`);
}
