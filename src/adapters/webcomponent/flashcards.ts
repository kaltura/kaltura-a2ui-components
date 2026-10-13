import { FlashcardsCore } from '../../core/flashcards';
import { defineKalturaElement } from './define';

export const FLASHCARDS_TAG = 'kaltura-flashcards';

export function defineFlashcardsWebComponent(): void {
  defineKalturaElement(FLASHCARDS_TAG, FlashcardsCore);
}
