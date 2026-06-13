// Web-component adapter entry — SECONDARY path, for plain-HTML / non-A2UI hosts.
// Never the A2UI consumption path (that is adapters/react).
//
// Each custom element is configured via a `.config` property set before the
// element is connected, then renders its core React component into itself.

import '../../styles/components.css';
import { PLAYER_TAG, definePlayerWebComponent } from './player';
import { FLASHCARDS_TAG, defineFlashcardsWebComponent } from './flashcards';
import { MEDIA_MANAGER_TAG, defineMediaManagerWebComponent } from './media-manager';

export const KALTURA_WC_TAGS = [
  PLAYER_TAG,
  FLASHCARDS_TAG,
  MEDIA_MANAGER_TAG,
] as const;

/**
 * Defines all Kaltura custom elements. Idempotent — each definer guards against
 * re-registration, so calling this more than once is safe.
 */
export function defineKalturaWebComponents(): void {
  definePlayerWebComponent();
  defineFlashcardsWebComponent();
  defineMediaManagerWebComponent();
}

export {
  PLAYER_TAG,
  definePlayerWebComponent,
  FLASHCARDS_TAG,
  defineFlashcardsWebComponent,
  MEDIA_MANAGER_TAG,
  defineMediaManagerWebComponent,
};

// Auto-define on import — the IIFE bundle is meant to be dropped into a page via
// a <script> tag, after which the custom elements are immediately usable.
defineKalturaWebComponents();
