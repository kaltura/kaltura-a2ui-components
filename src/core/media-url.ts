import { parseOrigin } from './unisphere-loader';

/**
 * Kaltura CDN allowlist: https only, default port, no credentials, and a host
 * that is `kaltura.com` or a subdomain of it. This covers the hosts used in
 * this repo (cdnapisec.kaltura.com, cfvod.kaltura.com). Returns the
 * normalised URL, or '' when the URL is not allowed.
 */
export function toKalturaCdnUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  let url: URL;
  try {
    url = new URL(value); // no base: relative and protocol-relative URLs throw
  } catch {
    return '';
  }
  const { protocol, username, password, port, hostname } = url;
  const kalturaHost = hostname === 'kaltura.com' || hostname.endsWith('.kaltura.com');
  return protocol === 'https:' && !username && !password && !port && kalturaHost ? url.href : '';
}

let extraMediaOrigins: string[] = [];

/**
 * Host option. Adds https origins that the basic Image, Video and AudioPlayer
 * may load from, next to the Kaltura hosts. Replaces the previous list.
 * Throws on an entry that is not an https origin. Never call this from agent output.
 * @example setExtraMediaOrigins(['https://cdn.example.com']);
 */
export function setExtraMediaOrigins(origins: string[]): void {
  extraMediaOrigins = origins.map(parseOrigin);
}

// A media URL is a GET the browser sends by itself. It must not run a Kaltura
// API action or carry a KS, even one bound from the data model.
const API_OR_KS = /api_v3|partnerservices2|[?&/:;]ks[=/]/i;

/** True for an https URL on a Kaltura host or a host-added origin, with no API path or KS. */
export function isAllowedMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  let url: URL;
  try {
    url = new URL(value);
    if (API_OR_KS.test(decodeURIComponent(url.pathname + url.search))) return false;
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  return toKalturaCdnUrl(value) !== '' || (url.protocol === 'https:' && extraMediaOrigins.includes(url.origin));
}
