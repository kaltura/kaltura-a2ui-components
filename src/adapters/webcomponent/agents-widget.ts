import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { AgentsWidgetCoreProps } from '../../core/agents-widget';
import { AgentsWidgetCore } from '../../core/agents-widget';
import { StrictPendingContext } from '../../core/validate-props';

export const AGENTS_WIDGET_TAG = 'kaltura-agents-widget';

export function defineAgentsWidgetWebComponent(): void {
  if (customElements.get(AGENTS_WIDGET_TAG)) return;

  customElements.define(
    AGENTS_WIDGET_TAG,
    class extends HTMLElement {
      config: AgentsWidgetCoreProps | null = null;

      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(StrictPendingContext.Provider, { value: true }, createElement(AgentsWidgetCore, this.config)));
      }
    },
  );
}
