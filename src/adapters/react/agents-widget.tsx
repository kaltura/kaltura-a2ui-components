import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaAgentsWidgetApi } from '../../schemas/agents-widget';
import { AgentsWidgetCore } from '../../core/agents-widget';

export const agentsWidgetReactImpl = createComponentImplementation(
  KalturaAgentsWidgetApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <AgentsWidgetCore {...props} />
    </AgentAction>
  ),
);
