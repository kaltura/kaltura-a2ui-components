/** Shows a load failure as plain text. Never builds markup from the message. */
export function renderLoadError(container: HTMLElement, label: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const box = document.createElement('div');
  box.className = 'kaltura-load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `Failed to load ${label}: ${message}`;
  container.replaceChildren(box);
}
