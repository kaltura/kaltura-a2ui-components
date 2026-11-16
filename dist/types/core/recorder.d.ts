import type { FC } from 'react';
export interface RecorderCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Region code. Default: the host region. A region without a Unisphere host is refused. */
    region?: string;
    /** Player (uiConf) ID that plays the recording back. */
    uiconfId: number;
    /** Name of the new entry. */
    entryName?: string;
    /** Allow webcam video. */
    allowVideo?: boolean;
    /** Allow audio only. */
    allowAudio?: boolean;
    /** Allow screen recording. */
    allowScreenShare?: boolean;
    /** Longest recording in seconds. At most 86400. */
    maxRecordingTime?: number;
    /** Fixes the capture orientation and the frame shape. */
    orientation?: 'portrait' | 'landscape';
    /** A script that opens in the teleprompter. */
    prompterText?: string;
}
export declare const RecorderCore: FC<Omit<RecorderCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=recorder.d.ts.map