import type { FC } from 'react';
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
export declare const PlayerCore: FC<PlayerCoreProps>;
//# sourceMappingURL=player.d.ts.map