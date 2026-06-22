import { UnisphereWidgetCore } from './unisphere-widget';

export interface GenieCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  categoryId?: string;
  language?: string;
}

export function GenieCore(props: GenieCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.genie"
      runtimeName="kaltura-genie"
      runtimeSettings={{
        ...(props.categoryId ? { categoryId: props.categoryId } : {}),
        language: props.language || 'en',
      }}
      label="Kaltura Genie"
    />
  );
}
