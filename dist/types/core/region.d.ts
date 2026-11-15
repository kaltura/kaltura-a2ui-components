/** Kaltura multi-tenant cloud regions. Source and status of each host: docs/host-api.md. */
export declare const KALTURA_REGIONS: readonly ["nvp1", "irp2", "frp2", "cap2", "syp2", "sgp2"];
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
/** The loader takes the workspace region from `env`, not from its own URL. Extra origins send none. */
export declare function regionOf(serverUrl: string): KalturaRegion | undefined;
/**
 * Host option. Sets the region of the Kaltura account. Default `nvp1` (US).
 * Call it before the widgets mount. Throws on an unknown code. Never call
 * this from agent output.
 * @example setRegion('irp2');
 */
export declare function setRegion(code: KalturaRegion): void;
/** The region set by `setRegion`. */
export declare const currentRegion: () => KalturaRegion;
/** Hosts for a region. Default: the region set with `setRegion`. */
export declare function kalturaHosts(code?: KalturaRegion): KalturaHosts;
/**
 * A host-registered set of hosts, for a local, private cloud or on-premises
 * setup. Only `serviceUrl` is required: the other hosts default to it.
 * Every value is an origin (`https://host`, or `http://` for localhost and
 * private IPs only).
 */
export interface KalturaEnvironment {
    serviceUrl: string;
    cdn?: string;
    vod?: string;
    kmc?: string;
    recorder?: string;
    /** Unisphere host. Without it the Unisphere widgets refuse this environment. */
    unisphere?: string;
    /** Agents Manager host. Without it the Agents Widget refuses this environment. */
    agents?: string;
}
/**
 * Host option. Registers named hosts that an agent can ask for with
 * `region: '<name>'`, so a page can use localhost, an IP, a private cloud or
 * an on-premises install. The agent sends the name, never a URL. Replaces the
 * previous list. Pass `undefined` to reset. Names are lowercase letters,
 * digits and `-`, and cannot be a region code. Throws on a bad name or host
 * and keeps the current list. Your CSP must allow the hosts. Never call this
 * from agent output.
 * @example setEnvironments({ local: { serviceUrl: 'http://localhost:8080', unisphere: 'http://127.0.0.1:3000' } });
 */
export declare function setEnvironments(next: Record<string, KalturaEnvironment> | undefined): void;
/** The Unisphere origins of the registered environments. The loader accepts these next to the Kaltura ones. */
export declare const environmentUnisphereOrigins: () => string[];
/** Where one widget instance runs. `name` is a region code or an environment name. */
export interface ResolvedRegion {
    name: string;
    hosts: KalturaHosts;
    /** Origin of the Unisphere host. `undefined` for an environment without one. */
    unisphere?: string;
    /** Origin of the Agents Manager host. `undefined` for an environment without one. */
    agents?: string;
}
/**
 * The region of one widget instance: the `region` prop, else the region in
 * `serverUrl`, else the `setRegion` value. Throws `origin-not-allowed` when
 * the name is unknown, the host allowlist refuses it, or the prop and
 * `serverUrl` name different regions. The message holds no prop value.
 */
export declare function resolveRegion(prop?: string, serverUrl?: string): ResolvedRegion;
/**
 * The Unisphere URL of one instance: `serverUrl`, else the Unisphere host of its region. Throws like `resolveRegion`.
 * Always ends in `/v1`: the loader reads its region from that exact form and refuses a bare origin or a trailing slash.
 */
export declare function unisphereUrl(prop?: string, serverUrl?: string): string;
/** The Agents Manager API URL of one instance. Throws like `resolveRegion`, and when the region has no Agents host. */
export declare function agentsUrl(prop?: string, serverUrl?: string): string;
//# sourceMappingURL=region.d.ts.map