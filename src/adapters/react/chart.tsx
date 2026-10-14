import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaChartApi } from '../../schemas/chart';
import { ChartCore, type ChartCoreProps } from '../../core/chart';

export const chartReactImpl = createComponentImplementation(
  KalturaChartApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <ChartCore {...(props as unknown as ChartCoreProps)} />
    </AgentAction>
  ),
);
