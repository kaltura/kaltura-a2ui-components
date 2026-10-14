/** Accepts only an https origin: no path, query, hash or userinfo. Returns the normalised origin. */
export declare function parseOrigin(value: string): string;
/**
 * Host-set only (never from agent props). Adds origins for private cloud or
 * on-prem Unisphere. Replaces the previous list. Throws on an invalid entry.
 * @example setExtraAllowedOrigins(['https://unisphere.example.com']);
 */
export declare function setExtraAllowedOrigins(origins: string[]): void;
/** Unisphere host of the region set with `setRegion`. Used when `serverUrl` is not set. */
export declare const defaultServerUrl: () => string;
export declare function getExtraAllowedOrigins(): string[];
/**
 * Validates serverUrl and returns the loader URL. Throws before any import().
 * Accepted forms: `<origin>`, `<origin>/`, `<origin>/v1`, `<origin>/v1/`, exact
 * text only. Anything else (userinfo, port, query, odd case, backslash) is refused.
 */
export declare function deriveLoaderUrl(serverUrl: string): string;
/** The only dynamic import() of remote code. Rejects (never throws) for a bad serverUrl. */
export declare function loadUnisphereModule<T>(serverUrl: string): Promise<T>;
//# sourceMappingURL=unisphere-loader.d.ts.map