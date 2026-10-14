export interface AgentsWidgetCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
}
export declare const AgentsWidgetCore: import("react").FC<Omit<AgentsWidgetCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=agents-widget.d.ts.map