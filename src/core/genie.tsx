import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaGenieApi } from '../schemas/genie';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { kalturaHosts, regionOf } from './region';

export interface GenieCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Kaltura Session. The host KS provider is used first. */
  ks: string;
  /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
  serverUrl?: string;
  /** Player (uiConf) ID. Genie needs it to start. */
  uiconfId: number;
  /** Category that scopes the Genie content. */
  categoryId?: string;
  /** UI language code. Default: `en`. */
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
        kalturaServerURI: kalturaHosts(regionOf(props.serverUrl ?? '')).cdn,
        ...(props.categoryId ? { categoryId: props.categoryId } : {}),
        language: props.language || 'en',
      }}
      label="Kaltura Genie"
      containerClass="kaltura-kaltura-genie-container"
      widget="genie"
    />
  );
}

export const GenieCore = withKs('genie', withValidatedProps(withKsProp(KalturaGenieApi.schema), 'Kaltura Genie', GenieView, 'genie'), {
  schema: KalturaGenieApi.schema,
  label: 'Kaltura Genie',
});
