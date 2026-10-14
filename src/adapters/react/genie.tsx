import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaGenieApi } from '../../schemas/genie';
import { GenieCore } from '../../core/genie';

export const genieReactImpl = createComponentImplementation(
  KalturaGenieApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <GenieCore {...props} />
    </AgentAction>
  ),
);
