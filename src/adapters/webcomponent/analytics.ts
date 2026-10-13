import { AnalyticsCore } from '../../core/analytics';
import { defineKalturaElement } from './define';

export const ANALYTICS_TAG = 'kaltura-analytics';

export function defineAnalyticsWebComponent(): void {
  defineKalturaElement(ANALYTICS_TAG, AnalyticsCore);
}
