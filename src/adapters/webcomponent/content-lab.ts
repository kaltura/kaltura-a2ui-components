import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { ContentLabCoreProps } from '../../core/content-lab';
import { ContentLabCore } from '../../core/content-lab';
import { StrictPendingContext } from '../../core/validate-props';

export const CONTENT_LAB_TAG = 'kaltura-content-lab';

export function defineContentLabWebComponent(): void {
  if (customElements.get(CONTENT_LAB_TAG)) return;

  customElements.define(
    CONTENT_LAB_TAG,
    class extends HTMLElement {
      config: ContentLabCoreProps | null = null;

      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(StrictPendingContext.Provider, { value: true }, createElement(ContentLabCore, this.config)));
      }
    },
  );
}
