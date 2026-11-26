/** The Unisphere embeds workspace. Remote code: check every call. */
export interface EmbedsWorkspace {
    apis?: Record<string, unknown>;
    destroy?: () => void;
    destory?: () => void;
}
/** Each call makes a workspace of its own, so several embeds can share a page. Returns null when `isCancelled` turns true before the module arrives. */
export declare function createEmbedsWorkspace(serverUrl: string, isCancelled: () => boolean, config: {
    apis: {
        name: string;
        settings: unknown;
    }[];
    session: {
        ks: string;
        partnerId: number;
    };
    ui?: {
        language: string;
    };
}): Promise<EmbedsWorkspace | null>;
/** Teardown steps, run newest first. A throwing remote must not break React's unmount. */
export declare function teardownSteps(): {
    add: (step: () => void) => void;
    run: () => void;
};
export declare const destroyEmbedsWorkspace: (workspace: EmbedsWorkspace) => void;
//# sourceMappingURL=embeds.d.ts.map