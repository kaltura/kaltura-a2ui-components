/** The parts of the Kaltura Player API we use. It is remote code: check every call. */
export interface PlayerSetupConfig {
    targetId: string;
    provider: {
        partnerId: number;
        uiConfId: number;
        ks?: string;
        useHeaderForKs: boolean;
    };
    playback: {
        autoplay?: boolean;
        muted?: boolean;
    };
}
export interface PlayerHandle {
    destroy?: () => void;
    loadMedia?: (info: {
        entryId: string;
    }, options?: {
        seekFrom?: number;
        clipTo?: number;
    }) => Promise<unknown>;
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
    Event?: {
        ERROR?: string;
    };
}
export interface PlayerApi {
    setup: (config: PlayerSetupConfig) => PlayerHandle | undefined;
}
/**
 * The bundle is built per uiconf and its version is set by the customer admin in KMC, so it has no SRI
 * (docs/adr/0008). It runs in the page origin and can read the KS.
 */
export declare const playerScriptUrl: (partnerId: number, uiconfId: number) => string;
/**
 * Loads the player bundle of one uiconf. Callers of the same bundle share one
 * promise. A failed load is dropped from the cache, so the next mount tries
 * again. Rejects with a `KalturaFailure` whose message is fixed text.
 */
export declare function loadPlayerScript(partnerId: number, uiconfId: number): Promise<PlayerApi>;
//# sourceMappingURL=player-script.d.ts.map