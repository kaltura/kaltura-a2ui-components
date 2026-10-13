import type { KsWidget } from './ks.js';
/** Why a widget did not render. See docs/host-api.md. */
export type KalturaErrorCode = 'invalid-props' | 'invalid-ks' | 'origin-not-allowed' | 'load-failed' | 'url-rejected' | 'render-failed';
/** The widget that reports. `unisphere` is a `UnisphereWidgetCore` used without a `widget` prop. */
export type KalturaWidget = KsWidget | 'flashcards' | 'avatar' | 'chart' | 'image' | 'video' | 'audio-player' | 'unisphere';
/**
 * `message` is fixed text plus prop names from the schema. It never holds a
 * prop value, a remote error text or the KS.
 */
export interface KalturaError {
    code: KalturaErrorCode;
    widget: KalturaWidget;
    message: string;
}
export interface KalturaEvent {
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
}
/** An error whose message is fixed text, safe to show and report. */
export declare class KalturaFailure extends Error {
    readonly code: KalturaErrorCode;
    constructor(code: KalturaErrorCode, message: string);
}
/** Host option. Called once per error state. Pass `undefined` to remove it. Never call this from agent output. */
export declare function setErrorHandler(handler: ((error: KalturaError) => void) | undefined): void;
/** Host option. Called for widget events. Pass `undefined` to remove it. Never call this from agent output. */
export declare function setEventHandler(handler: ((event: KalturaEvent) => void) | undefined): void;
export declare function reportError(code: KalturaErrorCode, widget: KalturaWidget, message: string): void;
export declare function emitEvent(event: KalturaEvent): void;
/** `invalid-ks` when the KS is one of the bad props. */
export declare function invalidCode(names: string[]): KalturaErrorCode;
//# sourceMappingURL=host-hooks.d.ts.map