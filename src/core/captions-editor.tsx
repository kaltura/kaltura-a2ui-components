import type { FC } from 'react';

export interface CaptionsEditorCoreProps {
  partnerId: number;
  ks: string;
  entryId: string;
  uiconfId?: number;
}

export function buildCaptionsEditorUrl(p: CaptionsEditorCoreProps): string {
  let src =
    `https://www.kaltura.com/apps/captionstudio/latest/index.html` +
    `?pid=${p.partnerId}` +
    `&ks=${encodeURIComponent(p.ks)}` +
    `&entryid=${encodeURIComponent(p.entryId)}` +
    `&cdnurl=https://cdnapisec.kaltura.com` +
    `&serviceurl=https://www.kaltura.com`;
  if (p.uiconfId) src += `&uiconfid=${p.uiconfId}`;
  return src;
}

export const CaptionsEditorCore: FC<CaptionsEditorCoreProps> = (props) => {
  const src = buildCaptionsEditorUrl(props);
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
