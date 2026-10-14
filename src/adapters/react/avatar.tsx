import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaAvatarApi } from '../../schemas/avatar';
import { AvatarCore } from '../../core/avatar';

export const avatarReactImpl = createComponentImplementation(
  KalturaAvatarApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <AvatarCore {...props} />
    </AgentAction>
  ),
);
