/** Kaltura multi-tenant cloud regions. Source and status of each host: docs/host-api.md. */
export const KALTURA_REGIONS = ['nvp1', 'irp2', 'frp2', 'cap2', 'syp2'] as const;
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

const US: KalturaHosts = {
  serviceUrl: 'https://www.kaltura.com',
  cdn: 'https://cdnapisec.kaltura.com',
  vod: 'https://cfvod.kaltura.com',
  kmc: 'https://kmc.kaltura.com',
  recorder: 'https://www.kaltura.com',
};

// Only hosts the Kaltura API guide lists change by region. cdn, kmc and
// recorder have no documented regional host, so they stay on the US host.
const API_PREFIX: Record<Exclude<KalturaRegion, 'nvp1'>, string> = { irp2: 'eu', frp2: 'de', cap2: 'ca', syp2: 'ap' };

let region: KalturaRegion = 'nvp1';

/**
 * Host option. Sets the region of the Kaltura account. Default `nvp1` (US).
 * Call it before the widgets mount. Throws on an unknown code. Never call
 * this from agent output.
 */
export function setRegion(code: KalturaRegion): void {
  if (!KALTURA_REGIONS.includes(code)) throw new Error('Unknown Kaltura region');
  region = code;
}

/** Hosts for the current region. */
export function kalturaHosts(): KalturaHosts {
  if (region === 'nvp1') return US;
  return { ...US, serviceUrl: `https://api.${API_PREFIX[region]}.kaltura.com`, vod: `https://cfvod.${region}.ovp.kaltura.com` };
}
