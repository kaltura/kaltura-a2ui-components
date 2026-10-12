import { createElement } from 'react';
import type { ComponentType, FC } from 'react';
import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';
import { isEntryId, isPositiveInt } from './ids';

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
 * Checks resolved props against a component schema. Returns the names of the
 * invalid props (paths like `cards.0.clips.1.entryId`), empty when all is fine.
 * Names come from the schema only, never from the values.
 */
export function invalidProps(schema: z.ZodObject<z.ZodRawShape>, props: unknown): string[] {
  const bad = new Set<string>();
  const parsed = resolvedSchema(schema).safeParse(props);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) bad.add(issue.path.join('.') || '(props)');
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
  return [...bad].slice(0, 5);
}

/**
 * Wraps a core component. Props that fail the schema show a plain-text error
 * and the component is never rendered. `label` names the widget in the message.
 */
export function withValidatedProps<P extends object>(
  schema: z.ZodObject<z.ZodRawShape>,
  label: string,
  Inner: ComponentType<P>,
): FC<P> {
  const Validated: FC<P> = props => {
    const bad = invalidProps(schema, props);
    if (bad.length) {
      return createElement('div', { className: 'kaltura-load-error' }, `Failed to load ${label}: Invalid ${bad.join(', ')}`);
    }
    return createElement(Inner, props);
  };
  Validated.displayName = `Validated(${Inner.displayName || Inner.name || label})`;
  return Validated;
}
