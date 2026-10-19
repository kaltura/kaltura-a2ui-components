/** The parts of the Express Recorder API we use. It is remote code: check every call. */
export interface ExpressRecorderOptions {
    ks: string;
    serviceUrl: string;
    playerUrl: string;
    partnerId: number;
    uiConfId: number;
    app: string;
    entryName?: string;
    allowVideo?: boolean;
    allowAudio?: boolean;
    allowScreenShare?: boolean;
    maxRecordingTime?: number;
}
export interface ExpressRecorderHandle {
    destroy?: () => void;
    instance?: {
        addEventListener?: (type: string, listener: (event: unknown) => void) => void;
    };
}
export interface ExpressRecorderApi {
    create: (containerId: string, options: ExpressRecorderOptions) => ExpressRecorderHandle | undefined;
}
/**
 * How the script is loaded. `integrity` is an SRI hash (`sha384-...`). When
 * set, the loader adds `crossorigin="anonymous"` and reports a mismatch. The
 * default sets no hash (docs/adr/0005).
 */
export interface RecorderScript {
    integrity?: string;
}
export declare const RECORDER_SCRIPT: RecorderScript;
/** The script URL for a region. Fixed path. The host comes from the region the host app allows. */
export declare const recorderScriptUrl: (region?: string) => string;
/**
 * Loads the Express Recorder script of one region. Callers of the same URL
 * share one promise. A failed load is dropped from the cache, so the next
 * mount tries again. Rejects with a `KalturaFailure` whose message is fixed
 * text.
 */
export declare function loadRecorderScript(script?: RecorderScript, region?: string): Promise<ExpressRecorderApi>;
//# sourceMappingURL=recorder-script.d.ts.map