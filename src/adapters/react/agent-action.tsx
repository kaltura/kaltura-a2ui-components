import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ComponentContext } from '@a2ui/web_core/v1_0';
import { ReporterContext, type KalturaReporter } from '../../core/host-hooks';
import { KsIdentityContext, KsPropContext } from '../../core/ks';

interface RawAction {
  event?: { name: string; context?: Record<string, unknown> };
  functionCall?: unknown;
}

interface RawAccessibility {
  label?: unknown;
  description?: unknown;
  live?: 'off' | 'polite' | 'assertive';
  hidden?: unknown;
}
type DynamicKey = 'label' | 'description' | 'hidden';
const DYNAMIC_KEYS: DynamicKey[] = ['label', 'description', 'hidden'];

/** The component's `accessibility` values, kept current as the data model changes. */
function useAccessibility(context: ComponentContext): Partial<Record<DynamicKey, unknown>> & Pick<RawAccessibility, 'live'> {
  const raw = context.componentModel.properties.accessibility as RawAccessibility | undefined;
  const key = JSON.stringify(raw ?? null);
  const [values, setValues] = useState<Partial<Record<DynamicKey, unknown>>>({});
  useEffect(() => {
    const keys = DYNAMIC_KEYS.filter(name => raw?.[name] !== undefined);
    const subscriptions = keys.map(name => context.dataContext.subscribeDynamicValue(raw?.[name], value => setValues(previous => ({ ...previous, [name]: value }))));
    setValues(Object.fromEntries(keys.map((name, index) => [name, subscriptions[index].value])));
    return () => subscriptions.forEach(subscription => subscription.unsubscribe());
    // `key` stands for `raw`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, context.dataContext]);
  return { ...values, live: raw?.live };
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
  const surfaceId = context.dataContext.surface?.id;
  const { id: componentId } = context.componentModel;
  const { path: dataPath } = context.dataContext;
  const identity = useMemo(() => ({ surfaceId, componentId, dataPath }), [surfaceId, componentId, dataPath]);
  const { label, description, live, hidden } = useAccessibility(context);
  // The wrapper is always there, so a changing `accessibility` never restarts the widget.
  // `display: contents` keeps it out of the layout.
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label ? String(label) : undefined}
      aria-description={description ? String(description) : undefined}
      aria-live={live}
      aria-hidden={hidden === true ? true : undefined}
      style={{ display: 'contents' }}
    >
      <ReporterContext.Provider value={reporter}>
        <KsPropContext.Provider value={false}>
          <KsIdentityContext.Provider value={identity}>{children}</KsIdentityContext.Provider>
        </KsPropContext.Provider>
      </ReporterContext.Provider>
    </div>
  );
}
