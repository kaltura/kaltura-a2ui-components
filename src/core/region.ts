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

// serviceUrl, vod and kmc follow the Kaltura API guide, section 4. The guide lists no regional
// CDN host and the recorder uses the US path, so the player and the recorder use the web host.
const API_PREFIX: Record<Exclude<KalturaRegion, 'nvp1'>, string> = { irp2: 'eu', frp2: 'de', cap2: 'ca', syp2: 'ap' };
const WEB_HOST: Record<Exclude<KalturaRegion, 'nvp1'>, string> = {
  irp2: 'https://api.eu.kaltura.com',
  frp2: 'https://api.de.kaltura.com',
  cap2: 'https://api.cap2.ovp.kaltura.com',
  syp2: 'https://api.syp2.ovp.kaltura.com',
};

const KMC_HOST: Record<Exclude<KalturaRegion, 'nvp1'>, string> = {
  irp2: 'https://kmc.irp2.ovp.kaltura.com',
  frp2: 'https://kmc.de.kaltura.com',
  cap2: 'https://kmc.ca.kaltura.com',
  syp2: 'https://kmc.ap.kaltura.com',
};

/** The loader takes the workspace region from `env`, not from its own URL. Extra origins send none. */
export function regionOf(serverUrl: string): KalturaRegion | undefined {
  const region = /^https:\/\/unisphere\.([a-z0-9]+)\.ovp\.kaltura\.com(?:\/|$)/.exec(serverUrl)?.[1];
  return KALTURA_REGIONS.find(code => code === region);
}

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

/** The region set by `setRegion`. */
export const currentRegion = (): KalturaRegion => region;

/** Hosts for the current region. */
export function kalturaHosts(): KalturaHosts {
  if (region === 'nvp1') return US;
  const web = WEB_HOST[region];
  return { serviceUrl: `https://api.${API_PREFIX[region]}.kaltura.com`, cdn: web, vod: `https://cfvod.${region}.ovp.kaltura.com`, kmc: KMC_HOST[region], recorder: web };
}
