import type { CSSProperties, FC } from 'react';
export interface PlayerCoreProps {
    partnerId: number;
    uiconfId: number;
    entryId: string;
    ks?: string;
    autoplay?: boolean;
    muted?: boolean;
    startTime?: number;
    clipTo?: number;
    aspectRatio?: string;
    entryName?: string;
    entryDescription?: string;
}
export declare function buildPlayerUrl(p: PlayerCoreProps): string;
/** Iframe for a Kaltura player page. The host sandbox is read once, when it mounts. */
export declare function PlayerFrame(props: {
    src: string;
    title: string;
    className?: string;
    style?: CSSProperties;
}): import("react").JSX.Element;
export declare const PlayerCore: FC<Omit<PlayerCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=player.d.ts.map