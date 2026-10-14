import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaAnalyticsApi } from '../../schemas/analytics';
import { AnalyticsCore } from '../../core/analytics';

export const analyticsReactImpl = createComponentImplementation(
  KalturaAnalyticsApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <AnalyticsCore {...props} />
    </AgentAction>
  ),
);
