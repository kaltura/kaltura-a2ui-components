export { deriveLoaderUrl } from './unisphere-loader.js';
export interface MediaManagerCoreProps {
    partnerId: number;
    ks: string;
    serverUrl: string;
    theme?: 'dark' | 'light';
    mode?: 'select' | 'manage';
    multiSelect?: boolean;
    contextId?: string;
    /**
     * Host option, not part of the A2UI schema. The React adapter always sets
     * it to `true`, so an agent cannot change it. Default `true`: the selection
     * event fires on the host element and bubbles up to `document`, as before.
     * `false` lets it bubble up to the host element only. The default flips in
     * the next release.
     */
    legacyDocumentEvents?: boolean;
}
/** Builds the createWorkspace config for an isolated Media Manager instance. */
export declare function buildWorkspaceConfig(props: {
    ks: string;
    partnerId: number;
    instanceId: string;
    theme: 'dark' | 'light';
}): {
    config: {
        appId: string;
        experiences: {
            'media-manager': {
                'kaltura-media-manager': {
                    settings: {
                        ks: string;
                        partnerId: number;
                        supportDocuments: boolean;
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