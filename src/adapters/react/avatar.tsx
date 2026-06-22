import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaAvatarApi } from '../../schemas/avatar';
import { AvatarCore } from '../../core/avatar';

export const avatarReactImpl = createComponentImplementation(
  KalturaAvatarApi,
  ({ props }) => <AvatarCore {...props} />,
);
