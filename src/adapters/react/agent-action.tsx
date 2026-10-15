import { useRef, useState, type ReactNode } from 'react';
import type { ComponentContext } from '@a2ui/web_core/v0_9';
import { ReporterContext, type KalturaReporter } from '../../core/host-hooks';
import { KsPropContext } from '../../core/ks';

interface RawAction {
  event?: { name: string; context?: Record<string, unknown> };
  functionCall?: unknown;
}

/**
 * Runs the component's `action` prop on each error and event. An `event`
 * action goes to the agent with the Kaltura fields added to its context. A
 * `functionCall` action runs on the client. See docs/host-api.md.
 */
export function AgentAction({ context, action, children }: { context: ComponentContext; action?: () => unknown; children: ReactNode }) {
  const latest = useRef({ context, action });
  latest.current = { context, action };
  // One reporter per component: the widgets restart when it changes.
  const [reporter] = useState<KalturaReporter>(() => ({
    surfaceId: context.dataContext.surface?.id,
    send: kaltura => {
      const { context, action } = latest.current;
      const raw = context.componentModel.properties.action as RawAction | undefined;
      if (raw?.functionCall) return void Promise.resolve(action?.()).catch(() => {});
      if (!raw?.event) return;
      const agent = Object.entries(raw.event.context ?? {}).map(([key, value]) => [key, context.dataContext.resolveDynamicValue(value)]);
      const { id, type } = context.componentModel;
      // The Kaltura fields come last, so an agent key cannot replace them.
      const fields = { ...Object.fromEntries(agent), component: type, componentId: id, surfaceId: context.dataContext.surface?.id, ...kaltura };
      context.dispatchAction({ event: { name: raw.event.name, context: fields } }).catch(() => {});
    },
  }));
  return (
    <ReporterContext.Provider value={reporter}>
      <KsPropContext.Provider value={false}>{children}</KsPropContext.Provider>
    </ReporterContext.Provider>
  );
}
