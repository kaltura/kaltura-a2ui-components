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

/** Fake `loader` module. `log` records every call in order. */
export function fakeLoader(opts: { wait?: Promise<void>; log: string[]; configs: Record<string, unknown>[] }) {
  return {
    loader: async (cfg: Record<string, unknown>) => {
      opts.configs.push(cfg);
      const n = opts.configs.length;
      opts.log.push(`loader ${n}`);
      await opts.wait;
      return { kill: () => opts.log.push(`kill ${n}`) };
    },
  };
}

export interface MountedVisual { type: string; target: string; settings: Record<string, unknown> }

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
