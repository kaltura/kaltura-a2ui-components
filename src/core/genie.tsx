import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaGenieApi } from '../schemas/genie';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { kalturaHosts } from './region';

export interface GenieCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  uiconfId: number;
  categoryId?: string;
  language?: string;
}

function GenieView(props: GenieCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.genie"
      runtimeName="application"
      visualType="page"
      runtimeSettings={{
        ks: props.ks,
        pid: String(props.partnerId),
        uiConfId: String(props.uiconfId),
        kalturaServerURI: kalturaHosts().cdn,
        ...(props.categoryId ? { categoryId: props.categoryId } : {}),
        language: props.language || 'en',
      }}
      label="Kaltura Genie"
      containerClass="kaltura-kaltura-genie-container"
      widget="genie"
    />
  );
}

export const GenieCore = withKs('genie', withValidatedProps(KalturaGenieApi.schema.required({ ks: true }), 'Kaltura Genie', GenieView, 'genie'));
