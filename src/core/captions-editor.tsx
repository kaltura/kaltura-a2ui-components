import { useContext, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { KalturaCaptionsEditorApi } from '../schemas/captions-editor';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { resolveRegion, type KalturaHosts } from './region';
import { KalturaFailure, ReporterContext } from './host-hooks';
import { renderLoadError } from './render-load-error';

// Serves the editor page with a <base> tag and CORS open. Pinned to v1.3.10: `latest` is an alias
// that Kaltura moves by hand.
const EDITOR_PATH = '/apps/captionstudio/v1.3.10/embed.php';

// sha384 of the v1.3.10 page and of the two files it loads. Change them with EDITOR_PATH.
// `embed.php` writes the service host into its <base> tag, so its hash differs per host.
// The player bundle that the editor loads from the CDN is not pinned.
const EDITOR_PAGE_INTEGRITY: Record<string, string> = {
  'https://www.kaltura.com': 'sha384-HajZJL7XrUQ8Z7IPRBS0KXRI4J5/fQ83kcyvxaVfGoi2pKKD4sWGltXVnNjZ6bFJ',
  'https://api.irp2.ovp.kaltura.com': 'sha384-eP8a9KFBm9rMOGwCdQuqsY9OF14VdPenUszLZnAQo5Pc54X5JHWU5LeoGHVD2eyT',
  'https://api.frp2.ovp.kaltura.com': 'sha384-iRoamKdTKbBhVGve/kBdtlN/FHVupoFqknGRres+sqCL78iBOZrQlyg7z6L9PsfY',
  'https://api.cap2.ovp.kaltura.com': 'sha384-o/ib5DNV+tst92V6IfwsVg8kwma0GCeAi/9pcdKgjS1Z8g1a53QBAIaPPc6k078c',
  'https://api.syp2.ovp.kaltura.com': 'sha384-D9IkCxcrAjcXDfL1R8hLj45Aw9KL+jOrgIoJip4OdWXl6yAtK4AJVOHF96Oef/oS',
};
const EDITOR_ASSET_INTEGRITY: Record<string, string> = {
  './static/js/main.6315bf26.js': 'sha384-iYhkCPdMwqiJ1wjyPCV5MqsbuVv3oGWa++mhGj30xoyxj1cCaAWEQXB9nuy+dBU0',
  './static/css/main.74b8a353.css': 'sha384-2kxBNi7/SGtDcBTjMkIn4DH7vjmBIfgHZ2WWhIto/1JNh+d+34SV0fScG987xwlZ',
};
const PAGE_TIMEOUT_MS = 15_000;
const PAGE_MAX_BYTES = 1024 * 1024;

/** The page text, read only up to the size cap. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error();
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    size += part.value.byteLength;
    if (size > PAGE_MAX_BYTES) {
      void reader.cancel();
      throw new Error();
    }
    text += decoder.decode(part.value, { stream: true });
  }
  return text + decoder.decode();
}

/** The page with a hash and `crossorigin` on every script and stylesheet. Throws on one that has no pinned hash. */
function pinAssets(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of doc.querySelectorAll('script, link[rel~="stylesheet"]')) {
    if (el.hasAttribute('integrity')) continue;
    const ref = el.getAttribute('src') ?? el.getAttribute('href') ?? '';
    const integrity = Object.hasOwn(EDITOR_ASSET_INTEGRITY, ref) ? EDITOR_ASSET_INTEGRITY[ref] : undefined;
    if (!integrity) throw new Error();
    el.setAttribute('integrity', integrity);
    el.setAttribute('crossorigin', 'anonymous');
  }
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

export interface CaptionsEditorCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Kaltura Session. The host KS provider is used first. */
  ks: string;
  /** Entry whose captions to edit. */
  entryId: string;
  /** Caption asset to open. Default: the editor picks. */
  assetId?: string;
  /** Region code. Only built-in regions with a pinned editor page work. Default: the host region. */
  region?: string;
  /** uiConf ID of the editor's own player. */
  uiconfId?: number;
}

/**
 * The editor reads its settings from `data-*` attributes on its own iframe
 * when the URL has none (closed-captions-studio README). That needs the
 * iframe to share our origin, so its page is loaded into a blob URL. The KS
 * is set on the element and never appears in a URL. The editor runs in the
 * page origin, so the iframe sandbox is not a boundary (docs/adr/0008).
 */
const CaptionsEditorView: FC<CaptionsEditorCoreProps> = props => {
  const { partnerId, ks, region, entryId, assetId, uiconfId } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const reporter = useContext(ReporterContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let blobUrl: string | undefined;
    let hosts: KalturaHosts;

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), PAGE_TIMEOUT_MS);

    // The page runs in our origin: take it only from the region host, as HTML, with no redirect,
    // and only if it matches the pinned hash, within a time and size limit.
    Promise.resolve()
      .then(() => {
        hosts = resolveRegion(region).hosts;
        const integrity = EDITOR_PAGE_INTEGRITY[hosts.serviceUrl];
        if (!integrity) throw new Error();
        return fetch(`${hosts.serviceUrl}${EDITOR_PATH}`, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', integrity, signal: abort.signal });
      })
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) throw new Error();
        return readCapped(res);
      })
      .then(html => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(new Blob([pinAssets(html)], { type: 'text/html' }));
        const frame = document.createElement('iframe');
        frame.title = 'Kaltura Captions Editor';
        frame.allow = ['autoplay', 'fullscreen', 'encrypted-media'].map(feature => `${feature} 'self' ${hosts.cdn}`).join('; ');
        frame.allowFullscreen = true;
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
        frame.style.cssText = 'width:100%;height:100%;min-height:600px;border:0';
        const data: Record<string, string | number | undefined> = {
          pid: partnerId,
          ks,
          entryid: entryId,
          assetid: assetId || undefined,
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
      .catch(error => {
        if (cancelled) return;
        renderLoadError(container, 'captions editor', error instanceof KalturaFailure && error.code === 'origin-not-allowed' ? error : new KalturaFailure('load-failed', 'Captions editor could not start'), 'captions-editor', reporter);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abort.abort();
      container.replaceChildren();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [partnerId, ks, region, entryId, assetId, uiconfId, reporter]);

  return <div ref={containerRef} className="kaltura-captions-editor-container" style={{ width: '100%', minHeight: '600px' }} />;
};

export const CaptionsEditorCore = withKs(
  'captions-editor',
  withValidatedProps(withKsProp(KalturaCaptionsEditorApi.schema), 'captions editor', CaptionsEditorView, 'captions-editor'),
  { schema: KalturaCaptionsEditorApi.schema, label: 'captions editor' },
);
