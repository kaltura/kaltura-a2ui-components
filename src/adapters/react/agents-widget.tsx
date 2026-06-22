import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaAgentsWidgetApi } from '../../schemas/agents-widget';
import { AgentsWidgetCore } from '../../core/agents-widget';

export const agentsWidgetReactImpl = createComponentImplementation(
  KalturaAgentsWidgetApi,
  ({ props }) => <AgentsWidgetCore {...props} />,
);
