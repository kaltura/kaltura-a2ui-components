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
    /** Title of the deck. */
    title: string;
    /** Short description of the deck. */
    summary?: string;
    /** The cards, in order. */
    cards: FlashCard[];
    /** Kaltura partner (account) ID. Needed to play the clips. */
    partnerId?: number;
    /** Region code or host-registered environment name. Default: the host region. */
    region?: string;
    /** Player (uiConf) ID used to play the clips. */
    uiconfId?: number;
    /** Only for protected entries. The host KS provider is used first. */
    ks?: string;
}
/**
 * CDN thumbnail URL for a clip. It seeks to startTime+1s for a meaningful frame.
 * Uses the clip's own thumbnail field only when isAllowedMediaUrl accepts it (an https
 * Kaltura CDN URL or a host-added media origin, with no api_v3 path or KS). Otherwise builds the CDN URL, or returns an
 * empty string. A `partnerId` or `region` that the host allowlist refuses also gives an empty string.
 */
export declare function buildThumbnailUrl(clip: Clip, partnerId?: number, region?: string): string;
/**
 * Pure helper: prepend the cover card to the cards array.
 * Exported so tests can assert on the count without rendering.
 */
export declare function buildAllCards(title: string, summary: string | undefined, cards: FlashCard[]): FlashcardWithCover[];
export declare const FlashcardsCore: FC<Omit<FlashcardsCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=flashcards.d.ts.map