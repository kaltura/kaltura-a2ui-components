/** Kaltura multi-tenant cloud regions. Source and status of each host: docs/host-api.md. */
export declare const KALTURA_REGIONS: readonly ["nvp1", "irp2", "frp2", "cap2", "syp2"];
export type KalturaRegion = (typeof KALTURA_REGIONS)[number];
export interface KalturaHosts {
    /** Core API host, without `/api_v3`. */
    serviceUrl: string;
    /** Player embed CDN. */
    cdn: string;
    /** VOD delivery (thumbnails). */
    vod: string;
    /** KMC analytics app. */
    kmc: string;
    /** Recorder iframe host. */
    recorder: string;
}
/**
 * Host option. Sets the region of the Kaltura account. Default `nvp1` (US).
 * Call it before the widgets mount. Throws on an unknown code. Never call
 * this from agent output.
 */
export declare function setRegion(code: KalturaRegion): void;
/** Hosts for the current region. */
export declare function kalturaHosts(): KalturaHosts;
//# sourceMappingURL=region.d.ts.map