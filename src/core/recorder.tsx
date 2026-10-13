import { useContext, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { renderLoadError } from './render-load-error';
import { KalturaRecorderApi } from '../schemas/recorder';
import { checkProps, StrictPendingContext } from './validate-props';
import { withKs } from './ks';
import { emitEvent, invalidCode, KalturaFailure, reportError } from './host-hooks';
import { kalturaHosts } from './region';
import { isEntryId } from './ids';
import { loadRecorderScript, type ExpressRecorderHandle } from './recorder-script';

export interface RecorderCoreProps {
  partnerId: number;
  ks: string;
  uiconfId: number;
  entryName?: string;
  allowVideo?: boolean;
  allowAudio?: boolean;
  allowScreenShare?: boolean;
  maxRecordingTime?: number;
}

const RUNTIME_SCHEMA = KalturaRecorderApi.schema.required({ ks: true });

const detailOf = (event: unknown): { entryId?: unknown } => (event as { detail?: object } | null)?.detail ?? {};

const RecorderView: FC<RecorderCoreProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const strict = useContext(StrictPendingContext);
  const { partnerId, ks, uiconfId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime } = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // The error goes inside the container, so the shared wrapper is not used here.
    const optional = { entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime };
    const { invalid, pending } = checkProps(RUNTIME_SCHEMA, { partnerId, ks, uiconfId, ...optional }, strict);
    if (invalid.length) {
      renderLoadError(container, 'recorder', new KalturaFailure(invalidCode(invalid), `Invalid ${invalid.join(', ')}`), 'recorder');
      return () => {
        container.replaceChildren();
      };
    }
    if (pending) return;

    let cancelled = false;
    let recorder: ExpressRecorderHandle | undefined;
    // The script finds its container by id and builds its own UI inside it.
    const id = `kaltura-recorder-${crypto.randomUUID()}`;
    container.id = id;

    // A throwing remote must not break React's unmount.
    const destroy = () => {
      try {
        recorder?.destroy?.();
      } catch {
        // The recorder is gone either way.
      }
      recorder = undefined;
    };

    const hosts = kalturaHosts();
    loadRecorderScript()
      .then(api => {
        if (cancelled) return;
        recorder = api.create(id, {
          ks,
          serviceUrl: `${hosts.serviceUrl}/api_v3`,
          playerUrl: hosts.cdn,
          partnerId,
          uiConfId: uiconfId,
          app: 'a2ui',
          // JSON drops the props that are undefined.
          ...JSON.parse(JSON.stringify(optional)),
        });
        const instance = recorder?.instance;
        if (!instance?.addEventListener) throw new Error();
        // The recorder cannot remove a listener reliably, so late events are dropped here.
        instance.addEventListener('mediaUploadEnded', event => {
          if (cancelled) return;
          const { entryId } = detailOf(event);
          emitEvent({
            type: 'recorder-upload-ended',
            widget: 'recorder',
            detail: { ...(isEntryId(entryId) ? { entryId } : {}), instanceId: id },
          });
        });
        // Remote error text can hold the KS or markup. Never report it.
        instance.addEventListener('error', () => {
          if (cancelled) return;
          reportError('render-failed', 'recorder', 'Recorder error');
        });
      })
      .catch(err => {
        if (cancelled) return;
        // The recorder may have started before the failure. Stop it before the error replaces its UI.
        destroy();
        renderLoadError(container, 'recorder', err instanceof KalturaFailure ? err : new KalturaFailure('load-failed', 'Recorder could not start'), 'recorder');
      });

    return () => {
      cancelled = true;
      destroy();
      container.replaceChildren();
    };
  }, [partnerId, ks, uiconfId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, strict]);

  return (
    <div
      ref={containerRef}
      className="kaltura-recorder-container"
      style={{ aspectRatio: '16/9' }}
    />
  );
};

export const RecorderCore = withKs('recorder', RecorderView);
