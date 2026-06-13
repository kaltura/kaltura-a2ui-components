import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaPlayerApi } from '../../schemas/player';
import { PlayerCore } from '../../core/player';

export const kalturaPlayerReactImpl = createComponentImplementation(
  KalturaPlayerApi,
  ({ props }) => <PlayerCore {...props} />,
);
