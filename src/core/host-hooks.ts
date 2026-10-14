import { createContext } from 'react';
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
  /** The A2UI surface of the component. Missing outside a surface, as in the web component bundle. */
  surfaceId?: string;
  /** On `invalid-props` and `invalid-ks`: the top-level props that failed, as named in the schema. Never a value. */
  invalidProps?: string[];
}

/** A widget event. `surfaceId` is as in `KalturaError`. See docs/host-api.md. */
export type KalturaEvent = { surfaceId?: string } & (
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
    }
  | {
      /** The recorder finished an upload. `entryId` is present when the recorder gave a valid one. */
      type: 'recorder-upload-ended';
      widget: 'recorder';
      detail: { entryId?: string; instanceId: string };
    }
);

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

export const ReporterContext = createContext<KalturaReporter>({});

/** An error whose message is fixed text, safe to show and report. */
export class KalturaFailure extends Error {
  constructor(
    readonly code: KalturaErrorCode,
    message: string,
    readonly invalidProps?: string[],
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

// A throwing host handler or action must not break rendering.
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // ignored
  }
}

export function reportError(code: KalturaErrorCode, widget: KalturaWidget, message: string, { surfaceId, send }: KalturaReporter = {}, invalidProps?: string[]): void {
  const props = invalidProps?.length ? { invalidProps } : {};
  safely(() => errorHandler?.({ code, widget, message, ...(surfaceId ? { surfaceId } : {}), ...props }));
  safely(() => send?.({ widget, event: 'error', code, ...props }));
}

export function emitEvent(event: KalturaEvent, { surfaceId, send }: KalturaReporter = {}): void {
  safely(() => eventHandler?.(surfaceId ? { ...event, surfaceId } : event));
  // Ids only, in the `1_abc12345` form, so a remote id cannot carry a sentence.
  // `name` and `reason` come from a remote service.
  const isId = (id: unknown): id is string => typeof id === 'string' && /^\d_[a-z0-9]{1,16}$/.test(id);
  safely(() => {
    const { entryId, entries } = event.detail as { entryId?: unknown; entries?: Array<{ entryId: unknown }> };
    // The Media Manager selects 5 entries at most.
    const ids = entries ? { entryIds: entries.map(entry => entry.entryId).filter(isId).slice(0, 5) } : isId(entryId) ? { entryId } : {};
    send?.({ widget: event.widget, event: event.type, ...ids });
  });
}

/**
 * An A2UI v0.9 client `error` message for the agent. Its message is the
 * widget, the code and `invalidProps`, never `message`. Pass `surfaceId` when
 * the error has none.
 */
export function toClientError(error: KalturaError, surfaceId = error.surfaceId ?? '') {
  const { code, widget, invalidProps } = error;
  const props = invalidProps?.length ? ` (${invalidProps.join(', ')})` : '';
  return { version: 'v0.9', error: { code, widget, surfaceId, message: `Kaltura ${widget} error: ${code}${props}` } } as const;
}

/** `invalid-ks` when the KS is one of the bad props. */
export function invalidCode(names: string[]): KalturaErrorCode {
  return names.includes('ks') ? 'invalid-ks' : 'invalid-props';
}
