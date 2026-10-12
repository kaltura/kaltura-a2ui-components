import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { MediaManagerCoreProps } from '../../core/media-manager';
import { MediaManagerCore } from '../../core/media-manager';
import { StrictPendingContext } from '../../core/validate-props';

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
        root.render(createElement(StrictPendingContext.Provider, { value: true }, createElement(MediaManagerCore, this.config)));
      }
    },
  );
}
