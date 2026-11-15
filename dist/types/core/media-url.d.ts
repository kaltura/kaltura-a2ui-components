/**
 * Kaltura CDN allowlist: https only, default port, no credentials, and a host
 * that is `kaltura.com` or a subdomain of it. This covers the hosts used in
 * this repo (cdnapisec.kaltura.com, cfvod.kaltura.com). Returns the
 * normalised URL, or '' when the URL is not allowed.
 */
export declare function toKalturaCdnUrl(value: unknown): string;
/**
 * Host option. Adds https origins that the basic Image, Video and AudioPlayer
 * may load from, next to the Kaltura hosts. Replaces the previous list.
 * Throws on an entry that is not an https origin. Never call this from agent output.
 * @example setExtraMediaOrigins(['https://cdn.example.com']);
 */
export declare function setExtraMediaOrigins(origins: string[]): void;
/** True for an https URL on a Kaltura host or a host-added origin, with no API path or KS. */
export declare function isAllowedMediaUrl(value: unknown): boolean;
//# sourceMappingURL=media-url.d.ts.map