import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaRecorderApi } from '../../schemas/recorder';
import { RecorderCore } from '../../core/recorder';

export const recorderReactImpl = createComponentImplementation(
  KalturaRecorderApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <RecorderCore {...props} />
    </AgentAction>
  ),
);
