import { KalturaFailure } from './host-hooks';
import { kalturaHosts } from './region';

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
 * How the script is loaded. `integrity` is an SRI hash (`sha384-...`).
 * Kaltura serves `express-recorder.js` with no `Access-Control-Allow-Origin`
 * header and has no versioned path, so a `crossorigin` request fails and SRI
 * cannot be used yet (docs/adr/0005). Set `integrity` here once it can. The
 * loader then adds `crossorigin="anonymous"` and reports a mismatch.
 */
export interface RecorderScript {
  integrity?: string;
}

export const RECORDER_SCRIPT: RecorderScript = {};

// The one fixed path. The host comes from the region, which only the host sets.
const SCRIPT_PATH = '/apps/expressrecorder/latest/express-recorder.js';

let loading: Promise<ExpressRecorderApi> | undefined;

/** The script URL for the current region. Fixed host and path, no input from props. */
export const recorderScriptUrl = (): string => `${kalturaHosts().recorder}${SCRIPT_PATH}`;

/**
 * Loads the Express Recorder script once per page. Every caller shares the
 * same promise, also after a region change: the script is the same on every
 * Kaltura host. A failed load is dropped from the cache, so the
 * next mount tries again. Rejects with a `KalturaFailure` whose message is
 * fixed text.
 */
export function loadRecorderScript(script: RecorderScript = RECORDER_SCRIPT): Promise<ExpressRecorderApi> {
  if (loading) return loading;

  loading = new Promise<ExpressRecorderApi>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = recorderScriptUrl();
    if (script.integrity) {
      tag.setAttribute('integrity', script.integrity);
      tag.setAttribute('crossorigin', 'anonymous');
    }
    // A failed load must not stay cached: the next mount tries again.
    const fail = (message: string) => {
      tag.remove();
      loading = undefined;
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
  return loading;
}
