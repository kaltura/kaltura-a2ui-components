export { deriveLoaderUrl } from './unisphere-loader.js';
export interface MediaManagerCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Default: the `data-theme` of the page, else `dark`. */
    theme?: 'dark' | 'light';
    /** `select` picks entries (default). `manage` also edits them. */
    mode?: 'select' | 'manage';
    /** Allow up to 5 entries. Default: false. */
    multiSelect?: boolean;
    /** Content scope to browse, such as a category ID. */
    contextId?: string;
}
/**
 * Builds the createWorkspace config for an isolated Media Manager instance.
 * The live loader needs `appVersion`, `env` (the region code of the Unisphere
 * host, `nvp1` in `unisphere.nvp1.ovp.kaltura.com`) and `session`.
 */
export declare function buildWorkspaceConfig(props: {
    ks: string;
    partnerId: number;
    instanceId: string;
    theme: 'dark' | 'light';
    serverUrl: string;
}): {
    config: {
        appId: string;
        appVersion: string;
        env: string;
        session: {
            ks: string;
            partnerId: number;
        };
        experiences: {
            'media-manager': {
                'kaltura-media-manager': {
                    settings: {
                        ks: string;
                        partnerId: number;
                    };
                };
            };
        };
        ui: {
            theme: 'dark' | 'light';
            language: string;
        };
    };
    workspaceName: string;
};
export declare const MediaManagerCore: import("react").FC<Omit<MediaManagerCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=media-manager.d.ts.map