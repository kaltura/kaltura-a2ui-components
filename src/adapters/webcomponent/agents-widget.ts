import { AgentsWidgetCore } from '../../core/agents-widget';
import { defineKalturaElement } from './define';

export const AGENTS_WIDGET_TAG = 'kaltura-agents-widget';

export function defineAgentsWidgetWebComponent(): void {
  defineKalturaElement(AGENTS_WIDGET_TAG, AgentsWidgetCore, null);
}
