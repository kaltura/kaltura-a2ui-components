/**
 * Kaltura-specific client-side function implementations for A2UI.
 *
 * These functions execute locally on the client without a network round-trip.
 * They are registered with the Catalog and invoked when the agent emits
 * functionCall actions in component definitions.
 */

import { z } from 'zod';
import { createFunctionImplementation, type FunctionImplementation } from '@a2ui/web_core/v0_9';
import { OpenUrlApi } from '@a2ui/web_core/v0_9/basic_catalog';

/**
 * Copies the given text to the clipboard via the async Clipboard API.
 * A no-op when the text is empty. Registered with the Kaltura catalog so
 * components can emit a `copyToClipboard` functionCall action.
 */
export const CopyToClipboardImplementation: FunctionImplementation = createFunctionImplementation(
  {
    name: 'copyToClipboard',
    returnType: 'void' as const,
    schema: z.object({
      text: z.string().describe('The text to copy to the clipboard'),
    }),
  },
  (args) => {
    const text = String(args.text || '');
    if (text) {
      void navigator.clipboard.writeText(text);
    }
  },
);

/**
 * Replaces the basic catalog's `openUrl`. Only absolute `https:` URLs reach
 * `window.open`. The URL parser removes leading spaces, tabs and line breaks
 * and lowercases the scheme, so the check runs on the parsed protocol.
 * Relative URLs are refused because the base page may not be https.
 */
export const SafeOpenUrlImplementation: FunctionImplementation = createFunctionImplementation(
  OpenUrlApi,
  (args) => {
    let url: URL | undefined;
    try {
      url = new URL(String(args.url ?? ''));
    } catch {
      url = undefined;
    }
    if (url?.protocol !== 'https:') {
      console.warn('openUrl: blocked a URL that is not an absolute https: URL');
      return;
    }
    window.open(url.href, '_blank', 'noopener,noreferrer');
  },
);

/**
 * All Kaltura-specific client functions to register with the catalog,
 * merged on top of the basic catalog's built-in functions.
 */
export const kalturaClientFunctions: FunctionImplementation[] = [
  CopyToClipboardImplementation,
];
