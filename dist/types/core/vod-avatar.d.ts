export interface VodAvatarCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
    region?: string;
    /** First screen of the studio. Default: `videoLibrary`. */
    initialView?: 'videoLibrary' | 'editVideo' | 'projectBuilder';
    /** Extra eSearch conditions for the entry picker, ANDed with the built-in ones. `itemType` is the `KalturaESearchItemType` number. */
    additionalEsearchFilters?: Array<{
        fieldName: string;
        itemType: number;
        searchTerm: string | number;
    }>;
}
export declare const VodAvatarCore: import("react").FC<Omit<VodAvatarCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=vod-avatar.d.ts.map