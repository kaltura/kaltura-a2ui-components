import { GenieCore } from '../../core/genie';
import { defineKalturaElement } from './define';

export const GENIE_WIDGET_TAG = 'kaltura-genie-widget';

export function defineGenieWidgetWebComponent(): void {
  defineKalturaElement(GENIE_WIDGET_TAG, GenieCore, null);
}
