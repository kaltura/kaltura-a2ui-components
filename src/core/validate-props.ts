import { createContext, createElement, useContext, useEffect } from 'react';
import type { ComponentType, FC, ReactElement } from 'react';
import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';
import { isCategoryId, isEntryId, isPositiveInt } from './ids';
import { invalidCode, reportError, ReporterContext, type KalturaErrorCode, type KalturaWidget } from './host-hooks';
import { refusedIdProp } from './allowed-ids';
import { isAllowedServerUrl } from './unisphere-loader';
import { resolveRegion, unisphereUrl } from './region';

// Core components get resolved props, so the bindings and function calls that the
// A2UI schemas allow must not appear. Use the schema, minus those two options.
const BINDING_OPTIONS = new Set<unknown>([CommonSchemas.DataBinding, CommonSchemas.FunctionCall]);

function toResolved(schema: z.ZodTypeAny): z.ZodTypeAny {
  const def = schema._def as { typeName: string };
  switch (def.typeName) {
    case 'ZodOptional':
      return toResolved((schema as z.ZodOptional<z.ZodTypeAny>).unwrap()).optional();
    case 'ZodArray':
      return z.array(toResolved((schema as z.ZodArray<z.ZodTypeAny>).element));
    case 'ZodObject': {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      return z.object(Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, toResolved(v)])));
    }
    case 'ZodUnion': {
      const all = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options;
      const kept = all.filter(option => !BINDING_OPTIONS.has(option));
      if (kept.length === all.length) return schema;
      return kept.length === 1 ? kept[0] : z.union(kept as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
    }
    default:
      return schema;
  }
}

const resolvedCache = new WeakMap<z.ZodTypeAny, z.ZodTypeAny>();

function resolvedSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let resolved = resolvedCache.get(schema);
  if (!resolved) {
    resolved = toResolved(schema);
    resolvedCache.set(schema, resolved);
  }
  return resolved;
}

// Props of which a widget needs exactly one. Applied to a schema that has both and a `uiconfId`:
// Analytics has the same two props, but needs neither.
const ONE_OF: ReadonlyArray<readonly [string, string]> = [['entryId', 'playlistId']];

// Rules that the A2UI string and number types cannot carry. Applied by prop name.
const FIELD_RULES: Record<string, (value: unknown) => boolean> = {
  partnerId: isPositiveInt,
  // 0 selects the default uiConf. Schemas that need a real id are stricter.
  uiconfId: value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
  // A region code or an environment name. Whether it is known and allowed is decided in `gateProps`.
  region: value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(value),
  entryId: isEntryId,
  // Caption asset and playlist ids look like entry ids.
  assetId: isEntryId,
  playlistId: isEntryId,
  // Category ids. They go into the KS request and into widget settings.
  categoryId: isCategoryId,
  contextId: isCategoryId,
  virtualEventId: isCategoryId,
  // A KS goes into URLs and widget settings. Reject empty values and control characters.
  ks: value => typeof value === 'string' && value !== '' && !/\p{Cc}/u.test(value),
};

/**
 * Checks resolved props against a component schema.
 * - `invalid`: names of props that have a value that fails (paths like
 *   `cards.0.clips.1.title`), at most 5. Names come from the schema only, never
 *   from the values.
 * - `pending`: a required top-level prop is still undefined, for example a
 *   binding the host has not filled yet. The same holds when none of a
 *   one-of pair (`entryId`, `playlistId`) is set. That is not an error, the value may
 *   still arrive. An undefined value inside a prop (a clip without `startTime`)
 *   is invalid. With `strict`, a missing top-level prop is invalid too.
 */
export function checkProps(
  schema: z.ZodObject<z.ZodRawShape>,
  props: unknown,
  strict = false,
): { invalid: string[]; pending: boolean } {
  const bad = new Set<string>();
  let pending = false;
  const parsed = resolvedSchema(schema).safeParse(props);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const value = issue.path.reduce<unknown>((at, key) => (at as Record<PropertyKey, unknown> | undefined)?.[key], props);
      if (value === undefined && issue.path.length === 1 && !strict) pending = true;
      else bad.add(issue.path.join('.') || '(props)');
    }
  }
  if (typeof props === 'object' && props !== null) {
    const record = props as Record<string, unknown>;
    for (const [key, rule] of Object.entries(FIELD_RULES)) {
      const value = record[key];
      if (value === undefined || !(key in schema.shape)) continue;
      // An empty optional value means "not set" to every builder.
      if (value === '' && schema.shape[key].isOptional()) continue;
      if (!rule(value)) bad.add(key);
    }
    for (const [first, second] of ONE_OF) {
      if (!(first in schema.shape && second in schema.shape && 'uiconfId' in schema.shape)) continue;
      // An empty string is a set value here: it fails the id rule instead of waiting for a binding.
      const set = [first, second].filter(key => record[key] !== undefined);
      if (set.length === 2) bad.add(second);
      else if (set.length === 0 && strict) bad.add(first);
      else if (set.length === 0) pending = true;
    }
  }
  return { invalid: [...bad].slice(0, 5), pending };
}

