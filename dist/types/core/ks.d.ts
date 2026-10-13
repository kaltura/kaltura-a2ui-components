import type { ComponentType, FC } from 'react';
/** The widgets that ask the provider for a KS. */
export type KsWidget = 'player' | 'analytics' | 'captions-editor' | 'recorder' | 'media-manager' | 'genie' | 'content-lab' | 'agents-widget' | 'vod-avatar' | 'avatar';
/**
 * Returns the Kaltura Session for the widget that asks, so the host can give
 * each widget only the privileges it needs. Return `undefined` (or `''`) when
 * there is none, so the component falls back to its `ks` prop.
 */
export type KsProvider = (widget: KsWidget) => string | undefined | Promise<string | undefined>;
/**
 * Host option. Sets the function that supplies the KS to every component that
 * needs one, so the KS never passes through agent output or the A2UI data
 * model. Pass `undefined` to remove it. Components call it once when they
 * mount. Never call this from agent output.
 */
export declare function setKsProvider(provider: KsProvider | undefined): void;
/**
 * Wraps a core component so its `ks` comes from the host provider first, then
 * from the `ks` prop. Renders nothing while an async provider runs. `Inner`
 * checks the value with the usual ks rule. Widgets that cannot load without a
 * KS pass a schema with `ks` required, so a missing KS stays pending.
 */
export declare function withKs<P extends {
    ks?: string;
}>(widget: KsWidget, Inner: ComponentType<P>): FC<Omit<P, 'ks'> & {
    ks?: string;
}>;
//# sourceMappingURL=ks.d.ts.map