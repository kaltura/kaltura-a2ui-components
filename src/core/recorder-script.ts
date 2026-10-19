import { KalturaFailure } from './host-hooks';
import { resolveRegion } from './region';

/** The parts of the Express Recorder API we use. It is remote code: check every call. */
export interface ExpressRecorderOptions {
  ks: string;
  serviceUrl: string;
  playerUrl: string;
  partnerId: number;
  uiConfId: number;
  app: string;
  entryName?: string;
  allowVideo?: boolean;
  allowAudio?: boolean;
  allowScreenShare?: boolean;
  maxRecordingTime?: number;
}

export interface ExpressRecorderHandle {
  destroy?: () => void;
  instance?: { addEventListener?: (type: string, listener: (event: unknown) => void) => void };
}

export interface ExpressRecorderApi {
  create: (containerId: string, options: ExpressRecorderOptions) => ExpressRecorderHandle | undefined;
}

/**
 * How the script is loaded. `integrity` is an SRI hash (`sha384-...`). When
 * set, the loader adds `crossorigin="anonymous"` and reports a mismatch. The
 * default sets no hash (docs/adr/0005).
 */
export interface RecorderScript {
  integrity?: string;
}

export const RECORDER_SCRIPT: RecorderScript = {};

// The one fixed, versioned path. The host comes from the region, which only the host sets.
const SCRIPT_PATH = '/apps/expressrecorder/v2.2.10/express-recorder.js';

// Each load replaces `window.Kaltura.ExpressRecorder`, so the cache holds the last URL only.
let current: { url: string; loading: Promise<ExpressRecorderApi> } | undefined;

/** The script URL for a region. Fixed path. The host comes from the region the host app allows. */
export const recorderScriptUrl = (region?: string): string => `${resolveRegion(region).hosts.recorder}${SCRIPT_PATH}`;

/**
 * Loads the Express Recorder script of one region. Callers of the same URL
 * share one promise. A failed load is dropped from the cache, so the next
 * mount tries again. Rejects with a `KalturaFailure` whose message is fixed
 * text.
 */
export function loadRecorderScript(script: RecorderScript = RECORDER_SCRIPT, region?: string): Promise<ExpressRecorderApi> {
  let url: string;
  try {
    url = recorderScriptUrl(region);
  } catch (error) {
    return Promise.reject(error);
  }
  if (current?.url === url) return current.loading;

  const loading: Promise<ExpressRecorderApi> = new Promise<ExpressRecorderApi>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = url;
    if (script.integrity) {
      tag.setAttribute('integrity', script.integrity);
      tag.setAttribute('crossorigin', 'anonymous');
    }
    // A failed load must not stay cached: the next mount tries again.
    const fail = (message: string) => {
      tag.remove();
      if (current?.loading === loading) current = undefined;
      reject(new KalturaFailure('load-failed', message));
    };
    tag.onload = () => {
      const api = (window as { Kaltura?: { ExpressRecorder?: Partial<ExpressRecorderApi> } }).Kaltura?.ExpressRecorder;
      if (api?.create) resolve(api as ExpressRecorderApi);
      else fail('Recorder API is missing');
    };
    tag.onerror = () => fail(script.integrity ? 'Recorder script failed to load or failed its integrity check' : 'Recorder script failed to load');
    document.head.append(tag);
  });
  current = { url, loading };
  return loading;
}
