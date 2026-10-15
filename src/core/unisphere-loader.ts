import { KalturaFailure } from './host-hooks';
import { currentRegion } from './region';

/** serverUrl comes from agent output. Only known Unisphere origins may be imported. */
// Same codes as KALTURA_REGIONS in region.ts. test/release/unisphere-smoke.test.ts reads this line.
const KALTURA_REGIONS = ['nvp1', 'irp2', 'frp2', 'cap2', 'syp2'];
const BUILT_IN_ORIGINS = KALTURA_REGIONS.map(region => `https://unisphere.${region}.ovp.kaltura.com`);

let extraOrigins: string[] = [];

/** Accepts only an https origin: no path, query, hash or userinfo. Returns the normalised origin. */
export function parseOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid origin: ${JSON.stringify(value)}`);
  }
  if (url.protocol !== 'https:' || (value !== url.origin && value !== `${url.origin}/`)) {
    throw new Error(`Origin must be an https origin only: ${JSON.stringify(value)}`);
  }
  return url.origin;
}

/**
 * Host-set only (never from agent props). Adds origins for private cloud or
 * on-prem Unisphere. Replaces the previous list. Throws on an invalid entry.
 * @example setExtraAllowedOrigins(['https://unisphere.example.com']);
 */
export function setExtraAllowedOrigins(origins: string[]): void {
  extraOrigins = origins.map(parseOrigin);
}

/** Unisphere host of the region set with `setRegion`. Used when `serverUrl` is not set. */
export const defaultServerUrl = (): string => `https://unisphere.${currentRegion()}.ovp.kaltura.com/v1`;

export function getExtraAllowedOrigins(): string[] {
  return [...extraOrigins];
}

const loaderUrlOf = (serverUrl: string): string | undefined => {
  let origin: string | undefined;
  try {
    origin = new URL(serverUrl).origin;
  } catch {
    return undefined;
  }
  const allowed = [...BUILT_IN_ORIGINS, ...extraOrigins].includes(origin);
  const exact = [origin, `${origin}/`, `${origin}/v1`, `${origin}/v1/`].includes(serverUrl);
  return allowed && exact ? `${origin}/v1/loader/index.esm.js` : undefined;
};

/** True when `deriveLoaderUrl` accepts the value. Components call it before they ask for a KS. */
export const isAllowedServerUrl = (serverUrl: string): boolean => loaderUrlOf(serverUrl) !== undefined;

/**
 * Validates serverUrl and returns the loader URL. Throws before any import().
 * Accepted forms: `<origin>`, `<origin>/`, `<origin>/v1`, `<origin>/v1/`, exact
 * text only. Anything else (userinfo, port, query, odd case, backslash) is refused.
 */
export function deriveLoaderUrl(serverUrl: string): string {
  const loaderUrl = loaderUrlOf(serverUrl);
  if (!loaderUrl) {
    // The value comes from agent output: keep it out of the UI and the thrown message.
    console.warn('serverUrl rejected:', String(serverUrl).slice(0, 100));
    throw new KalturaFailure('origin-not-allowed', 'serverUrl is not an allowed Unisphere origin (see setExtraAllowedOrigins)');
  }
  return loaderUrl;
}

/** The only dynamic import() of remote code. Rejects (never throws) for a bad serverUrl. */
export async function loadUnisphereModule<T>(serverUrl: string): Promise<T> {
  const loaderUrl = deriveLoaderUrl(serverUrl);
  return (await import(/* @vite-ignore */ loaderUrl)) as T;
}
