import { UnisphereWidgetCore } from './unisphere-widget';

export interface ContentLabCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  entryId?: string;
}

export function ContentLabCore(props: ContentLabCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.content-lab"
      runtimeName="kaltura-content-lab"
      runtimeSettings={{
        ...(props.entryId ? { entryId: props.entryId } : {}),
      }}
      label="Kaltura Content Lab"
    />
  );
}
