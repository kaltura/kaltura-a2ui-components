import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaVodAvatarApi } from '../../schemas/vod-avatar';
import { VodAvatarCore } from '../../core/vod-avatar';

export const vodAvatarReactImpl = createComponentImplementation(
  KalturaVodAvatarApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <VodAvatarCore {...props} />
    </AgentAction>
  ),
);
