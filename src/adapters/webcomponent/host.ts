// Everything the web component bundle gives a host: the definers, the tags and the host
// options. At runtime these are the keys of `window.KalturaA2UIWebComponents`.
//
// Each custom element is configured via a `.config` property set before the
// element is connected, then renders its core React component into itself.
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
 * Defines all Kaltura custom elements. Idempotent: each definer guards against
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

// Host option for private cloud or on-prem Unisphere hosts. Call it before the widgets load.
export { setExtraAllowedOrigins, getExtraAllowedOrigins } from '../../core/unisphere-loader';
// Host option: supplies the KS so it never goes through agent output. Call it before the widgets mount.
export { setKsProvider, type KsProvider, type KsWidget } from '../../core/ks';
// Host options: region, error and event handlers. Call them before the widgets mount. See docs/host-api.md.
export { setRegion, type KalturaRegion } from '../../core/region';
export { setAllowedPartners, setAllowedUiconfs, type AllowedIds } from '../../core/allowed-ids';
export {
  setErrorHandler,
  setEventHandler,
  toClientError,
  type KalturaClientError,
  type KalturaError,
  type KalturaErrorCode,
  type KalturaEvent,
  type KalturaActionContext,
  type KalturaWidget,
} from '../../core/host-hooks';
