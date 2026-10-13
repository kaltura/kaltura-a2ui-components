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
    }
  | {
      /** The recorder finished an upload. `entryId` is present when the recorder gave a valid one. */
      type: 'recorder-upload-ended';
      widget: 'recorder';
      detail: { entryId?: string; instanceId: string };
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

// HTML sandbox tokens a host may set. allow-top-navigation and
// allow-top-navigation-to-custom-protocols are left out: they let the player
// page replace the host page without a click.
const SANDBOX_TOKENS = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation-by-user-activation',
];

/**
 * Suggested `setPlayerSandbox` value for playback. Keeps fullscreen, downloads,
 * Cast/Presentation and share pop-ups. Blocks top navigation. Reasons per
 * token: docs/host-api.md#player-sandbox.
 */
export const PLAYER_SANDBOX_PRESET = [
  'allow-scripts',
  'allow-same-origin',
  'allow-presentation',
  'allow-downloads',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-orientation-lock',
] as const;

let playerSandbox: string | undefined;

/**
 * Host option. Sets the `sandbox` attribute of player and flashcard clip
 * iframes mounted after the call. Default and `undefined`: no sandbox. Takes a
 * token list or a space-separated string. Throws on a token not in the
 * allowlist and keeps the current value. Never call this from agent output.
 */
export function setPlayerSandbox(tokens: string | readonly string[] | undefined): void {
  const list = typeof tokens === 'string' ? tokens.split(/\s+/).filter(Boolean) : tokens;
  const bad = list?.filter(token => !SANDBOX_TOKENS.includes(token));
  if (bad?.length) throw new Error(`Sandbox token not allowed: ${bad.join(' ')}`);
  playerSandbox = list?.join(' ');
}

export function getPlayerSandbox(): string | undefined {
  return playerSandbox;
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
