import { createElement, useEffect, useState } from 'react';
import type { ComponentType, FC } from 'react';
import { z } from 'zod';

/** The widgets that ask the provider for a KS. */
export type KsWidget =
  | 'player'
  | 'analytics'
  | 'flashcards'
  | 'captions-editor'
  | 'recorder'
  | 'media-manager'
  | 'genie'
  | 'content-lab'
  | 'agents-widget'
  | 'vod-avatar'
  | 'avatar';

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
export function withKsProp<T extends z.ZodRawShape>(schema: z.ZodObject<T>, required = true) {
  return schema.extend({ ks: required ? z.string() : z.string().optional() });
}

let ksProvider: KsProvider | undefined;

/**
 * Host option. Sets the function that supplies the KS to every component that
 * needs one, so the KS never passes through agent output or the A2UI data
 * model. Pass `undefined` to remove it. Components call it once when they
 * mount and never renew the KS: remount the widget to renew it. A rejected
 * promise shows `invalid-ks`. Never call this from agent output.
 * @example setKsProvider(widget => fetch(`/ks?widget=${widget}`).then(r => r.text()));
 */
export function setKsProvider(provider: KsProvider | undefined): void {
  ksProvider = provider;
}

const PENDING = Symbol('pending');

// A failed provider gives `null`. It fails the ks rule, so the component shows
// "Invalid ks" and never the error itself, which could hold the KS.
function readProvider(widget: KsWidget): { value: unknown } | { promise: Promise<unknown> } {
  try {
    const value: unknown = ksProvider?.(widget);
    if (typeof (value as PromiseLike<unknown> | undefined)?.then !== 'function') return { value };
    const promise = Promise.resolve(value);
    // The effect handles the rejection later, or never if the component unmounts first.
    promise.catch(() => {});
    return { promise };
  } catch {
    return { value: null };
  }
}

function useProviderKs(widget: KsWidget): unknown {
  const [read] = useState(() => readProvider(widget));
  const [settled, setSettled] = useState<unknown>(PENDING);
  useEffect(() => {
    if (!('promise' in read)) return;
    let live = true;
    read.promise.then(
      value => live && setSettled(value),
      () => live && setSettled(null),
    );
    return () => {
      live = false;
    };
  }, [read]);
  return 'promise' in read ? settled : read.value;
}

/**
 * Wraps a core component so its `ks` comes from the host provider first, then
 * from the `ks` prop. Renders nothing while an async provider runs. `Inner`
 * checks the value with the usual ks rule. Widgets that cannot load without a
 * KS pass a schema with `ks` required, so a missing KS stays pending.
 */
export function withKs<P extends { ks?: string }>(widget: KsWidget, Inner: ComponentType<P>): FC<Omit<P, 'ks'> & { ks?: string }> {
  const WithKs: FC<Omit<P, 'ks'> & { ks?: string }> = props => {
    const fromProvider = useProviderKs(widget);
    if (fromProvider === PENDING) return null;
    const ks = fromProvider === undefined || fromProvider === '' ? props.ks : fromProvider;
    return createElement(Inner, { ...props, ks } as unknown as P);
  };
  WithKs.displayName = `WithKs(${Inner.displayName || Inner.name || 'Component'})`;
  return WithKs;
}
