export interface GenieCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
    region?: string;
    /** Optional and ignored. Genie no longer needs a player ID. */
    uiconfId?: number;
    /** Category that scopes the Genie content. */
    categoryId?: string;
    /** Optional and ignored. The embeds API has no language setting. */
    language?: string;
}
export declare const GenieCore: import("react").FC<Omit<GenieCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=genie.d.ts.map