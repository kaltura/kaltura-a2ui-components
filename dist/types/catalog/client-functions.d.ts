/**
 * Kaltura-specific client-side function implementations for A2UI.
 *
 * These functions execute locally on the client without a network round-trip.
 * They are registered with the Catalog and invoked when the agent emits
 * functionCall actions in component definitions.
 */
import { type FunctionImplementation } from '@a2ui/web_core/v0_9';
/**
 * Copies the given text to the clipboard via the async Clipboard API.
 * A no-op when the text is empty. Registered with the Kaltura catalog so
 * components can emit a `copyToClipboard` functionCall action.
 */
export declare const CopyToClipboardImplementation: FunctionImplementation;
/**
 * All Kaltura-specific client functions to register with the catalog,
 * merged on top of the basic catalog's built-in functions.
 */
export declare const kalturaClientFunctions: FunctionImplementation[];
//# sourceMappingURL=client-functions.d.ts.map