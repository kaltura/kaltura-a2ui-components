export interface ContentLabCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
    region?: string;
    /** Player (uiConf) ID for the video preview. */
    uiconfId: number;
    /** Entry that Content Lab opens. */
    entryId: string;
}
export declare const ContentLabCore: import("react").FC<Omit<ContentLabCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=content-lab.d.ts.map