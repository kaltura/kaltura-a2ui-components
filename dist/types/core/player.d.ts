import type { CSSProperties, FC } from 'react';
export interface PlayerCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Player (uiConf) ID. */
    uiconfId: number;
    /** Entry to play, such as `0_abc123`. Set this or `playlistId`, not both. */
    entryId?: string;
    /** Manual playlist to play, such as `1_abc123`. Set this or `entryId`, not both. `startTime` and `clipTo` do not apply. */
    playlistId?: string;
    /** Region code or host-registered environment. Default: the `setRegion` value. */
    region?: string;
    /** Only for protected entries. The host KS provider is used first. */
    ks?: string;
    /** Start playback on load. Browsers need `muted` too. */
    autoplay?: boolean;
    /** Start muted. */
    muted?: boolean;
    /** Seek to this second on load. */
    startTime?: number;
    /** Stop playback at this second. */
    clipTo?: number;
    /** Container ratio such as `16/9` (default) or `4/3`. */
    aspectRatio?: string;
    /** Title shown above the player. */
    entryName?: string;
    /** Text shown under the player. HTML tags are stripped. */
    entryDescription?: string;
}
export interface PlayerEmbedProps {
    partnerId: number;
    uiconfId: number;
    entryId?: string;
    playlistId?: string;
    region?: string;
    ks?: string;
    autoplay?: boolean;
    muted?: boolean;
    seekFrom?: number;
    clipTo?: number;
    title: string;
    widget: 'player' | 'flashcards';
    className?: string;
    style?: CSSProperties;
}
/**
 * Plays an entry with the Kaltura Player script. The KS goes only into the
 * player config, never into a URL. The script runs in the page origin, so
 * there is no iframe sandbox (docs/adr/0008).
 */
export declare function PlayerEmbed(props: PlayerEmbedProps): import("react").JSX.Element;
export declare const PlayerCore: FC<Omit<PlayerCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=player.d.ts.map