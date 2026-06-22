export interface MediaManagerCoreProps {
    partnerId: number;
    ks: string;
    serverUrl: string;
    theme?: 'dark' | 'light';
    mode?: 'select' | 'manage';
    multiSelect?: boolean;
    contextType?: string;
    contextId?: string;
    userId?: string;
}
/** Derives the Unisphere loader URL from the base serverUrl. */
export declare function deriveLoaderUrl(serverUrl: string): string;
/** Builds the createWorkspace config for an isolated Media Manager instance. */
export declare function buildWorkspaceConfig(props: {
    ks: string;
    partnerId: number;
    instanceId: string;
    theme: 'dark' | 'light';
}): {
    config: {
        appId: string;
        appVersion: string;
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
export declare function MediaManagerCore(props: MediaManagerCoreProps): import("react").JSX.Element;
//# sourceMappingURL=media-manager.d.ts.map