import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { GenieCoreProps } from '../../core/genie';
import { GenieCore } from '../../core/genie';
import { StrictPendingContext } from '../../core/validate-props';

export const GENIE_WIDGET_TAG = 'kaltura-genie-widget';

export function defineGenieWidgetWebComponent(): void {
  if (customElements.get(GENIE_WIDGET_TAG)) return;

  customElements.define(
    GENIE_WIDGET_TAG,
    class extends HTMLElement {
      config: GenieCoreProps | null = null;

      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(StrictPendingContext.Provider, { value: true }, createElement(GenieCore, this.config)));
      }
    },
  );
}
