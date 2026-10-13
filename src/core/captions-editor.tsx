import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaCaptionsEditorApi } from '../schemas/captions-editor';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { kalturaHosts } from './region';
import { KalturaFailure } from './host-hooks';
import { renderLoadError } from './render-load-error';

// Serves the editor page with a <base> tag and CORS open. The version is `latest`: Kaltura has no pinned path.
const EDITOR_PATH = '/apps/captionstudio/latest/embed.php';

export interface CaptionsEditorCoreProps {
  partnerId: number;
  ks: string;
  entryId: string;
  uiconfId?: number;
}

/** The first prop that cannot be used, or `undefined`. */
const invalidProp = (p: CaptionsEditorCoreProps): string | undefined =>
  !isPositiveInt(p.partnerId) ? 'partnerId' : !isEntryId(p.entryId) ? 'entryId' : p.uiconfId != null && !isPositiveInt(p.uiconfId) ? 'uiconfId' : undefined;

/**
 * The editor reads its settings from `data-*` attributes on its own iframe
 * when the URL has none (closed-captions-studio README). That needs the
 * iframe to share our origin, so its page is loaded into a blob URL. The KS
 * is set on the element and never appears in a URL. The editor runs in the
 * page origin, so the iframe sandbox is not a boundary (docs/adr/0008).
 */
const CaptionsEditorView: FC<CaptionsEditorCoreProps> = props => {
  const { partnerId, ks, entryId, uiconfId } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const invalid = invalidProp(props);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || invalid) return;

    let cancelled = false;
    let blobUrl: string | undefined;
    const hosts = kalturaHosts();

    // The page runs in our origin: take it only from the region host, as HTML, with no redirect.
    fetch(`${hosts.serviceUrl}${EDITOR_PATH}`, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) throw new Error();
        return res.text();
      })
      .then(html => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        const frame = document.createElement('iframe');
        frame.title = 'Kaltura Captions Editor';
        frame.allow = 'autoplay *; fullscreen *; encrypted-media *';
        frame.allowFullscreen = true;
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
        frame.style.cssText = 'width:100%;height:100%;min-height:600px;border:0';
        const data: Record<string, string | number | undefined> = {
          pid: partnerId,
          ks,
          entryid: entryId,
          cdnurl: hosts.cdn,
          serviceurl: hosts.serviceUrl,
          uiconfid: uiconfId,
        };
        for (const [name, value] of Object.entries(data)) {
          if (value !== undefined) frame.setAttribute(`data-${name}`, String(value));
        }
        frame.src = blobUrl;
        container.replaceChildren(frame);
      })
      .catch(() => {
        if (cancelled) return;
        renderLoadError(container, 'captions editor', new KalturaFailure('load-failed', 'Captions editor could not start'), 'captions-editor');
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [partnerId, ks, entryId, uiconfId, invalid]);

  if (invalid) return <LoadError widget="captions-editor">{`Failed to load captions editor: Invalid ${invalid}`}</LoadError>;
  return <div ref={containerRef} className="kaltura-captions-editor-container" style={{ width: '100%', minHeight: '600px' }} />;
};

export const CaptionsEditorCore = withKs(
  'captions-editor',
  withValidatedProps(KalturaCaptionsEditorApi.schema.required({ ks: true }), 'captions editor', CaptionsEditorView, 'captions-editor'),
);
