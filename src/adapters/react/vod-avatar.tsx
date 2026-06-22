import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaVodAvatarApi } from '../../schemas/vod-avatar';
import { VodAvatarCore } from '../../core/vod-avatar';

export const vodAvatarReactImpl = createComponentImplementation(
  KalturaVodAvatarApi,
  ({ props }) => <VodAvatarCore {...props} />,
);
