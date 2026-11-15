// Shared helpers for the Unisphere lifecycle tests (QA-03, QA-07, SEC-18).
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export const URL_A = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
export const URL_B = 'https://unisphere.irp2.ovp.kaltura.com/v1';
export const loaderUrl = (serverUrl: string) => serverUrl.replace(/\/v1$/, '/v1/loader/index.esm.js');

export const tick = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });

/** A promise the test settles by hand, to stop a load half way. */
export function gate() {
  let open!: () => void;
  const wait = new Promise<void>(resolve => { open = resolve; });
  return { wait, open };
}

export async function render(component: unknown, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: Root;
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(component as never, props as never));
  });
  await tick();
  return {
    container,
    root,
    rerender: async (next: Record<string, unknown>) => {
      await act(async () => root.render(createElement(component as never, next as never)));
      await tick();
    },
    unmount: async () => {
      await act(async () => root.unmount());
      await tick();
    },
  };
}

export interface LoadedRuntime { widgetName: string; runtimeName: string; settings: Record<string, unknown> }
export interface MountedVisual { type: string; target: unknown; settings: Record<string, unknown> }

/**
 * Fake `loader` module for the editors. Like the live default workspace, `loader` with `proxy`
 * hands every call the same workspace, and the visuals live in runtimes it loads.
 * `log` records the calls in order: `loader n`, `mount n`, `unmount n`.
 */
export function fakeLoader(opts: {
  /** Holds every `loader` call. */
  wait?: Promise<void>;
  /** Holds `loader` call n (1 based). */
  waits?: Record<number, Promise<void>>;
  /** Holds every `loadRuntime` call. */
  waitLoad?: Promise<void>;
  log: string[];
  configs: Record<string, unknown>[];
  options?: unknown[];
  loads?: LoadedRuntime[];
  visuals?: MountedVisual[];
  sessions?: unknown[];
  /** The visual fails to mount, as the runtime reports it. */
  failMount?: unknown;
  /** Calls the visual listeners, as the runtime does on `partnerChecks.onChanges`. */
  listeners?: Array<(checks: { status: string; isAvailable: boolean }) => void>;
  calls?: string[];
}) {
  let mounts = 0;
  const workspace = {
    session: { setData: (update: () => unknown) => opts.sessions?.push(update()) },
    loadRuntime: async (widgetName: string, runtimeName: string, settings: Record<string, unknown>) => {
      opts.loads?.push({ widgetName, runtimeName, settings });
      await opts.waitLoad;
      return {
        runtime: {
          openDrawer: () => opts.calls?.push('openDrawer'),
          openApplication: (options: unknown) => opts.calls?.push(`openApplication ${JSON.stringify(options)}`),
          partnerChecks: { onChanges: (listener: (checks: { status: string; isAvailable: boolean }) => void) => opts.listeners?.push(listener) },
          mountVisual: (visual: MountedVisual) => {
            mounts += 1;
            const n = mounts;
            opts.log.push(`mount ${n}`);
            opts.visuals?.push(visual);
            return { id: `visual-${n}`, failureReason: opts.failMount, unsubscribe: () => opts.log.push(`unmount ${n}`) };
          },
        },
      };
    },
  };
  return {
    loader: async (cfg: Record<string, unknown>, options?: unknown) => {
      opts.configs.push(cfg);
      opts.options?.push(options);
      const n = opts.configs.length;
      opts.log.push(`loader ${n}`);
      await opts.wait;
      await opts.waits?.[n];
      return workspace;
    },
  };
}

/** Fake `createWorkspace` module. Captures the visuals so a test can click a row. */
export function fakeWorkspaceModule(opts: {
  log: string[];
  configs: Record<string, unknown>[];
  visuals: MountedVisual[];
  waitCreate?: Promise<void>;
  waitRuntime?: Promise<void>;
  waitMount?: Promise<void>;
}) {
  return {
    createWorkspace: async (cfg: Record<string, unknown>) => {
      opts.configs.push(cfg);
      const n = opts.configs.length;
      opts.log.push(`create ${n}`);
      await opts.waitCreate;
      return {
        kill: () => opts.log.push(`kill ${n}`),
        getRuntimeAsync: async () => {
          await opts.waitRuntime;
          return {
            mountVisual: async (visual: MountedVisual) => {
              opts.visuals.push(visual);
              await opts.waitMount;
              return { id: `visual-${n}` };
            },
            unmountVisual: (id: string) => opts.log.push(`unmount ${id}`),
          };
        },
      };
    },
  };
}

export function errorSpy() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}
