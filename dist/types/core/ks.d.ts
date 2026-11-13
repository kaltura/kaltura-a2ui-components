import type { ComponentType, FC } from 'react';
import { z } from 'zod';
import type { AnalyticsReportType } from '../schemas/analytics.js';
/** What every request names: the account and the region it lives in (resolved by the library). */
interface Account {
    partnerId: number;
    /** A region code, or the name of an environment the host registered. */
    region: string;
}
/**
 * The scope of one widget instance. Every value has passed its format check.
 * Arrays are sorted and unique. See docs/adr/0009-per-instance-ks-scope.md.
 */
export interface KsScopeByWidget {
    player: Account & ({
        entryId: string;
        playlistId?: undefined;
    } | {
        playlistId: string;
        entryId?: undefined;
    });
    flashcards: Account & {
        entryIds: readonly string[];
    };
    'captions-editor': Account & {
        entryId: string;
        assetId?: string;
    };
    recorder: Account;
    analytics: Account & {
        entryId?: string;
        categoryId?: string;
        playlistId?: string;
        virtualEventId?: string;
        reportType?: AnalyticsReportType;
        fromDate?: string;
        toDate?: string;
    };
    'media-manager': Account & {
        contextId?: string;
    };
    genie: Account & {
        categoryId?: string;
    };
    'content-lab': Account & {
        entryId: string;
    };
    'agents-widget': Account;
    'vod-avatar': Account;
    avatar: Account;
}
/** The widgets that ask the provider for a KS. */
export type KsWidget = keyof KsScopeByWidget;
/**
 * What the provider gets for one widget instance. A union on `widget`: narrow
 * it with `request.widget === 'player'` to read the matching `scope`.
 */
export type KsRequest<W extends KsWidget = KsWidget> = {
    [K in W]: {
        widget: K;
        /** Bumped when a widget gains a scope key. Backends reject unknown versions and keys. */
        version: 1;
        /** Deep-frozen. Untrusted: the agent chose every value. */
        scope: Readonly<KsScopeByWidget[K]>;
        /** A2UI only. Chosen by the agent. Logs and correlation only. */
        surfaceId?: string;
        /** A2UI only. Chosen by the agent. Shared by every item of a template. Logs and correlation only. */
        componentId?: string;
        /** A2UI only. The data path of this instance, for example `/items/0`. Changes when a list reorders. */
        dataPath?: string;
        /** Aborted when the scope changes again or the widget unmounts. */
        signal: AbortSignal;
    };
}[W];
/**
 * Returns the Kaltura Session for one widget instance, so the host can give
 * each widget only the privileges it needs. Treat `request` as untrusted input
 * and check it before you mint. Return `undefined` (or `''`) when there is no
 * KS, so a web component falls back to its `ks` setting. On the A2UI path
 * there is no fallback. A provider may ignore `request`.
 */
export type KsProvider = (widget: KsWidget, request: KsRequest) => string | undefined | Promise<string | undefined>;
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
 * False on the A2UI path: there the provider is the only KS source and a `ks`
 * prop from the agent is ignored. True for the web components and for direct
 * use of a core component, where `ks` is a prop the host sets.
 */
export declare const KsPropContext: import("react").Context<boolean>;
/**
 * Identity of an A2UI component. The agent chose every value, so it is for logs
 * and correlation only. Set by the A2UI adapter, absent for web components.
 */
export interface KsIdentity {
    surfaceId?: string;
    componentId?: string;
    dataPath?: string;
}
export declare const KsIdentityContext: import("react").Context<KsIdentity | undefined>;
/**
 * Host option. Sets the function that supplies the KS to every component that
 * needs one, so the KS never passes through agent output or the A2UI data
 * model. Pass `undefined` to remove it. Only widgets that mount later see the change: a mounted widget keeps the provider it started with. A component calls it when it mounts
 * and again when its scope changes (see `KsRequest`), never to renew an
 * expiring KS: remount the widget to renew it. A throw or a rejected promise
 * shows `invalid-ks`. Never call this from agent output.
 * @example setKsProvider((widget, { scope }) => fetch('/ks', { method: 'POST', body: JSON.stringify({ widget, scope }) }).then(r => r.text()));
 */
export declare function setKsProvider(provider: KsProvider | undefined): void;
type Scope = Record<string, unknown>;
/** How a widget joins the KS flow. All parts but `schema` and `label` are optional. */
export interface KsGate<P> {
    /** The agent schema, without `ks`. The props are checked against it before the provider is called. */
    schema: z.ZodObject<z.ZodRawShape>;
    /** Names the widget in the error message. */
    label: string;
    /** Extra pre-check, run on props that passed the schema: the names of props this widget finds invalid. */
    check?: (props: P) => string[];
    /** Builds the scope when the props alone do not give it. `undefined` means nothing to mint for. */
    scope?: (props: P) => Scope | undefined;
}
/** Waits this long for the scope to settle before it asks the provider again (the first request is at once). */
export declare const KS_QUIET_MS = 300;
/**
 * Wraps a core component so its `ks` comes from the host provider first, then
 * from the `ks` prop (not on the A2UI path, see `KsPropContext`). With a
 * provider the order is: check the props without `ks`, ask the provider from
 * an effect with the scope, check the props again with the `ks` it returned
 * (that part is `Inner`). The widget renders nothing until its first KS
 * arrives. When the scope changes it keeps rendering the last props with the
 * KS they were minted for, until the next KS arrives.
 */
export declare function withKs<P extends {
    ks?: string;
}>(widget: KsWidget, Inner: ComponentType<P>, gate: KsGate<Omit<P, 'ks'>>): FC<Omit<P, 'ks'> & {
    ks?: string;
}>;
export {};
//# sourceMappingURL=ks.d.ts.map