import type { KsWidget } from './ks.js';
/** Why a widget did not render. See docs/host-api.md. */
export type KalturaErrorCode = 
/** A prop is missing or has the wrong type or value. `invalidProps` names it. */
'invalid-props'
/** The KS is missing, empty or rejected, or the KS provider failed. */
 | 'invalid-ks'
/** A partner, uiConf or server URL is not on the allow list. */
 | 'origin-not-allowed'
/** A remote script or service did not load or did not start. */
 | 'load-failed'
/** An image, video or audio URL was refused. */
 | 'url-rejected'
/** The widget started, then failed while it ran. */
 | 'render-failed';
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
    /** The A2UI surface of the component. Missing outside a surface, as in the web component bundle. */
    surfaceId?: string;
    /** On `invalid-props` and `invalid-ks`: the top-level props that failed, as named in the schema. Never a value. */
    invalidProps?: string[];
}
/** A widget event. `surfaceId` is as in `KalturaError`. See docs/host-api.md. */
export type KalturaEvent = {
    surfaceId?: string;
} & ({
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
} | {
    /** The recorder finished an upload. `entryId` is present when the recorder gave a valid one. */
    type: 'recorder-upload-ended';
    widget: 'recorder';
    detail: {
        entryId?: string;
        instanceId: string;
    };
});
/**
 * The Kaltura part of the context an `action` prop sends to the agent. Fixed
 * names and checked ids only, never text from a remote service or the page.
 */
export interface KalturaActionContext {
    widget: KalturaWidget;
    event: 'error' | KalturaEvent['type'];
    code?: KalturaErrorCode;
    /** As in `KalturaError`. */
    invalidProps?: string[];
    entryId?: string;
    entryIds?: string[];
}
/** Set by the adapters for each component. `send` runs the component's `action` prop. */
export interface KalturaReporter {
    surfaceId?: string;
    send?: (context: KalturaActionContext) => void;
}
export declare const ReporterContext: import("react").Context<KalturaReporter>;
/** An error whose message is fixed text, safe to show and report. */
export declare class KalturaFailure extends Error {
    readonly code: KalturaErrorCode;
    readonly invalidProps?: string[] | undefined;
    constructor(code: KalturaErrorCode, message: string, invalidProps?: string[] | undefined);
}
/**
 * Host option. Called once per error state. Pass `undefined` to remove it. Never call this from agent output.
 * @example setErrorHandler(error => console.warn(error.widget, error.code));
 */
export declare function setErrorHandler(handler: ((error: KalturaError) => void) | undefined): void;
/**
 * Host option. Called for widget events. Pass `undefined` to remove it. Never call this from agent output.
 * @example setEventHandler(event => event.type === 'entry-selected' && select(event.detail.entryId));
 */
export declare function setEventHandler(handler: ((event: KalturaEvent) => void) | undefined): void;
export declare function reportError(code: KalturaErrorCode, widget: KalturaWidget, message: string, { surfaceId, send }?: KalturaReporter, invalidProps?: string[]): void;
export declare function emitEvent(event: KalturaEvent, { surfaceId, send }?: KalturaReporter): void;
/** The A2UI v0.9 client `error` message that `toClientError` returns. */
export interface KalturaClientError {
    version: 'v0.9';
    error: {
        code: KalturaErrorCode;
        widget: KalturaWidget;
        surfaceId: string;
        message: string;
    };
}
/**
 * An A2UI v0.9 client `error` message for the agent. Its message is the
 * widget, the code and `invalidProps`, never `message`. Pass `surfaceId` when
 * the error has none.
 * @example setErrorHandler(error => sendToAgent(toClientError(error)));
 */
export declare function toClientError(error: KalturaError, surfaceId?: string): KalturaClientError;
/** `invalid-ks` when the KS is one of the bad props. */
export declare function invalidCode(names: string[]): KalturaErrorCode;
//# sourceMappingURL=host-hooks.d.ts.map