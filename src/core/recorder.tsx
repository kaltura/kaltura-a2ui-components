import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { renderLoadError } from './render-load-error';
import { KalturaRecorderApi } from '../schemas/recorder';
import { invalidProps } from './validate-props';

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
    // The error goes inside the container, so the shared wrapper is not used here.
    const bad = invalidProps(KalturaRecorderApi.schema, {
      partnerId: props.partnerId,
      ks: props.ks,
      uiconfId: props.uiconfId,
    });
    if (bad.length) {
      renderLoadError(container, 'recorder', new Error(`Invalid ${bad.join(', ')}`));
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src =
      `https://www.kaltura.com/index.php/extwidget/preview` +
      `/partner_id/${encodeURIComponent(props.partnerId)}` +
      `/uiconf_id/${encodeURIComponent(props.uiconfId || 0)}` +
      `/entry_id//embed/iframe` +
      `?ks=${encodeURIComponent(props.ks)}&showRecordButton=true`;
    iframe.style.cssText = 'width:100%;height:100%;border:0';
    iframe.setAttribute(
      'allow',
      'autoplay *; fullscreen *; encrypted-media *; camera *; microphone *; display-capture *',
    );
    iframe.setAttribute('allowfullscreen', '');
    iframe.title = 'Kaltura Recorder';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
    container.replaceChildren(iframe);

    return () => {
      container.replaceChildren();
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