/** The message of an invalid-props or invalid-ks error. A KS problem points to the fix. */
export const invalidText = (invalid: string[]): string => `Invalid ${invalid.join(', ')}${invalid.includes('ks') ? ': call setKsProvider' : ''}`;

/** The schema keys that start the `invalid` paths: `cards.0.title` gives `cards`. */
export const topLevelProps = (schema: z.ZodObject<z.ZodRawShape>, invalid: string[]): string[] => [
  ...new Set(invalid.map(path => path.split('.')[0]).filter(key => key in schema.shape)),
];

/**
 * True where props never change after the first render, as in the web
 * component adapters. There a missing required prop shows the error, because
 * nothing would ever replace the blank.
 */
export const StrictPendingContext = createContext(false);

/**
 * The one plain-text error box. Style: `.kaltura-load-error` in
 * styles/components.css. Reports the error to the host handler. `children`
 * is the message: fixed text and prop names only, never a prop value.
 */
export const LoadError: FC<{ widget: KalturaWidget; code?: KalturaErrorCode; children: string; invalidProps?: string[] }> = ({
  widget,
  code = 'invalid-props',
  children,
  invalidProps,
}) => {
  const reporter = useContext(ReporterContext);
  // The text is the key: `invalidProps` is rebuilt on every render.
  useEffect(() => reportError(code, widget, children, reporter, invalidProps), [code, widget, children, reporter]); // eslint-disable-line react-hooks/exhaustive-deps
  return createElement('div', { className: 'kaltura-load-error', role: 'alert' }, children);
};

/**
 * The check behind `withValidatedProps`, also run by `withKs` before it calls
 * the provider. `error` is the element to show for a bad value or a refused
 * id or `serverUrl`. `pending` means a required prop is still undefined. `extra` runs only on
 * props that passed the schema. It names props that the widget finds invalid
 * by its own rules (for example Analytics dates).
 */
export function gateProps(
  schema: z.ZodObject<z.ZodRawShape>,
  label: string,
  widget: KalturaWidget,
  props: object,
  strict: boolean,
  extra?: () => string[],
): { error?: ReactElement; pending: boolean } {
  const checked = checkProps(schema, props, strict);
  const invalid = checked.invalid.length || checked.pending ? checked.invalid : (extra?.() ?? []).slice(0, 5);
  if (invalid.length) {
    const error = createElement(LoadError, {
      widget,
      code: invalidCode(invalid),
      invalidProps: topLevelProps(schema, invalid),
      children: `Failed to load ${label}: ${invalidText(invalid)}`,
    });
    return { error, pending: false };
  }
  if (checked.pending) return { pending: true };
  const refused = refusedIdProp(props, schema.shape);
  if (refused) {
    return { error: createElement(LoadError, { widget, code: 'origin-not-allowed', children: `Failed to load ${label}: ${refused} is not allowed` }), pending: false };
  }
  const { serverUrl } = props as { serverUrl?: unknown };
  if ('serverUrl' in schema.shape && typeof serverUrl === 'string' && !isAllowedServerUrl(serverUrl)) {
    const children = `Failed to load ${label}: serverUrl is not an allowed Unisphere origin (see setExtraAllowedOrigins)`;
    return { error: createElement(LoadError, { widget, code: 'origin-not-allowed', children }), pending: false };
  }
  if ('region' in schema.shape) {
    try {
      const url = typeof serverUrl === 'string' ? serverUrl : undefined;
      // A Unisphere widget needs a Unisphere host in its region too.
      if ('serverUrl' in schema.shape) unisphereUrl((props as { region?: string }).region, url);
      else resolveRegion((props as { region?: string }).region, url);
    } catch {
      return { error: createElement(LoadError, { widget, code: 'origin-not-allowed', children: `Failed to load ${label}: region is not allowed` }), pending: false };
    }
  }
  return { pending: false };
}

/**
 * Wraps a core component. Props with a bad value show a plain-text error and
 * the component is never rendered. Props that are still undefined render
 * nothing until they arrive, except under `StrictPendingContext`. `label`
 * names the widget in the message, `widget` in the error handler report.
 * A `partnerId` or `uiconfId` that the host allowlist refuses shows an
 * `origin-not-allowed` error (allowed-ids.ts).
 */
export function withValidatedProps<P extends object>(
  schema: z.ZodObject<z.ZodRawShape>,
  label: string,
  Inner: ComponentType<P>,
  widget: KalturaWidget,
): FC<P> {
  const Validated: FC<P> = props => {
    const { error, pending } = gateProps(schema, label, widget, props, useContext(StrictPendingContext));
    if (error) return error;
    return pending ? null : createElement(Inner, props);
  };
  Validated.displayName = `Validated(${Inner.displayName || Inner.name || label})`;
  return Validated;
}
