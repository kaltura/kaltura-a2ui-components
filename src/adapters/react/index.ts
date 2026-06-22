// React adapter entry — the ONLY A2UI integration path for this package.
//
// Host apps register the exported catalog via
//   new MessageProcessor([kalturaReactCatalog, basicCatalog])
// — NOT as a prop on A2uiSurface (verified against installed SDK source).

import '../../styles/components.css';
import { Catalog } from '@a2ui/web_core/v0_9';
import { basicCatalog, type ReactComponentImplementation } from '@a2ui/react/v0_9';
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
import { kalturaClientFunctions } from '../../catalog/client-functions';

export const KALTURA_CATALOG_ID = 'https://kaltura.github.io/a2ui/v1/catalog.json';

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
 * Pass an explicit `id` to override the catalog id (defaults to the canonical
 * Kaltura catalog id).
 */
export function buildKalturaCatalog(
  id: string = KALTURA_CATALOG_ID,
): Catalog<ReactComponentImplementation> {
  return new Catalog<ReactComponentImplementation>(
    id,
    [...basicCatalog.components.values(), ...kalturaComponentImpls],
    [...basicCatalog.functions.values(), ...kalturaClientFunctions],
  );
}

/**
 * Ready-to-register Kaltura catalog. Host clients pass this to a
 * MessageProcessor: `new MessageProcessor([kalturaReactCatalog, basicCatalog])`.
 */
export const kalturaReactCatalog: Catalog<ReactComponentImplementation> = buildKalturaCatalog();

/**
 * Fetches a catalog descriptor from `url` and builds a Kaltura catalog keyed by
 * the fetched descriptor's `id` (falling back to the canonical id). The fetched
 * JSON is used only for its id and to validate availability — the component
 * implementations are always the locally-bundled ones, since A2UI clients never
 * load component code at runtime.
 */
export async function loadKalturaCatalog(
  url: string,
): Promise<Catalog<ReactComponentImplementation>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load catalog from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const descriptor = (await response.json()) as { id?: string };
  return buildKalturaCatalog(descriptor.id ?? KALTURA_CATALOG_ID);
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
export { PlayerCore, buildPlayerUrl, type PlayerCoreProps } from '../../core/player';
export {
  FlashcardsCore,
  buildClipUrl,
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
export { AnalyticsCore, buildAnalyticsUrl, type AnalyticsCoreProps } from '../../core/analytics';
export { CaptionsEditorCore, type CaptionsEditorCoreProps } from '../../core/captions-editor';
export { RecorderCore, type RecorderCoreProps } from '../../core/recorder';
export { AvatarCore, type AvatarCoreProps } from '../../core/avatar';
export { GenieCore, type GenieCoreProps } from '../../core/genie';
export { ContentLabCore, type ContentLabCoreProps } from '../../core/content-lab';
export { AgentsWidgetCore, type AgentsWidgetCoreProps } from '../../core/agents-widget';
export { VodAvatarCore, type VodAvatarCoreProps } from '../../core/vod-avatar';
export { ChartCore, type ChartCoreProps, type ChartType, type ChartAnnotation } from '../../core/chart';
