export interface VodAvatarCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
}
export declare const VodAvatarCore: import("react").FC<Omit<VodAvatarCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=vod-avatar.d.ts.map