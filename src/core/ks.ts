import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';
import type { ComponentType, FC } from 'react';
import { z } from 'zod';
import type { AnalyticsReportType } from '../schemas/analytics';
import { resolveRegion } from './region';
import { gateProps, StrictPendingContext } from './validate-props';

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
  player: Account & { entryId: string };
  flashcards: Account & { entryIds: readonly string[] };
  'captions-editor': Account & { entryId: string; assetId?: string };
  recorder: Account;
  analytics: Account & { entryId?: string; reportType?: AnalyticsReportType; fromDate?: string; toDate?: string };
  'media-manager': Account & { contextId?: string };
  genie: Account & { categoryId?: string };
  'content-lab': Account & { entryId: string };
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
export function withKsProp<T extends z.ZodRawShape>(schema: z.ZodObject<T>, required = true) {
  return schema.extend({ ks: required ? z.string() : z.string().optional() });
}

/**
 * False on the A2UI path: there the provider is the only KS source and a `ks`
 * prop from the agent is ignored. True for the web components and for direct
 * use of a core component, where `ks` is a prop the host sets.
 */
export const KsPropContext = createContext(true);

/**
 * Identity of an A2UI component. The agent chose every value, so it is for logs
 * and correlation only. Set by the A2UI adapter, absent for web components.
 */
export interface KsIdentity {
  surfaceId?: string;
  componentId?: string;
  dataPath?: string;
}

export const KsIdentityContext = createContext<KsIdentity | undefined>(undefined);

let ksProvider: KsProvider | undefined;

/**
 * Host option. Sets the function that supplies the KS to every component that
 * needs one, so the KS never passes through agent output or the A2UI data
 * model. Pass `undefined` to remove it. A component calls it when it mounts
 * and again when its scope changes (see `KsRequest`), never to renew an
 * expiring KS: remount the widget to renew it. A throw or a rejected promise
 * shows `invalid-ks`. Never call this from agent output.
 * @example setKsProvider((widget, { scope }) => fetch('/ks', { method: 'POST', body: JSON.stringify({ widget, scope }) }).then(r => r.text()));
 */
export function setKsProvider(provider: KsProvider | undefined): void {
  ksProvider = provider;
}

/** The props that name data, per widget. Nothing else enters a request: not `ks`, not config props. */
const SCOPE_KEYS: { [W in KsWidget]: { required: readonly string[]; optional?: readonly string[] } } = {
  player: { required: ['partnerId', 'entryId'] },
  flashcards: { required: ['partnerId'] },
  'captions-editor': { required: ['partnerId', 'entryId'], optional: ['assetId'] },
  recorder: { required: ['partnerId'] },
  analytics: { required: ['partnerId'], optional: ['entryId', 'reportType', 'fromDate', 'toDate'] },
  'media-manager': { required: ['partnerId'], optional: ['contextId'] },
  genie: { required: ['partnerId'], optional: ['categoryId'] },
  'content-lab': { required: ['partnerId', 'entryId'] },
  'agents-widget': { required: ['partnerId'] },
  'vod-avatar': { required: ['partnerId'] },
  avatar: { required: ['partnerId'] },
};

type Props = Record<string, unknown>;
type Scope = Record<string, unknown>;

const isSet = (value: unknown): value is string | number => (typeof value === 'string' && value !== '') || typeof value === 'number';

/** The scope from the known props, or `undefined` when a required one is missing: nothing to mint for. */
function scopeFromProps(widget: KsWidget, props: Props): Scope | undefined {
  const { required, optional = [] } = SCOPE_KEYS[widget];
  const scope: Scope = {};
  for (const key of required) {
    if (!isSet(props[key])) return undefined;
    scope[key] = props[key];
  }
  for (const key of optional) if (isSet(props[key])) scope[key] = props[key];
  return scope;
}

/** True when `held` was minted for at least what `next` asks: the same, or a subset of `entryIds`. */
function covers(held: Scope, next: Scope): boolean {
  return Object.keys(next).every(key => {
    const a = held[key];
    const b = next[key];
    return Array.isArray(b) ? Array.isArray(a) && b.every(id => a.includes(id)) : a === b;
  }) && Object.keys(held).every(key => key in next);
}

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

type Held = { key: string; scope: Scope; ks: unknown; props: Props };
type Flight = { key: string; controller: AbortController; orphan: boolean; timer?: ReturnType<typeof setTimeout> };

/** Waits this long for the scope to settle before it asks the provider again (the first request is at once). */
export const KS_QUIET_MS = 300;

const deepFreeze = <T extends object>(value: T): T => {
  for (const inner of Object.values(value)) if (typeof inner === 'object' && inner !== null) deepFreeze(inner);
  return Object.freeze(value);
};

