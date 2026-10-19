import { KalturaFailure } from './host-hooks';
import { regionAllowed } from './allowed-ids';

/** Kaltura multi-tenant cloud regions. Source and status of each host: docs/host-api.md. */
export const KALTURA_REGIONS = ['nvp1', 'irp2', 'frp2', 'cap2', 'syp2', 'sgp2'] as const;
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

// Hosts follow the Kaltura firewall guide, and prefer its `.ovp` hosts. The player and the recorder
// use the API host. KMC hosts use `.ovp`, except sgp2: `kmc.sg.kaltura.com`.
const KMC_HOST: Record<Exclude<KalturaRegion, 'nvp1'>, string> = {
  irp2: 'https://kmc.irp2.ovp.kaltura.com',
  frp2: 'https://kmc.frp2.ovp.kaltura.com',
  cap2: 'https://kmc.cap2.ovp.kaltura.com',
  syp2: 'https://kmc.syp2.ovp.kaltura.com',
  sgp2: 'https://kmc.sg.kaltura.com',
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
 * @example setRegion('irp2');
 */
export function setRegion(code: KalturaRegion): void {
  if (!KALTURA_REGIONS.includes(code)) throw new Error(`Unknown Kaltura region. Use ${KALTURA_REGIONS.join(', ')}`);
  region = code;
}

/** The region set by `setRegion`. */
export const currentRegion = (): KalturaRegion => region;

/** Hosts for a region. Default: the region set with `setRegion`. */
export function kalturaHosts(code: KalturaRegion = region): KalturaHosts {
  if (code === 'nvp1') return US;
  const api = `https://api.${code}.ovp.kaltura.com`;
  return { serviceUrl: api, cdn: api, vod: `https://cfvod.${code}.ovp.kaltura.com`, kmc: KMC_HOST[code], recorder: api };
}

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

const environments = new Map<string, { hosts: KalturaHosts; unisphere?: string; agents?: string }>();

const NAME = /^[a-z][a-z0-9-]{0,31}$/;
const PRIVATE_IP = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/;
const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '[::1]' || PRIVATE_IP.test(hostname);

/** An origin only: no path, query, hash or userinfo. `http:` only for localhost and private IPs. */
function environmentOrigin(name: string, key: string, value: unknown): string {
  const fail = (why: string): never => {
    throw new Error(`Environment ${JSON.stringify(name)}: ${key} ${why}`);
  };
  if (typeof value !== 'string') return fail('must be a string');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail('is not a URL');
  }
  if (value !== url.origin && value !== `${url.origin}/`) return fail('must be an origin only (no path, query or userinfo)');
  if (url.protocol === 'http:') {
    if (!isLocalHost(url.hostname)) return fail('may use http: only for localhost and private IPs');
    console.warn(`Environment ${name}: ${key} uses clear-text http. The KS is sent without encryption.`);
  } else if (url.protocol !== 'https:') return fail('must use https:');
  return url.origin;
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
export function setEnvironments(next: Record<string, KalturaEnvironment> | undefined): void {
  const parsed = new Map<string, { hosts: KalturaHosts; unisphere?: string; agents?: string }>();
  for (const [name, environment] of Object.entries(next ?? {})) {
    if (!NAME.test(name) || (KALTURA_REGIONS as readonly string[]).includes(name)) {
      throw new Error(`Environment name ${JSON.stringify(name)} must be lowercase letters, digits and "-", and not a region code`);
    }
    const origin = (key: keyof KalturaEnvironment) => (environment[key] === undefined ? undefined : environmentOrigin(name, key, environment[key]));
    const serviceUrl = origin('serviceUrl');
    if (serviceUrl === undefined) throw new Error(`Environment ${JSON.stringify(name)}: serviceUrl is required`);
    parsed.set(name, {
      hosts: {
        serviceUrl,
        cdn: origin('cdn') ?? serviceUrl,
        vod: origin('vod') ?? serviceUrl,
        kmc: origin('kmc') ?? serviceUrl,
        recorder: origin('recorder') ?? serviceUrl,
      },
      unisphere: origin('unisphere'),
      agents: origin('agents'),
    });
  }
  environments.clear();
  for (const [name, value] of parsed) environments.set(name, value);
}

/** The Unisphere origins of the registered environments. The loader accepts these next to the Kaltura ones. */
export const environmentUnisphereOrigins = (): string[] => [...environments.values()].flatMap(({ unisphere }) => (unisphere ? [unisphere] : []));

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
export function resolveRegion(prop?: string, serverUrl?: string): ResolvedRegion {
  let urlOrigin: string | undefined;
  try {
    urlOrigin = new URL(serverUrl ?? '').origin;
  } catch {
    // Not a URL: the allowlist in the loader reports it.
  }
  const fromUrl = regionOf(serverUrl ?? '') ?? [...environments].find(([, { unisphere }]) => unisphere !== undefined && unisphere === urlOrigin)?.[0];
  const name = prop ?? fromUrl ?? region;
  const refuse = (): never => {
    throw new KalturaFailure('origin-not-allowed', 'region is not allowed');
  };
  if ((prop !== undefined && fromUrl !== undefined && prop !== fromUrl) || !regionAllowed(name)) return refuse();
  const environment = environments.get(name);
  if (environment) return { name, hosts: environment.hosts, unisphere: environment.unisphere, agents: environment.agents };
  const code = KALTURA_REGIONS.find(known => known === name);
  return code
    ? { name, hosts: kalturaHosts(code), unisphere: code === 'sgp2' ? undefined : `https://unisphere.${code}.ovp.kaltura.com`, agents: `https://agents-manager.${code}.ovp.kaltura.com` }
    : refuse();
}

/**
 * The Unisphere URL of one instance: `serverUrl`, else the Unisphere host of its region. Throws like `resolveRegion`.
 * Always ends in `/v1`: the loader reads its region from that exact form and refuses a bare origin or a trailing slash.
 */
export function unisphereUrl(prop?: string, serverUrl?: string): string {
  const { unisphere } = resolveRegion(prop, serverUrl);
  if (!unisphere) throw new KalturaFailure('origin-not-allowed', 'region has no Unisphere host');
  return `${serverUrl ? new URL(serverUrl).origin : unisphere}/v1`;
}

/** The Agents Manager API URL of one instance. Throws like `resolveRegion`, and when the region has no Agents host. */
export function agentsUrl(prop?: string, serverUrl?: string): string {
  const { agents } = resolveRegion(prop, serverUrl);
  if (!agents) throw new KalturaFailure('origin-not-allowed', 'region has no Agents host');
  return `${agents}/api/v1`;
}
