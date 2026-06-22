import { useEffect, useRef } from 'react';
import type { FC } from 'react';

export interface RecorderCoreProps {
  partnerId: number;
  ks: string;
  uiconfId?: number;
  category?: string;
  entryName?: string;
  allowScreen?: boolean;
  allowCamera?: boolean;
}

export const RecorderCore: FC<RecorderCoreProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let killed = false;

    const src =
      `https://www.kaltura.com/index.php/extwidget/preview` +
      `/partner_id/${props.partnerId}` +
      `/uiconf_id/${props.uiconfId || 0}` +
      `/entry_id//embed/iframe` +
      `?ks=${encodeURIComponent(props.ks)}&showRecordButton=true`;

    if (!killed) {
      container.innerHTML = `<iframe
        src="${src}"
        style="width:100%;height:100%;border:0"
        allow="autoplay *; fullscreen *; encrypted-media *; camera *; microphone *; display-capture *"
        allowfullscreen
        title="Kaltura Recorder"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      ></iframe>`;
    }

    return () => {
      killed = true;
    };
  }, [props.partnerId, props.ks, props.uiconfId]);

  return (
    <div
      ref={containerRef}
      className="kaltura-recorder-container"
      style={{ width: '100%', aspectRatio: '16/9' }}
    />
  );
};
