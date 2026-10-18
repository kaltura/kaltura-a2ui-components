import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaVodAvatarApi } from '../schemas/vod-avatar';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { resolveRegion } from './region';

export interface VodAvatarCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Kaltura Session. The host KS provider is used first. */
  ks: string;
  /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
  serverUrl?: string;
  /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
  region?: string;
  /** First screen of the studio. Default: `videoLibrary`. */
  initialView?: 'videoLibrary' | 'editVideo' | 'projectBuilder';
  /** Extra eSearch conditions for the entry picker, ANDed with the built-in ones. `itemType` is the `KalturaESearchItemType` number. */
  additionalEsearchFilters?: Array<{ fieldName: string; itemType: number; searchTerm: string | number }>;
}

function VodAvatarView(props: VodAvatarCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      region={props.region}
      widgetName="unisphere.widget.vod-avatars"
      runtimeName="studio"
      visualType="application"
      runtimeSettings={{
        ks: props.ks,
        partnerId: props.partnerId,
        initialView: props.initialView,
        additionalEsearchFilters: props.additionalEsearchFilters,
        kalturaServerURI: resolveRegion(props.region, props.serverUrl).hosts.serviceUrl,
      }}
      label="Kaltura VOD Avatar"
      containerClass="kaltura-kaltura-vod-avatar-container"
      widget="vod-avatar"
    />
  );
}

export const VodAvatarCore = withKs('vod-avatar', withValidatedProps(withKsProp(KalturaVodAvatarApi.schema), 'Kaltura VOD Avatar', VodAvatarView, 'vod-avatar'), {
  schema: KalturaVodAvatarApi.schema,
  label: 'Kaltura VOD Avatar',
});
