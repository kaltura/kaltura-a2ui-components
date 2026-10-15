import { KalturaFailure } from './host-hooks';
import { resolveRegion } from './region';

/** The parts of the Kaltura Player API we use. It is remote code: check every call. */
export interface PlayerSetupConfig {
  targetId: string;
  provider: { partnerId: number; uiConfId: number; ks?: string; useHeaderForKs: boolean };
  playback: { autoplay?: boolean; muted?: boolean };
}

export interface PlayerHandle {
  destroy?: () => void;
  loadMedia?: (info: { entryId: string }, options?: { seekFrom?: number; clipTo?: number }) => Promise<unknown>;
  loadPlaylist?: (info: { playlistId: string }) => Promise<unknown>;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  Event?: { ERROR?: string };
}

export interface PlayerApi {
  setup: (config: PlayerSetupConfig) => PlayerHandle | undefined;
}

/**
 * The bundle is built per uiconf and its version is set by the customer admin in KMC, so it has no SRI
 * (docs/adr/0008). It runs in the page origin and can read the KS.
 */
export const playerScriptUrl = (partnerId: number, uiconfId: number, region?: string): string =>
  `${resolveRegion(region).hosts.cdn}/p/${partnerId}/embedPlaykitJs/partner_id/${partnerId}/uiconf_id/${uiconfId}`;

// Each bundle replaces `window.KalturaPlayer`. The API is read right after the
// bundle runs, and the bundle is loaded again when another one ran in between.
let current: { url: string; loading: Promise<PlayerApi> } | undefined;

/**
 * Loads the player bundle of one uiconf. Callers of the same bundle share one
 * promise. A failed load is dropped from the cache, so the next mount tries
 * again. Rejects with a `KalturaFailure` whose message is fixed text.
 */
export function loadPlayerScript(partnerId: number, uiconfId: number, region?: string): Promise<PlayerApi> {
  let url: string;
  try {
    url = playerScriptUrl(partnerId, uiconfId, region);
  } catch (error) {
    return Promise.reject(error);
  }
  if (current?.url === url) return current.loading;

  const loading = new Promise<PlayerApi>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = url;
    tag.async = true;
    const fail = (message: string) => {
      tag.remove();
      if (current?.loading === loading) current = undefined;
      reject(new KalturaFailure('load-failed', message));
    };
    tag.onload = () => {
      const api = (window as { KalturaPlayer?: Partial<PlayerApi> }).KalturaPlayer;
      tag.remove();
      if (api?.setup) resolve(api as PlayerApi);
      else fail('Player API is missing');
    };
    tag.onerror = () => fail('Player script failed to load. Check partnerId, uiconfId, region and CSP');
    document.head.append(tag);
  });
  current = { url, loading };
  return loading;
}
