import type { ComponentType, FC } from 'react';
import { z } from 'zod';
import { type KalturaErrorCode, type KalturaWidget } from './host-hooks.js';
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
export declare function checkProps(schema: z.ZodObject<z.ZodRawShape>, props: unknown, strict?: boolean): {
    invalid: string[];
    pending: boolean;
};
/** The message of an invalid-props or invalid-ks error. A KS problem points to the fix. */
export declare const invalidText: (invalid: string[]) => string;
/** The schema keys that start the `invalid` paths: `cards.0.title` gives `cards`. */
export declare const topLevelProps: (schema: z.ZodObject<z.ZodRawShape>, invalid: string[]) => string[];
/**
 * True where props never change after the first render, as in the web
 * component adapters. There a missing required prop shows the error, because
 * nothing would ever replace the blank.
 */
export declare const StrictPendingContext: import("react").Context<boolean>;
/**
 * The one plain-text error box. Style: `.kaltura-load-error` in
 * styles/components.css. Reports the error to the host handler. `children`
 * is the message: fixed text and prop names only, never a prop value.
 */
export declare const LoadError: FC<{
    widget: KalturaWidget;
    code?: KalturaErrorCode;
    children: string;
    invalidProps?: string[];
}>;
/**
 * Wraps a core component. Props with a bad value show a plain-text error and
 * the component is never rendered. Props that are still undefined render
 * nothing until they arrive, except under `StrictPendingContext`. `label`
 * names the widget in the message, `widget` in the error handler report.
 * A `partnerId` or `uiconfId` that the host allowlist refuses shows an
 * `origin-not-allowed` error (allowed-ids.ts).
 */
export declare function withValidatedProps<P extends object>(schema: z.ZodObject<z.ZodRawShape>, label: string, Inner: ComponentType<P>, widget: KalturaWidget): FC<P>;
//# sourceMappingURL=validate-props.d.ts.map