import type { FC } from 'react';
export interface RecorderCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Region code or host-registered environment name. Default: the host region. */
    region?: string;
    /** Player (uiConf) ID that loads the recorded entry. */
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
}
export declare const RecorderCore: FC<Omit<RecorderCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=recorder.d.ts.map