import type { KsWidget } from './ks';

/** Why a widget did not render. See docs/host-api.md. */
export type KalturaErrorCode =
  | 'invalid-props'
  | 'invalid-ks'
  | 'origin-not-allowed'
  | 'load-failed'
  | 'url-rejected'
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
}

/** A widget event. See docs/host-api.md. */
export type KalturaEvent =
  | {
      type: 'entry-selected';
      widget: 'media-manager';
      detail: { entryId: string; name: string; instanceId: string; entries?: Array<{ entryId: string; name: string }> };
    }
  | {
      /** The avatar session ended. `reason` is a name such as `ConversationEnded`, or `UnknownReason`. */
      type: 'avatar-disconnected';
      widget: 'avatar';
      detail: { reason: string; instanceId: string };
    };

/** An error whose message is fixed text, safe to show and report. */
export class KalturaFailure extends Error {
  constructor(
    readonly code: KalturaErrorCode,
    message: string,
  ) {
    super(message);
  }
}

let errorHandler: ((error: KalturaError) => void) | undefined;
let eventHandler: ((event: KalturaEvent) => void) | undefined;

/** Host option. Called once per error state. Pass `undefined` to remove it. Never call this from agent output. */
export function setErrorHandler(handler: ((error: KalturaError) => void) | undefined): void {
  errorHandler = handler;
}

/** Host option. Called for widget events. Pass `undefined` to remove it. Never call this from agent output. */
export function setEventHandler(handler: ((event: KalturaEvent) => void) | undefined): void {
  eventHandler = handler;
}

// A throwing host handler must not break rendering.
export function reportError(code: KalturaErrorCode, widget: KalturaWidget, message: string): void {
  try {
    errorHandler?.({ code, widget, message });
  } catch {
    // ignored
  }
}

export function emitEvent(event: KalturaEvent): void {
  try {
    eventHandler?.(event);
  } catch {
    // ignored
  }
}

/** `invalid-ks` when the KS is one of the bad props. */
export function invalidCode(names: string[]): KalturaErrorCode {
  return names.includes('ks') ? 'invalid-ks' : 'invalid-props';
}
