import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaPlayerApi } from '../../schemas/player';
import { PlayerCore } from '../../core/player';

export const kalturaPlayerReactImpl = createComponentImplementation(
  KalturaPlayerApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <PlayerCore {...props} />
    </AgentAction>
  ),
);
