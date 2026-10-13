import { PLAYER_TAG, definePlayerWebComponent } from './player.js';
import { FLASHCARDS_TAG, defineFlashcardsWebComponent } from './flashcards.js';
import { MEDIA_MANAGER_TAG, defineMediaManagerWebComponent } from './media-manager.js';
import { ANALYTICS_TAG, defineAnalyticsWebComponent } from './analytics.js';
import { CAPTIONS_EDITOR_TAG, defineCaptionsEditorWebComponent } from './captions-editor.js';
import { RECORDER_TAG, defineRecorderWebComponent } from './recorder.js';
import { AVATAR_TAG, defineAvatarWebComponent } from './avatar.js';
import { GENIE_WIDGET_TAG, defineGenieWidgetWebComponent } from './genie.js';
import { CONTENT_LAB_TAG, defineContentLabWebComponent } from './content-lab.js';
import { AGENTS_WIDGET_TAG, defineAgentsWidgetWebComponent } from './agents-widget.js';
import { VOD_AVATAR_TAG, defineVodAvatarWebComponent } from './vod-avatar.js';
import { CHART_TAG, defineChartWebComponent } from './chart.js';
export declare const KALTURA_WC_TAGS: readonly ["kaltura-player", "kaltura-flashcards", "kaltura-media-manager", "kaltura-analytics", "kaltura-captions-editor", "kaltura-recorder", "kaltura-avatar", "kaltura-genie-widget", "kaltura-content-lab", "kaltura-agents-widget", "kaltura-vod-avatar-wc", "kaltura-chart"];
/**
 * Defines all Kaltura custom elements. Idempotent — each definer guards against
 * re-registration, so calling this more than once is safe.
 */
export declare function defineKalturaWebComponents(): void;
export { PLAYER_TAG, definePlayerWebComponent, FLASHCARDS_TAG, defineFlashcardsWebComponent, MEDIA_MANAGER_TAG, defineMediaManagerWebComponent, ANALYTICS_TAG, defineAnalyticsWebComponent, CAPTIONS_EDITOR_TAG, defineCaptionsEditorWebComponent, RECORDER_TAG, defineRecorderWebComponent, AVATAR_TAG, defineAvatarWebComponent, GENIE_WIDGET_TAG, defineGenieWidgetWebComponent, CONTENT_LAB_TAG, defineContentLabWebComponent, AGENTS_WIDGET_TAG, defineAgentsWidgetWebComponent, VOD_AVATAR_TAG, defineVodAvatarWebComponent, CHART_TAG, defineChartWebComponent, };
export { setExtraAllowedOrigins, getExtraAllowedOrigins } from '../../core/unisphere-loader.js';
export { setKsProvider, type KsProvider, type KsWidget } from '../../core/ks.js';
export { setRegion, type KalturaRegion } from '../../core/region.js';
export { setErrorHandler, setEventHandler, setPlayerSandbox, PLAYER_SANDBOX_PRESET, type KalturaError, type KalturaErrorCode, type KalturaEvent, type KalturaWidget, } from '../../core/host-hooks.js';
//# sourceMappingURL=index.d.ts.map