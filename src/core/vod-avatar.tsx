import { UnisphereWidgetCore } from './unisphere-widget';

export interface VodAvatarCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  entryId: string;
  avatarStyle?: string;
}

export function VodAvatarCore(props: VodAvatarCoreProps) {
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
