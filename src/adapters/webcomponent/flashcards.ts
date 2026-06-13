import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FlashcardsCore, type FlashcardsCoreProps } from '../../core/flashcards';

export const FLASHCARDS_TAG = 'kaltura-flashcards';

export function defineFlashcardsWebComponent(): void {
  if (customElements.get(FLASHCARDS_TAG)) return;

  customElements.define(
    FLASHCARDS_TAG,
    class KalturaFlashcardsElement extends HTMLElement {
      config: Partial<FlashcardsCoreProps> = {};

      connectedCallback() {
        const props = this.config as FlashcardsCoreProps;
        const root = createRoot(this);
        root.render(createElement(FlashcardsCore, props));
      }
    },
  );
}
