// The types of the `@kaltura/a2ui-react/webcomponent` entry. It points to dist/kaltura-wc.js,
// an IIFE script with no ES exports, so `scripts/finalize-types.mjs` makes the published
// `index.d.ts` import only this file. Use it as `import '@kaltura/a2ui-react/webcomponent'` for
// the types of the script tag you load: the global, the elements and their event.
import type { PlayerCoreProps } from '../../core/player';
import type { FlashcardsCoreProps } from '../../core/flashcards';
import type { MediaManagerCoreProps } from '../../core/media-manager';
import type { AnalyticsCoreProps } from '../../core/analytics';
import type { CaptionsEditorCoreProps } from '../../core/captions-editor';
import type { RecorderCoreProps } from '../../core/recorder';
import type { AvatarCoreProps } from '../../core/avatar';
import type { GenieCoreProps } from '../../core/genie';
import type { ContentLabCoreProps } from '../../core/content-lab';
import type { AgentsWidgetCoreProps } from '../../core/agents-widget';
import type { VodAvatarCoreProps } from '../../core/vod-avatar';
import type { ChartCoreProps } from '../../core/chart';
import type { KalturaActionContext } from '../../core/host-hooks';

/**
 * A Kaltura custom element. Set `config` to render it. Plain values only, no data bindings.
 * `action.event.name` is the name of the `kaltura-action` event.
 */
type KalturaElement<Props> = HTMLElement & { config: (Partial<Props> & { action?: { event: { name: string } } }) | null };

declare global {
  interface Window {
    /** Set when the script runs as a classic `<script>`. It holds the host options and the definers. */
    KalturaA2UIWebComponents: typeof import('./host');
  }

  interface HTMLElementTagNameMap {
    'kaltura-player': KalturaElement<PlayerCoreProps>;
    'kaltura-flashcards': KalturaElement<FlashcardsCoreProps>;
    'kaltura-media-manager': KalturaElement<MediaManagerCoreProps>;
    'kaltura-analytics': KalturaElement<AnalyticsCoreProps>;
    'kaltura-captions-editor': KalturaElement<CaptionsEditorCoreProps>;
    'kaltura-recorder': KalturaElement<RecorderCoreProps>;
    'kaltura-avatar': KalturaElement<AvatarCoreProps>;
    'kaltura-genie-widget': KalturaElement<GenieCoreProps>;
    'kaltura-content-lab': KalturaElement<ContentLabCoreProps>;
    'kaltura-agents-widget': KalturaElement<AgentsWidgetCoreProps>;
    'kaltura-vod-avatar-wc': KalturaElement<VodAvatarCoreProps>;
    'kaltura-chart': KalturaElement<ChartCoreProps>;
  }

  interface HTMLElementEventMap {
    /** Fires on an element whose `config.action` is `{ event: { name } }`, for each error and event. */
    'kaltura-action': CustomEvent<{ name: string; context: KalturaActionContext }>;
  }
}

export {};
