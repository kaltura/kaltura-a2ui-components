import { UnisphereWidgetCore } from './unisphere-widget';

export interface AgentsWidgetCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  agentId?: string;
}

export function AgentsWidgetCore(props: AgentsWidgetCoreProps) {
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
