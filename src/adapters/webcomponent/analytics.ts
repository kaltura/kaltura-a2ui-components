import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { AnalyticsCoreProps } from '../../core/analytics';
import { AnalyticsCore } from '../../core/analytics';

export const ANALYTICS_TAG = 'kaltura-analytics';

export function defineAnalyticsWebComponent(): void {
  if (customElements.get(ANALYTICS_TAG)) return;

  class KalturaAnalyticsElement extends HTMLElement {
    config: Partial<AnalyticsCoreProps> = {};

    connectedCallback(): void {
      const root = createRoot(this);
      root.render(createElement(AnalyticsCore, this.config as AnalyticsCoreProps));
    }
  }

  customElements.define(ANALYTICS_TAG, KalturaAnalyticsElement);
}
