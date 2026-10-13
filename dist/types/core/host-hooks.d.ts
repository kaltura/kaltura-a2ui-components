import type { KsWidget } from './ks.js';
/** Why a widget did not render. See docs/host-api.md. */
export type KalturaErrorCode = 'invalid-props' | 'invalid-ks' | 'origin-not-allowed' | 'load-failed' | 'url-rejected' | 'render-failed';
/** The widget that reports. `unisphere` is a `UnisphereWidgetCore` used without a `widget` prop. */
export type KalturaWidget = KsWidget | 'flashcards' | 'chart' | 'image' | 'video' | 'audio-player' | 'unisphere';
/**
 * `message` is fixed text plus prop names from the schema. It never holds a
 * prop value, a remote error text or the KS.
 */
export interface KalturaError {
    code: KalturaErrorCode;
    widget: KalturaWidget;
    message: string;
}
/** A widget event. See docs/host-api.md. */
export type KalturaEvent = {
    type: 'entry-selected';
    widget: 'media-manager';
    detail: {
        entryId: string;
        name: string;
        instanceId: string;
        entries?: Array<{
            entryId: string;
            name: string;
        }>;
    };
} | {
    /** The avatar session ended. `reason` is a name such as `ConversationEnded`, or `UnknownReason`. */
    type: 'avatar-disconnected';
    widget: 'avatar';
    detail: {
        reason: string;
        instanceId: string;
    };
};
/** An error whose message is fixed text, safe to show and report. */
export declare class KalturaFailure extends Error {
    readonly code: KalturaErrorCode;
    constructor(code: KalturaErrorCode, message: string);
}
/** Host option. Called once per error state. Pass `undefined` to remove it. Never call this from agent output. */
export declare function setErrorHandler(handler: ((error: KalturaError) => void) | undefined): void;
/** Host option. Called for widget events. Pass `undefined` to remove it. Never call this from agent output. */
export declare function setEventHandler(handler: ((event: KalturaEvent) => void) | undefined): void;
/**
 * Suggested `setPlayerSandbox` value for playback. Keeps fullscreen, downloads,
 * Cast/Presentation and share pop-ups. Blocks top navigation. Reasons per
 * token: docs/host-api.md#player-sandbox.
 */
export declare const PLAYER_SANDBOX_PRESET: readonly ["allow-scripts", "allow-same-origin", "allow-presentation", "allow-downloads", "allow-popups", "allow-popups-to-escape-sandbox", "allow-forms", "allow-orientation-lock"];
/**
 * Host option. Sets the `sandbox` attribute of player and flashcard clip
 * iframes mounted after the call. Default and `undefined`: no sandbox. Takes a
 * token list or a space-separated string. Throws on a token not in the
 * allowlist and keeps the current value. Never call this from agent output.
 */
export declare function setPlayerSandbox(tokens: string | readonly string[] | undefined): void;
export declare function getPlayerSandbox(): string | undefined;
export declare function reportError(code: KalturaErrorCode, widget: KalturaWidget, message: string): void;
export declare function emitEvent(event: KalturaEvent): void;
/** `invalid-ks` when the KS is one of the bad props. */
export declare function invalidCode(names: string[]): KalturaErrorCode;
//# sourceMappingURL=host-hooks.d.ts.map