import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StrictPendingContext } from '../../core/validate-props';
import { ReporterContext, type KalturaReporter } from '../../core/host-hooks';

/**
 * Defines a custom element that renders `Core` from its `config` property.
 * One React root per element: created on connect, unmounted on disconnect.
 * Setting `config` at any time re-renders. With `initial` null, nothing renders
 * until `config` is set. A `config` that is not a plain object (text, number,
 * array) counts as empty props, so the element shows its plain-text error.
 * The unmount waits one microtask, so moving the element keeps its widget.
 * With `config.action` set to `{ event: { name } }`, each widget error and
 * event fires a `kaltura-action` DOM event. See docs/host-api.md.
 * Idempotent.
 */
export function defineKalturaElement<P extends object>(
  tag: string,
  Core: ComponentType<P>,
  initial: Partial<P> | null = {},
): void {
  if (customElements.get(tag)) return;

  customElements.define(
    tag,
    class extends HTMLElement {
      private current = initial;
      private root: Root | null = null;
      private queued = false;
      // Fixed fields only. The page context in `config` is not sent back.
      private reporter: KalturaReporter = {
        send: context => {
          const name = (this.current as { action?: { event?: { name?: unknown } } } | null)?.action?.event?.name;
          if (typeof name === 'string') this.dispatchEvent(new CustomEvent('kaltura-action', { bubbles: true, composed: true, detail: { name, context } }));
        },
      };

      get config(): Partial<P> | null {
        return this.current;
      }

      set config(value: Partial<P> | null) {
        this.current = value;
        this.render();
      }

      connectedCallback(): void {
        // A `config` set before the element was defined shadows the setter.
        if (Object.hasOwn(this, 'config')) {
          const early = (this as { config?: Partial<P> | null }).config;
          delete (this as { config?: unknown }).config;
          this.current = early ?? null;
        }
        this.root ??= createRoot(this);
        this.render();
      }

      disconnectedCallback(): void {
        queueMicrotask(() => {
          if (this.isConnected) return;
          this.root?.unmount();
          this.root = null;
        });
      }

      // Batched to a microtask, so connect plus `config` in one task renders once.
      private render(): void {
        if (this.queued) return;
        this.queued = true;
        queueMicrotask(() => {
          this.queued = false;
          const config = this.current;
          const isObject = typeof config === 'object' && config !== null && !Array.isArray(config);
          const props = isObject ? config : initial === null && config == null ? null : {};
          const { action: _action, ...rest } = (props ?? {}) as { action?: unknown };
          this.root?.render(
            props &&
              createElement(
                ReporterContext.Provider,
                { value: this.reporter },
                createElement(StrictPendingContext.Provider, { value: true }, createElement(Core, rest as P)),
              ),
          );
        });
      }
    },
  );
}
