import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaVodAvatarApi } from '../schemas/vod-avatar';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { kalturaHosts } from './region';

export interface VodAvatarCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  entryId?: string;
  avatarStyle?: string;
}

function VodAvatarView(props: VodAvatarCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.vod-avatars"
      runtimeName="studio"
      visualType="application"
      runtimeSettings={{
        ks: props.ks,
        partnerId: props.partnerId,
        kalturaServerURI: kalturaHosts().serviceUrl,
      }}
      label="Kaltura VOD Avatar"
      containerClass="kaltura-kaltura-vod-avatar-container"
      widget="vod-avatar"
    />
  );
}

export const VodAvatarCore = withKs('vod-avatar', withValidatedProps(KalturaVodAvatarApi.schema.required({ ks: true }), 'Kaltura VOD Avatar', VodAvatarView, 'vod-avatar'));
