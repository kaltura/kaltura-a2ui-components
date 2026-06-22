// Web-component adapter entry — SECONDARY path, for plain-HTML / non-A2UI hosts.
// Never the A2UI consumption path (that is adapters/react).
//
// Each custom element is configured via a `.config` property set before the
// element is connected, then renders its core React component into itself.

import '../../styles/components.css';
import { PLAYER_TAG, definePlayerWebComponent } from './player';
import { FLASHCARDS_TAG, defineFlashcardsWebComponent } from './flashcards';
import { MEDIA_MANAGER_TAG, defineMediaManagerWebComponent } from './media-manager';
import { ANALYTICS_TAG, defineAnalyticsWebComponent } from './analytics';
import { CAPTIONS_EDITOR_TAG, defineCaptionsEditorWebComponent } from './captions-editor';
import { RECORDER_TAG, defineRecorderWebComponent } from './recorder';
import { AVATAR_TAG, defineAvatarWebComponent } from './avatar';
import { GENIE_WIDGET_TAG, defineGenieWidgetWebComponent } from './genie';
import { CONTENT_LAB_TAG, defineContentLabWebComponent } from './content-lab';
import { AGENTS_WIDGET_TAG, defineAgentsWidgetWebComponent } from './agents-widget';
import { VOD_AVATAR_TAG, defineVodAvatarWebComponent } from './vod-avatar';
import { CHART_TAG, defineChartWebComponent } from './chart';

export const KALTURA_WC_TAGS = [
  PLAYER_TAG,
  FLASHCARDS_TAG,
  MEDIA_MANAGER_TAG,
  ANALYTICS_TAG,
  CAPTIONS_EDITOR_TAG,
  RECORDER_TAG,
  AVATAR_TAG,
  GENIE_WIDGET_TAG,
  CONTENT_LAB_TAG,
  AGENTS_WIDGET_TAG,
  VOD_AVATAR_TAG,
  CHART_TAG,
] as const;

/**
 * Defines all Kaltura custom elements. Idempotent — each definer guards against
 * re-registration, so calling this more than once is safe.
 */
export function defineKalturaWebComponents(): void {
  definePlayerWebComponent();
  defineFlashcardsWebComponent();
  defineMediaManagerWebComponent();
  defineAnalyticsWebComponent();
  defineCaptionsEditorWebComponent();
  defineRecorderWebComponent();
  defineAvatarWebComponent();
  defineGenieWidgetWebComponent();
  defineContentLabWebComponent();
  defineAgentsWidgetWebComponent();
  defineVodAvatarWebComponent();
  defineChartWebComponent();
}

export {
  PLAYER_TAG,
  definePlayerWebComponent,
  FLASHCARDS_TAG,
  defineFlashcardsWebComponent,
  MEDIA_MANAGER_TAG,
  defineMediaManagerWebComponent,
  ANALYTICS_TAG,
  defineAnalyticsWebComponent,
  CAPTIONS_EDITOR_TAG,
  defineCaptionsEditorWebComponent,
  RECORDER_TAG,
  defineRecorderWebComponent,
  AVATAR_TAG,
  defineAvatarWebComponent,
  GENIE_WIDGET_TAG,
  defineGenieWidgetWebComponent,
  CONTENT_LAB_TAG,
  defineContentLabWebComponent,
  AGENTS_WIDGET_TAG,
  defineAgentsWidgetWebComponent,
  VOD_AVATAR_TAG,
  defineVodAvatarWebComponent,
  CHART_TAG,
  defineChartWebComponent,
};

// Auto-define on import — the IIFE bundle is meant to be dropped into a page via
// a <script> tag, after which the custom elements are immediately usable.
defineKalturaWebComponents();
