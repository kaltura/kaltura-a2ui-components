import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaVodAvatarApi } from '../schemas/vod-avatar';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';

export interface VodAvatarCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  entryId: string;
  avatarStyle?: string;
}

function VodAvatarView(props: VodAvatarCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.vod-avatar"
      runtimeName="kaltura-vod-avatar"
      runtimeSettings={{
        entryId: props.entryId,
        ...(props.avatarStyle ? { avatarStyle: props.avatarStyle } : {}),
      }}
      label="Kaltura VOD Avatar"
    />
  );
}

export const VodAvatarCore = withKs('vod-avatar', withValidatedProps(KalturaVodAvatarApi.schema.required({ ks: true }), 'Kaltura VOD Avatar', VodAvatarView));
