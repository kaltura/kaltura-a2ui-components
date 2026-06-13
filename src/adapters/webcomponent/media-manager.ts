import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { MediaManagerCoreProps } from '../../core/media-manager';
import { MediaManagerCore } from '../../core/media-manager';

export const MEDIA_MANAGER_TAG = 'kaltura-media-manager';

export function defineMediaManagerWebComponent(): void {
  if (customElements.get(MEDIA_MANAGER_TAG)) return;

  customElements.define(
    MEDIA_MANAGER_TAG,
    class extends HTMLElement {
      config: MediaManagerCoreProps | null = null;

      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(MediaManagerCore, this.config));
      }
    },
  );
}
