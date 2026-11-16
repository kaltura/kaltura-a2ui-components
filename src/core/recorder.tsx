import { useContext, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { renderLoadError } from './render-load-error';
import { KalturaRecorderApi } from '../schemas/recorder';
import { checkProps, invalidText, StrictPendingContext, topLevelProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { emitEvent, invalidCode, KalturaFailure, ReporterContext } from './host-hooks';
import { regionOf, resolveRegion, unisphereUrl } from './region';
import { isAllowedServerUrl } from './unisphere-loader';
import { isEntryId } from './ids';
import { refusedIdProp } from './allowed-ids';

export interface RecorderCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Kaltura Session. The host KS provider is used first. */
  ks: string;
  /** Region code. Default: the host region. A region without a Unisphere host is refused. */
  region?: string;
  /** Player (uiConf) ID that plays the recording back. */
  uiconfId: number;
  /** Name of the new entry. */
  entryName?: string;
  /** Allow webcam video. */
  allowVideo?: boolean;
  /** Allow audio only. */
  allowAudio?: boolean;
  /** Allow screen recording. */
  allowScreenShare?: boolean;
  /** Longest recording in seconds. At most 86400. */
  maxRecordingTime?: number;
  /** Fixes the capture orientation and the frame shape. */
  orientation?: 'portrait' | 'landscape';
  /** A script that opens in the teleprompter. */
  prompterText?: string;
}

const RUNTIME_SCHEMA = withKsProp(KalturaRecorderApi.schema);

/** Pinned loader page of the `recorder-assets` build. Bump it with a release. */
const RECORDER_LOADER_VERSION = '1.0.6';
const LOAD_TIMEOUT_MS = 15_000;
// The recorder page sizes itself from the frame, so the host sets the shape.
const SHAPE = {
  landscape: { aspectRatio: '800 / 480', maxWidth: '800px' },
  portrait: { aspectRatio: '480 / 800', maxWidth: '480px' },
} as const;
type Orientation = keyof typeof SHAPE;

const asOrientation = (value: unknown): Orientation | undefined => (value === 'portrait' || value === 'landscape' ? value : undefined);

interface UploadedEntry {
  entryId: string;
  source: 'camera' | 'screen';
  role: 'primary' | 'secondary';
}

/**
 * The `uploadComplete` payload is a JSON string. One loader build sends
 * `{ entries: [...] }` and an older one sends one entry per message, so both are read.
 * Only fixed words and valid ids are kept.
 */
function uploadedEntries(payload: unknown): UploadedEntry[] {
  let data: unknown;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : undefined;
  } catch {
    return [];
  }
  const list = (data as { entries?: unknown } | null)?.entries;
  const items = Array.isArray(list) ? list : data && typeof data === 'object' ? [data] : [];
  return items.flatMap((item: { entryId?: unknown; source?: unknown; role?: unknown } | null): UploadedEntry[] =>
    item && isEntryId(item.entryId)
      ? [{ entryId: item.entryId, source: item.source === 'screen' ? 'screen' : 'camera', role: item.role === 'secondary' ? 'secondary' : 'primary' }]
      : [],
  );
}

const RecorderView: FC<RecorderCoreProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const strict = useContext(StrictPendingContext);
  const reporter = useContext(ReporterContext);
  const { partnerId, ks, region, uiconfId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, orientation, prompterText } = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // The error goes inside the container, so the shared wrapper is not used here.
    const optional = { entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, orientation, prompterText };
    const { invalid, pending } = checkProps(RUNTIME_SCHEMA, { partnerId, ks, region, uiconfId, ...optional }, strict);
    const fail = (failure: KalturaFailure) => {
      renderLoadError(container, 'recorder', failure, 'recorder', reporter);
      return () => {
        container.replaceChildren();
      };
    };
    if (invalid.length) return fail(new KalturaFailure(invalidCode(invalid), invalidText(invalid), topLevelProps(RUNTIME_SCHEMA, invalid)));
    if (pending) return;
    const refused = refusedIdProp({ partnerId, uiconfId });
    if (refused) return fail(new KalturaFailure('origin-not-allowed', `${refused} is not allowed`));

    // The loader page builds its Unisphere host from a region code, so a custom environment cannot use it.
    let origin: string;
    let env: string | undefined;
    let hosts;
    try {
      hosts = resolveRegion(region).hosts;
      origin = new URL(unisphereUrl(region)).origin;
      env = isAllowedServerUrl(origin) ? regionOf(origin) : undefined;
    } catch (err) {
      return fail(err instanceof KalturaFailure ? err : new KalturaFailure('origin-not-allowed', 'region is not allowed'));
    }
    if (!env) return fail(new KalturaFailure('origin-not-allowed', 'region has no Unisphere host'));

    const id = `kaltura-recorder-${crypto.randomUUID()}`;
    const frame = document.createElement('iframe');
    frame.src = `${origin}/v1/static/applications/recorder/recorder-assets/${RECORDER_LOADER_VERSION}/assets/loader/loader.html?parentOrigin=${encodeURIComponent(window.location.origin)}`;
    frame.title = 'Kaltura recorder';
    frame.allow = 'camera; microphone; display-capture; fullscreen';
    frame.referrerPolicy = 'strict-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');
    const shape = (value: Orientation) => {
      frame.style.cssText = `display:block;width:100%;border:0;aspect-ratio:${SHAPE[value].aspectRatio};max-width:${SHAPE[value].maxWidth}`;
    };
    shape(orientation ?? 'landscape');
    container.replaceChildren(frame);

    // The KS goes only to the pinned Unisphere origin and only to our own frame.
    const config = {
      ks,
      serviceUrl: hosts.serviceUrl,
      playerUrl: hosts.cdn,
      partnerId,
      uiConfId: uiconfId,
      // JSON drops the props that are undefined.
      ...JSON.parse(JSON.stringify({ entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime })),
      recorderConfig: { saveMode: 'kaltura', ...JSON.parse(JSON.stringify({ orientation, prompterText })) },
    };

    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) fail(new KalturaFailure('load-failed', 'Recorder could not start'));
    }, LOAD_TIMEOUT_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      const data = event.data as { messageType?: unknown; payload?: unknown } | null;
      if (data === null || typeof data !== 'object') return;
      if (data.messageType === 'recorderInit') {
        ready = true;
        clearTimeout(timer);
        frame.contentWindow?.postMessage({ messageType: 'loadRecorder', payload: { config, env } }, origin);
      } else if (data.messageType === 'orientationChanged') {
        const next = asOrientation((data.payload as { orientation?: unknown } | null)?.orientation);
        if (next) shape(next);
      } else if (data.messageType === 'uploadComplete') {
        const entries = uploadedEntries(data.payload);
        const primary = entries.find(entry => entry.role === 'primary') ?? entries[0];
        if (!primary) return;
        emitEvent({
          type: 'recorder-upload-ended',
          widget: 'recorder',
          detail: { entryId: primary.entryId, ...(entries.length > 1 ? { entries } : {}), instanceId: id },
        }, reporter);
      }
      // Every other message is ignored, including the `cameraBlob` and `screenBlob` fields.
    };
    window.addEventListener('message', onMessage);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      container.replaceChildren();
    };
  }, [partnerId, ks, region, uiconfId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, orientation, prompterText, strict, reporter]);

  return <div ref={containerRef} className="kaltura-recorder-container" />;
};

export const RecorderCore = withKs('recorder', RecorderView, { schema: KalturaRecorderApi.schema, label: 'recorder' });
