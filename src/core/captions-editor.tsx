import type { FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaCaptionsEditorApi } from '../schemas/captions-editor';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { kalturaHosts } from './region';

export interface CaptionsEditorCoreProps {
  partnerId: number;
  ks: string;
  entryId: string;
  uiconfId?: number;
}

export function buildCaptionsEditorUrl(p: CaptionsEditorCoreProps): string {
  if (!isPositiveInt(p.partnerId)) throw new Error('Invalid partnerId');
  if (!isEntryId(p.entryId)) throw new Error('Invalid entryId');
  if (p.uiconfId != null && !isPositiveInt(p.uiconfId)) throw new Error('Invalid uiconfId');
  const hosts = kalturaHosts();
  let src =
    `https://www.kaltura.com/apps/captionstudio/latest/index.html` +
    `?pid=${p.partnerId}` +
    `&ks=${encodeURIComponent(p.ks)}` +
    `&entryid=${encodeURIComponent(p.entryId)}` +
    `&cdnurl=${hosts.cdn}` +
    `&serviceurl=${hosts.serviceUrl}`;
  if (p.uiconfId != null) src += `&uiconfid=${p.uiconfId}`;
  return src;
}

const CaptionsEditorView: FC<CaptionsEditorCoreProps> = (props) => {
  let src: string;
  try {
    src = buildCaptionsEditorUrl(props);
  } catch (e) {
    return <LoadError widget="captions-editor">{`Failed to load captions editor: ${(e as Error).message}`}</LoadError>;
  }
  return (
    <div className="kaltura-captions-editor-container" style={{ width: '100%', minHeight: '600px' }}>
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', minHeight: '600px', border: 0 }}
        allow="autoplay *; fullscreen *; encrypted-media *"
        allowFullScreen
        title="Kaltura Captions Editor"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
};

export const CaptionsEditorCore = withKs(
  'captions-editor',
  withValidatedProps(KalturaCaptionsEditorApi.schema.required({ ks: true }), 'captions editor', CaptionsEditorView, 'captions-editor'),
);
