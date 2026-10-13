import { type FC } from 'react';
export interface Clip {
    entryId: string;
    startTime: number;
    endTime: number;
    title?: string;
    thumbnail?: string;
}
export interface FlashCard {
    title: string;
    subtitle?: string;
    content: string;
    clips?: Clip[];
}
export interface FlashcardWithCover extends FlashCard {
    isCover: boolean;
}
export interface FlashcardsCoreProps {
    title: string;
    summary?: string;
    cards: FlashCard[];
    partnerId?: number;
    uiconfId?: number;
    ks?: string;
}
/**
 * Pure helper: builds the clip iframe embed URL.
 * Returns an empty string when partnerId, uiconfId or entryId is missing or invalid.
 */
export declare function buildClipUrl(clip: Clip, partnerId?: number, uiconfId?: number, ks?: string): string;
/**
 * CDN thumbnail URL for a clip — seeks to startTime+1s for a meaningful frame.
 * Uses the clip's own thumbnail field only when it is an https Kaltura CDN URL
 * (see toKalturaCdnUrl). Otherwise builds the CDN URL, or returns an empty string.
 */
export declare function buildThumbnailUrl(clip: Clip, partnerId?: number): string;
/**
 * Pure helper: prepend the cover card to the cards array.
 * Exported so tests can assert on the count without rendering.
 */
export declare function buildAllCards(title: string, summary: string | undefined, cards: FlashCard[]): FlashcardWithCover[];
export declare const FlashcardsCore: FC<FlashcardsCoreProps>;
//# sourceMappingURL=flashcards.d.ts.map