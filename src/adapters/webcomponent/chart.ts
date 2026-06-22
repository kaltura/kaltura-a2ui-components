import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { ChartCoreProps } from '../../core/chart';
import { ChartCore } from '../../core/chart';

export const CHART_TAG = 'kaltura-chart';

export function defineChartWebComponent(): void {
  if (customElements.get(CHART_TAG)) return;
  customElements.define(
    CHART_TAG,
    class extends HTMLElement {
      config: ChartCoreProps | null = null;
      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(ChartCore, this.config));
      }
    },
  );
}
