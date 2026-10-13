import { Catalog } from '@a2ui/web_core/v0_9';
import { type ReactComponentImplementation } from '@a2ui/react/v0_9';
import { kalturaPlayerReactImpl } from './player.js';
import { flashcardsReactImpl } from './flashcards.js';
import { mediaManagerReactImpl } from './media-manager.js';
import { analyticsReactImpl } from './analytics.js';
import { captionsEditorReactImpl } from './captions-editor.js';
import { recorderReactImpl } from './recorder.js';
import { avatarReactImpl } from './avatar.js';
import { genieReactImpl } from './genie.js';
import { contentLabReactImpl } from './content-lab.js';
import { agentsWidgetReactImpl } from './agents-widget.js';
import { vodAvatarReactImpl } from './vod-avatar.js';
import { chartReactImpl } from './chart.js';
import { kalturaClientFunctions } from '../../catalog/client-functions.js';
export declare const KALTURA_CATALOG_ID = "https://kaltura.github.io/a2ui/v1/catalog.json";
export declare const kalturaComponentImpls: ReactComponentImplementation[];
/**
 * Builds the merged Kaltura catalog: the basic catalog's components and
 * functions plus the Kaltura Experience Components and client functions.
 * The basic Image, Video and AudioPlayer load only Kaltura or
 * `setExtraMediaOrigins` URLs, and basic Text markdown shows only Kaltura
 * images. Pass an explicit `id` to override the catalog id (defaults to the
 * canonical Kaltura catalog id). To keep the basic catalog id for older
 * agents, register `buildKalturaCatalog(basicCatalog.id)` in place of
 * `basicCatalog`.
 */
export declare function buildKalturaCatalog(id?: string): Catalog<ReactComponentImplementation>;
/**
 * Ready-to-register Kaltura catalog. Register it alone:
 * `new MessageProcessor([kalturaReactCatalog])`. It already holds the guarded
 * basic components, so do not register `basicCatalog` next to it.
 */
export declare const kalturaReactCatalog: Catalog<ReactComponentImplementation>;
/**
 * Fetches a catalog descriptor from `url` and builds a Kaltura catalog keyed by
 * the fetched descriptor's `catalogId` (then `$id`, then the canonical id). The fetched
 * JSON is used only for its id and to validate availability — the component
 * implementations are always the locally-bundled ones, since A2UI clients never
 * load component code at runtime.
 */
export declare function loadKalturaCatalog(url: string): Promise<Catalog<ReactComponentImplementation>>;
export { kalturaClientFunctions };
export { kalturaPlayerReactImpl, flashcardsReactImpl, mediaManagerReactImpl, analyticsReactImpl, captionsEditorReactImpl, recorderReactImpl, avatarReactImpl, genieReactImpl, contentLabReactImpl, agentsWidgetReactImpl, vodAvatarReactImpl, chartReactImpl, };
export { PlayerCore, buildPlayerUrl, type PlayerCoreProps } from '../../core/player.js';
export { FlashcardsCore, buildClipUrl, buildAllCards, type FlashcardsCoreProps, type FlashCard, type Clip, } from '../../core/flashcards.js';
export { MediaManagerCore, deriveLoaderUrl, buildWorkspaceConfig, type MediaManagerCoreProps, } from '../../core/media-manager.js';
export { UnisphereWidgetCore, type UnisphereWidgetCoreProps } from '../../core/unisphere-widget.js';
export { setExtraAllowedOrigins, getExtraAllowedOrigins } from '../../core/unisphere-loader.js';
export { setKsProvider, type KsProvider, type KsWidget } from '../../core/ks.js';
export { setExtraMediaOrigins } from '../../core/media-url.js';
export { setRegion, type KalturaRegion } from '../../core/region.js';
export { setErrorHandler, setEventHandler, type KalturaError, type KalturaErrorCode, type KalturaEvent, type KalturaWidget, } from '../../core/host-hooks.js';
export { AnalyticsCore, buildAnalyticsUrl, type AnalyticsCoreProps } from '../../core/analytics.js';
export { CaptionsEditorCore, buildCaptionsEditorUrl, type CaptionsEditorCoreProps } from '../../core/captions-editor.js';
export { RecorderCore, type RecorderCoreProps } from '../../core/recorder.js';
export { AvatarCore, type AvatarCoreProps } from '../../core/avatar.js';
export { GenieCore, type GenieCoreProps } from '../../core/genie.js';
export { ContentLabCore, type ContentLabCoreProps } from '../../core/content-lab.js';
export { AgentsWidgetCore, type AgentsWidgetCoreProps } from '../../core/agents-widget.js';
export { VodAvatarCore, type VodAvatarCoreProps } from '../../core/vod-avatar.js';
export { ChartCore, type ChartCoreProps, type ChartType, type ChartAnnotation } from '../../core/chart.js';
//# sourceMappingURL=index.d.ts.map