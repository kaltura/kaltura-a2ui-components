import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaAgentsWidgetApi } from '../schemas/agents-widget';
import { withValidatedProps } from './validate-props';

export interface AgentsWidgetCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  agentId?: string;
}

function AgentsWidgetView(props: AgentsWidgetCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.agents"
      runtimeName="kaltura-agents"
      runtimeSettings={{
        ...(props.agentId ? { agentId: props.agentId } : {}),
      }}
      label="Kaltura AI Agents"
    />
  );
}

export const AgentsWidgetCore = withValidatedProps(KalturaAgentsWidgetApi.schema, 'Kaltura AI Agents', AgentsWidgetView);
