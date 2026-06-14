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
/** Builds the runtimes array passed to the Unisphere loader. */
export declare function buildRuntimes(props: {
    ks: string;
    partnerId: number;
    contextId?: string;
    mode?: 'select' | 'manage';
    instanceId: string;
}): unknown[];
export declare function MediaManagerCore(props: MediaManagerCoreProps): import("react").JSX.Element;
//# sourceMappingURL=media-manager.d.ts.map