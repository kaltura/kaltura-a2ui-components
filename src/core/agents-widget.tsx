import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaAgentsWidgetApi } from '../schemas/agents-widget';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { currentRegion, kalturaHosts, regionOf } from './region';

export interface AgentsWidgetCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
}

function AgentsWidgetView(props: AgentsWidgetCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.agents"
      runtimeName="manager"
      visualType="drawer"
      runtimeSettings={{
        ks: props.ks,
        pid: String(props.partnerId),
        agentsServiceURI: `https://agents-manager.${regionOf(props.serverUrl) ?? currentRegion()}.ovp.kaltura.com`,
        kalturaServerURI: kalturaHosts().serviceUrl,
        analyticsServerURI: 'analytics.kaltura.com',
        hostAppName: 1,
      }}
      // The drawer opens on load because the runtime keeps it closed until asked.
      onRuntime={runtime => (runtime as { openDrawer: () => void }).openDrawer()}
      label="Kaltura AI Agents"
      containerClass="kaltura-kaltura-agents-container"
      widget="agents-widget"
    />
  );
}

export const AgentsWidgetCore = withKs('agents-widget', withValidatedProps(withKsProp(KalturaAgentsWidgetApi.schema), 'Kaltura AI Agents', AgentsWidgetView, 'agents-widget'));
