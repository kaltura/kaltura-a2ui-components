import type { FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaCaptionsEditorApi } from '../schemas/captions-editor';
import { withValidatedProps } from './validate-props';

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
  const params = new URLSearchParams({
    pid: String(p.partnerId),
    ks: p.ks,
    entryid: p.entryId,
    cdnurl: 'https://cdnapisec.kaltura.com',
    serviceurl: 'https://www.kaltura.com',
  });
  if (p.uiconfId != null) params.set('uiconfid', String(p.uiconfId));
  return `https://www.kaltura.com/apps/captionstudio/latest/index.html?${params}`;
}

export const buildCaptionsUrl = buildCaptionsEditorUrl;

const CaptionsEditorView: FC<CaptionsEditorCoreProps> = (props) => {
  let src: string;
  try {
    src = buildCaptionsEditorUrl(props);
  } catch (e) {
    return <div className="kaltura-load-error">Failed to load captions editor: {(e as Error).message}</div>;
  }
  return (
    <div className="kaltura-captions-editor-container" style={{ width: '100%', minHeight: '600px' }}>
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', minHeight: '600px', border: 0 }}
        allow="autoplay *; fullscreen *; encrypted-media *; camera *; microphone *"
        allowFullScreen
        title="Kaltura Captions Editor"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
};

export const CaptionsEditorCore = withValidatedProps(KalturaCaptionsEditorApi.schema, 'captions editor', CaptionsEditorView);
