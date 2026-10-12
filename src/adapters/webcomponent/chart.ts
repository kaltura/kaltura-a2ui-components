import { ChartCore } from '../../core/chart';
import { defineKalturaElement } from './define';

export const CHART_TAG = 'kaltura-chart';

export function defineChartWebComponent(): void {
  defineKalturaElement(CHART_TAG, ChartCore, null);
}