const isThenable = (value: unknown): value is PromiseLike<unknown> => typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';

/**
 * Wraps a core component so its `ks` comes from the host provider first, then
 * from the `ks` prop (not on the A2UI path, see `KsPropContext`). With a
 * provider the order is: check the props without `ks`, ask the provider from
 * an effect with the scope, check the props again with the `ks` it returned
 * (that part is `Inner`). The widget renders nothing until its first KS
 * arrives. When the scope changes it keeps rendering the last props with the
 * KS they were minted for, until the next KS arrives.
 */
export function withKs<P extends { ks?: string }>(widget: KsWidget, Inner: ComponentType<P>, gate: KsGate<Omit<P, 'ks'>>): FC<Omit<P, 'ks'> & { ks?: string }> {
  type Outer = Omit<P, 'ks'> & { ks?: string };
  const WithKs: FC<Outer> = outer => {
    const props = outer as unknown as Props;
    const strict = useContext(StrictPendingContext);
    const propAllowed = useContext(KsPropContext);
    const identity = useContext(KsIdentityContext);
    const [provider] = useState(() => ksProvider);
    const checked = provider ? gateProps(gate.schema, gate.label, widget, props, strict, gate.check && (() => gate.check?.(outer) ?? [])) : undefined;
    const base = provider && checked && !checked.error && !checked.pending ? (gate.scope ? gate.scope(outer) : scopeFromProps(widget, props)) : undefined;
    // The pre-check has passed, so the region resolves.
    const scope = base && { ...base, region: resolveRegion(typeof props.region === 'string' ? props.region : undefined, typeof props.serverUrl === 'string' ? props.serverUrl : undefined).name };
    const key = scope && JSON.stringify(scope);
    const [held, setHeld] = useState<Held>();

    const latest = useRef({ key, props, held, scope, identity, provider });
    // Written after commit, so a render that React drops never changes what the mint effect reads. Runs before the mint effect.
    useEffect(() => {
      latest.current = { key, props, held, scope, identity, provider };
    });
    const flight = useRef<Flight | undefined>(undefined);

    useEffect(() => {
      const { scope, provider, held } = latest.current;
      if (!key || !scope || !provider) return;
      if (held && (held.key === key || covers(held.scope, scope))) return;
      let mine = flight.current;
      if (mine && mine.key === key && mine.orphan && !mine.controller.signal.aborted) {
        // A StrictMode remount: keep the request that is already running.
        mine.orphan = false;
      } else {
        mine?.controller.abort();
        const controller = new AbortController();
        // The first request of an instance runs at once. Every later one waits for the scope to settle.
        const first = !mine;
        const started: Flight = (mine = { key, controller, orphan: false });
        flight.current = started;
        const settle = (value: unknown) => {
          // A reply for an earlier key, or after unmount, is ignored.
          if (controller.signal.aborted || latest.current.key !== key) return;
          setHeld({ key, scope, ks: value, props: latest.current.props });
        };
        const run = () => {
          const request = Object.freeze({ widget, version: 1, scope: deepFreeze({ ...scope }), ...latest.current.identity, signal: controller.signal });
          try {
            const result = (provider as unknown as (w: KsWidget, r: unknown) => unknown)(widget, request);
            // A failed provider gives `null`. It fails the ks rule, so the component shows
            // "Invalid ks" and never the error itself, which could hold the KS.
            if (isThenable(result)) Promise.resolve(result).then(settle, () => settle(null));
            else settle(result);
          } catch {
            settle(null);
          }
        };
        if (first) run();
        else started.timer = setTimeout(run, KS_QUIET_MS);
      }
      const current = mine;
      return () => {
        current.orphan = true;
        queueMicrotask(() => {
          if (!current.orphan) return;
          current.controller.abort();
          clearTimeout(current.timer);
        });
      };
    }, [key]);

    if (checked?.error) return checked.error;
    if (checked?.pending) return null;
    const render = (shown: Props, fromProvider: unknown) => {
      const ks = fromProvider === undefined || fromProvider === '' ? (propAllowed ? shown.ks : undefined) : fromProvider;
      return createElement(Inner, { ...shown, ks } as unknown as P);
    };
    // No provider, or nothing to mint for: the web component `ks` prop is the only source.
    if (!provider || !scope || !key) return render(props, undefined);
    if (!held) return null;
    const current = held.key === key || covers(held.scope, scope);
    return render(current ? props : held.props, held.ks);
  };
  WithKs.displayName = `WithKs(${Inner.displayName || Inner.name || 'Component'})`;
  return WithKs;
}
