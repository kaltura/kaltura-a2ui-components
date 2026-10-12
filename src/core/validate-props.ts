import { createContext, createElement, useContext, useEffect } from 'react';
import type { ComponentType, FC } from 'react';
import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';
import { isEntryId, isPositiveInt } from './ids';
import { invalidCode, reportError, type KalturaErrorCode, type KalturaWidget } from './host-hooks';

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

// Rules that the A2UI string and number types cannot carry. Applied by prop name.
const FIELD_RULES: Record<string, (value: unknown) => boolean> = {
  partnerId: isPositiveInt,
  // 0 selects the default uiConf. Schemas that need a real id are stricter.
  uiconfId: value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
  entryId: isEntryId,
  // A KS goes into URLs and widget settings. Reject empty values and control characters.
  ks: value => typeof value === 'string' && value !== '' && !/\p{Cc}/u.test(value),
};

/**
 * Checks resolved props against a component schema.
 * - `invalid`: names of props that have a value that fails (paths like
 *   `cards.0.clips.1.title`), at most 5. Names come from the schema only, never
 *   from the values.
 * - `pending`: a required top-level prop is still undefined, for example a
 *   binding the host has not filled yet. That is not an error, the value may
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
  }
  return { invalid: [...bad].slice(0, 5), pending };
}

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
export const LoadError: FC<{ widget: KalturaWidget; code?: KalturaErrorCode; children: string }> = ({
  widget,
  code = 'invalid-props',
  children,
}) => {
  useEffect(() => reportError(code, widget, children), [code, widget, children]);
  return createElement('div', { className: 'kaltura-load-error', role: 'alert' }, children);
};

/**
 * Wraps a core component. Props with a bad value show a plain-text error and
 * the component is never rendered. Props that are still undefined render
 * nothing until they arrive, except under `StrictPendingContext`. `label`
 * names the widget in the message, `widget` in the error handler report.
 */
export function withValidatedProps<P extends object>(
  schema: z.ZodObject<z.ZodRawShape>,
  label: string,
  Inner: ComponentType<P>,
  widget: KalturaWidget,
): FC<P> {
  const Validated: FC<P> = props => {
    const { invalid, pending } = checkProps(schema, props, useContext(StrictPendingContext));
    if (invalid.length) {
      return createElement(LoadError, {
        widget,
        code: invalidCode(invalid),
        children: `Failed to load ${label}: Invalid ${invalid.join(', ')}`,
      });
    }
    if (pending) return null;
    return createElement(Inner, props);
  };
  Validated.displayName = `Validated(${Inner.displayName || Inner.name || label})`;
  return Validated;
}
