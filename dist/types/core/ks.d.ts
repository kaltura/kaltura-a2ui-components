import type { ComponentType, FC } from 'react';
import { z } from 'zod';
/** The widgets that ask the provider for a KS. */
export type KsWidget = 'player' | 'analytics' | 'flashcards' | 'captions-editor' | 'recorder' | 'media-manager' | 'genie' | 'content-lab' | 'agents-widget' | 'vod-avatar' | 'avatar';
/**
 * Returns the Kaltura Session for the widget that asks, so the host can give
 * each widget only the privileges it needs. Return `undefined` (or `''`) when
 * there is none, so the component falls back to its `ks` prop.
 */
export type KsProvider = (widget: KsWidget) => string | undefined | Promise<string | undefined>;
/**
 * The schemas agents see have no `ks`. The core components add it back:
 * required where the widget cannot load without one. The A2UI adapter never
 * passes it, so on that path the host provider is the only source.
 */
export declare function withKsProp<T extends z.ZodRawShape>(schema: z.ZodObject<T>, required?: boolean): z.ZodObject<z.objectUtil.extendShape<T, {
    ks: z.ZodString | z.ZodOptional<z.ZodString>;
}>, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<T, {
    ks: z.ZodString | z.ZodOptional<z.ZodString>;
}>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<z.objectUtil.extendShape<T, {
    ks: z.ZodString | z.ZodOptional<z.ZodString>;
}>> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
/**
 * Host option. Sets the function that supplies the KS to every component that
 * needs one, so the KS never passes through agent output or the A2UI data
 * model. Pass `undefined` to remove it. Components call it once when they
 * mount and never renew the KS: remount the widget to renew it. A rejected
 * promise shows `invalid-ks`. Never call this from agent output.
 * @example setKsProvider(widget => fetch(`/ks?widget=${widget}`).then(r => r.text()));
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