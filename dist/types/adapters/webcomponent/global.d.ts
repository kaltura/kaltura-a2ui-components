import type { PlayerCoreProps } from '../../core/player.js';
import type { FlashcardsCoreProps } from '../../core/flashcards.js';
import type { MediaManagerCoreProps } from '../../core/media-manager.js';
import type { AnalyticsCoreProps } from '../../core/analytics.js';
import type { CaptionsEditorCoreProps } from '../../core/captions-editor.js';
import type { RecorderCoreProps } from '../../core/recorder.js';
import type { AvatarCoreProps } from '../../core/avatar.js';
import type { GenieCoreProps } from '../../core/genie.js';
import type { ContentLabCoreProps } from '../../core/content-lab.js';
import type { AgentsWidgetCoreProps } from '../../core/agents-widget.js';
import type { VodAvatarCoreProps } from '../../core/vod-avatar.js';
import type { ChartCoreProps } from '../../core/chart.js';
import type { KalturaActionContext } from '../../core/host-hooks.js';
/**
 * A Kaltura custom element. Set `config` to render it. Plain values only, no data bindings.
 * `action.event.name` is the name of the `kaltura-action` event.
 */
type KalturaElement<Props> = HTMLElement & {
    config: (Partial<Props> & {
        action?: {
            event: {
                name: string;
            };
        };
    }) | null;
};
declare global {
    interface Window {
        /** Set when the script runs as a classic `<script>`. It holds the host options and the definers. */
        KalturaA2UIWebComponents: typeof import('./host.js');
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
        'kaltura-action': CustomEvent<{
            name: string;
            context: KalturaActionContext;
        }>;
    }
}
export {};
//# sourceMappingURL=global.d.ts.map