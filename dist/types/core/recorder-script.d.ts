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
 * How the script is loaded. `integrity` is an SRI hash (`sha384-...`).
 * Kaltura serves `express-recorder.js` with no `Access-Control-Allow-Origin`
 * header, so a `crossorigin` request fails and SRI cannot be used yet
 * (docs/adr/0005). Once it sends the header, set `integrity` here to the hash
 * of the pinned version below
 * (`sha384-VkTBbp92aE8w5t8L3oNuCWPla+b1pnhgEHE3qBg+6VgCuGOou14E4Dwp/ZPcDWYS`
 * for v2.2.10). The loader then adds `crossorigin="anonymous"` and reports a
 * mismatch.
 */
export interface RecorderScript {
    integrity?: string;
}
export declare const RECORDER_SCRIPT: RecorderScript;
/** The script URL for the current region. Fixed host and path, no input from props. */
export declare const recorderScriptUrl: () => string;
/**
 * Loads the Express Recorder script once per page. Every caller shares the
 * same promise, also after a region change: the script is the same on every
 * Kaltura host. A failed load is dropped from the cache, so the
 * next mount tries again. Rejects with a `KalturaFailure` whose message is
 * fixed text.
 */
export declare function loadRecorderScript(script?: RecorderScript): Promise<ExpressRecorderApi>;
//# sourceMappingURL=recorder-script.d.ts.map