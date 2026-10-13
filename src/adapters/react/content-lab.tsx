import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaContentLabApi } from '../../schemas/content-lab';
import { ContentLabCore } from '../../core/content-lab';

export const contentLabReactImpl = createComponentImplementation(
  KalturaContentLabApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <ContentLabCore {...props} />
    </AgentAction>
  ),
);
