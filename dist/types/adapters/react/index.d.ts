import '../../styles/components.css';
import { Catalog } from '@a2ui/web_core/v0_9';
import { type ReactComponentImplementation } from '@a2ui/react/v0_9';
import { kalturaPlayerReactImpl } from './player';
import { flashcardsReactImpl } from './flashcards';
import { mediaManagerReactImpl } from './media-manager';
import { kalturaClientFunctions } from '../../catalog/client-functions';
export declare const KALTURA_CATALOG_ID = "https://kaltura.github.io/a2ui/v1/catalog.json";
/**
 * The Kaltura Experience Component implementations, mirroring the backend
 * kaltura_catalog.json exactly. KalturaChart is absent until issue #45 ships
 * its backend schema.
 */
export declare const kalturaComponentImpls: ReactComponentImplementation[];
/**
 * Builds the merged Kaltura catalog: the basic catalog's components and
 * functions plus the Kaltura Experience Components and client functions.
 * Pass an explicit `id` to override the catalog id (defaults to the canonical
 * Kaltura catalog id).
 */
export declare function buildKalturaCatalog(id?: string): Catalog<ReactComponentImplementation>;
/**
 * Ready-to-register Kaltura catalog. Host clients pass this to a
 * MessageProcessor: `new MessageProcessor([kalturaReactCatalog, basicCatalog])`.
 */
export declare const kalturaReactCatalog: Catalog<ReactComponentImplementation>;
/**
 * Fetches a catalog descriptor from `url` and builds a Kaltura catalog keyed by
 * the fetched descriptor's `id` (falling back to the canonical id). The fetched
 * JSON is used only for its id and to validate availability — the component
 * implementations are always the locally-bundled ones, since A2UI clients never
 * load component code at runtime.
 */
export declare function loadKalturaCatalog(url: string): Promise<Catalog<ReactComponentImplementation>>;
export { kalturaClientFunctions };
export { kalturaPlayerReactImpl, flashcardsReactImpl, mediaManagerReactImpl };
export { PlayerCore, buildPlayerUrl, type PlayerCoreProps } from '../../core/player';
export { FlashcardsCore, buildClipUrl, buildAllCards, type FlashcardsCoreProps, type FlashCard, type Clip, } from '../../core/flashcards';
export { MediaManagerCore, deriveLoaderUrl, buildWorkspaceConfig, type MediaManagerCoreProps, } from '../../core/media-manager';
//# sourceMappingURL=index.d.ts.map