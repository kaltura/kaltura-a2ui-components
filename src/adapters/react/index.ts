// React adapter entry: the ONLY A2UI integration path for this package.
//
// Host apps register ONLY the Kaltura catalog, which already holds the guarded
// basic components, on a MessageProcessor, not as a prop on A2uiSurface:
//   new MessageProcessor([kalturaReactCatalog])

// Must stay the first import, so it runs before @a2ui/react loads (a2ui#3158).
import { removeHtmlElementStub } from './html-element-stub';
import '../../styles/components.css';
import { Catalog } from '@a2ui/web_core/v0_9';
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog';
import type { ReactCatalogComponent, ReactComponentImplementation } from '@a2ui/react/v0_9';
import { kalturaPlayerReactImpl } from './player';
import { flashcardsReactImpl } from './flashcards';
import { mediaManagerReactImpl } from './media-manager';
import { analyticsReactImpl } from './analytics';
import { captionsEditorReactImpl } from './captions-editor';
import { recorderReactImpl } from './recorder';
import { avatarReactImpl } from './avatar';
import { genieReactImpl } from './genie';
import { contentLabReactImpl } from './content-lab';
import { agentsWidgetReactImpl } from './agents-widget';
import { vodAvatarReactImpl } from './vod-avatar';
import { chartReactImpl } from './chart';
import { kalturaClientFunctions, SafeOpenUrlImplementation } from '../../catalog/client-functions';
import { guardBasic } from './basic-media';

// Every import above has run, so @a2ui/react has loaded.
removeHtmlElementStub();

/**
 * The catalog id the agent puts in `createSurface`.
 * @example { createSurface: { surfaceId: 's1', catalogId: KALTURA_CATALOG_ID } }
 */
export const KALTURA_CATALOG_ID = 'https://kaltura.github.io/a2ui/v2/catalog.json';

// basicCatalog is the host's own copy (a peer), and 0.1.x told hosts to
// register it next to ours. Guard it in place, so an agent that picks it by
// id gets the same checks.
const guardedBasics = [...basicCatalog.components.values()].map(guardBasic);
if (basicCatalog.components instanceof Map) for (const impl of guardedBasics) basicCatalog.components.set(impl.name, impl);

export const kalturaComponentImpls: ReactComponentImplementation[] = [
  kalturaPlayerReactImpl,
  flashcardsReactImpl,
  mediaManagerReactImpl,
  analyticsReactImpl,
  captionsEditorReactImpl,
  recorderReactImpl,
  avatarReactImpl,
  genieReactImpl,
  contentLabReactImpl,
  agentsWidgetReactImpl,
  vodAvatarReactImpl,
  chartReactImpl,
];

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
export function buildKalturaCatalog(
  id: string = KALTURA_CATALOG_ID,
): Catalog<ReactCatalogComponent> {
  return new Catalog<ReactCatalogComponent>(
    id,
    'v0.9',
    [...guardedBasics, ...kalturaComponentImpls],
    // Later entries win, so the safe openUrl replaces the basic one.
    [...basicCatalog.functions.values(), ...kalturaClientFunctions, SafeOpenUrlImplementation],
    // The catalog JSON theme is the basic one.
    basicCatalog.themeSchema,
  );
}

/**
 * Ready-to-register Kaltura catalog. Register it alone:
 * `new MessageProcessor([kalturaReactCatalog])`. It already holds the guarded
 * basic components, so do not register `basicCatalog` next to it.
 */
export const kalturaReactCatalog: Catalog<ReactCatalogComponent> = buildKalturaCatalog();

/**
 * Reads only the id (`catalogId`, then `$id`, then the canonical id) from the
 * descriptor at `url` and builds a Kaltura catalog with it. The components are
 * always the ones in this bundle, because A2UI clients never load component
 * code at runtime.
 * @example const catalog = await loadKalturaCatalog('/catalog.json');
 */
export async function loadKalturaCatalog(
  url: string,
): Promise<Catalog<ReactCatalogComponent>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load catalog from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const descriptor = (await response.json()) as { catalogId?: string; $id?: string };
  return buildKalturaCatalog(descriptor.catalogId ?? descriptor.$id ?? KALTURA_CATALOG_ID);
}

export { kalturaClientFunctions };
export {
  kalturaPlayerReactImpl,
  flashcardsReactImpl,
  mediaManagerReactImpl,
  analyticsReactImpl,
  captionsEditorReactImpl,
  recorderReactImpl,
  avatarReactImpl,
  genieReactImpl,
  contentLabReactImpl,
  agentsWidgetReactImpl,
  vodAvatarReactImpl,
  chartReactImpl,
};
export { PlayerCore, type PlayerCoreProps } from '../../core/player';
export {
  FlashcardsCore,
  buildAllCards,
  type FlashcardsCoreProps,
  type FlashCard,
  type Clip,
} from '../../core/flashcards';
export {
  MediaManagerCore,
  deriveLoaderUrl,
  buildWorkspaceConfig,
  type MediaManagerCoreProps,
} from '../../core/media-manager';
export { UnisphereWidgetCore, type UnisphereWidgetCoreProps } from '../../core/unisphere-widget';
// Host option only. Never call this from agent output.
export { setExtraAllowedOrigins, getExtraAllowedOrigins } from '../../core/unisphere-loader';
export { setKsProvider, type KsProvider, type KsWidget } from '../../core/ks';
// Host options. Never call these from agent output. See docs/host-api.md.
export { setExtraMediaOrigins } from '../../core/media-url';
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
export { AnalyticsCore, buildAnalyticsUrl, type AnalyticsCoreProps } from '../../core/analytics';
export { CaptionsEditorCore, type CaptionsEditorCoreProps } from '../../core/captions-editor';
export { RecorderCore, type RecorderCoreProps } from '../../core/recorder';
export { AvatarCore, type AvatarCoreProps } from '../../core/avatar';
export { GenieCore, type GenieCoreProps } from '../../core/genie';
export { ContentLabCore, type ContentLabCoreProps } from '../../core/content-lab';
export { AgentsWidgetCore, type AgentsWidgetCoreProps } from '../../core/agents-widget';
export { VodAvatarCore, type VodAvatarCoreProps } from '../../core/vod-avatar';
export { ChartCore, type ChartCoreProps, type ChartType, type ChartAnnotation } from '../../core/chart';
