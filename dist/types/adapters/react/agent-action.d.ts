import { type ReactNode } from 'react';
import type { ComponentContext } from '@a2ui/web_core/v0_9';
/**
 * Runs the component's `action` prop on each error and event. An `event`
 * action goes to the agent with the Kaltura fields added to its context. A
 * `functionCall` action runs on the client. See docs/host-api.md.
 */
export declare function AgentAction({ context, action, children }: {
    context: ComponentContext;
    action?: () => unknown;
    children: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=agent-action.d.ts.map