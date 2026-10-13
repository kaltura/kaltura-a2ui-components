// Fake Express Recorder script: `Kaltura.ExpressRecorder.create`, like express-recorder.js.
// jsdom fetches no scripts, so the helper fires the script tag's load or error event itself.
// Used by test/security/recorder*.test.tsx and the tests that mount a recorder.
import { vi } from 'vitest';

export const SCRIPT_URL = 'https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js';

export interface RecorderRemote {
  /** Calls in order: create, destroy. */
  log: string[];
  /** Container id and options of every `create`. */
  created: Array<{ id: string; options: Record<string, unknown> }>;
  /** What the script tag does once it is in the page. `hold` never finishes. */
  script: 'load' | 'error' | 'hold' | 'no-api';
  /** `create` throws, returns a handle with no `instance`, or returns one whose `destroy` throws. */
  create: 'ok' | 'throw' | 'no-instance' | 'destroy-throws';
  /** Script tags for the recorder. */
  tags: () => HTMLScriptElement[];
  /** Calls the listeners of the latest recorder, as the script does. */
  emit: (type: string, detail?: unknown) => void;
  /** Waits until `count` recorders exist. The load chain can outlast the DOM wait in `mount`. */
  ready: (count?: number) => Promise<void>;
}

/** Installs the fake script API on `window`. Call `restore` in `afterEach`. */
export function recorderRemote(): RecorderRemote & { restore: () => void } {
  const listeners: Record<string, Array<(event: unknown) => void>> = {};
  const append = document.head.append.bind(document.head);
  const remote: RecorderRemote & { restore: () => void } = {
    log: [],
    created: [],
    script: 'load',
    create: 'ok',
    tags: () => [...document.querySelectorAll<HTMLScriptElement>('script[src*="express-recorder"]')],
    emit: (type, detail) => (listeners[type] ?? []).forEach(listener => listener({ type, detail })),
    ready: async (count = 1) => {
      await vi.waitFor(() => {
        if (remote.created.length < count) throw new Error('recorder not created yet');
      });
    },
    restore: () => {
      spy.mockRestore();
      delete (window as { Kaltura?: unknown }).Kaltura;
    },
  };
  const spy = vi.spyOn(document.head, 'append').mockImplementation((...nodes: Array<Node | string>) => {
    append(...nodes);
    for (const node of nodes) {
      if (!(node instanceof HTMLScriptElement) || !node.src.includes('express-recorder')) continue;
      if (remote.script === 'hold') continue;
      if (remote.script === 'no-api') {
        delete (window as { Kaltura?: unknown }).Kaltura;
      } else if (remote.script === 'load') {
        (window as { Kaltura?: unknown }).Kaltura = {
          ExpressRecorder: {
            create: (id: string, options: Record<string, unknown>) => {
              remote.log.push('create');
              remote.created.push({ id, options });
              if (remote.create === 'throw') throw new Error(`cannot find element with id '${id}' ${String(options.ks)}`);
              const ui = document.createElement('div');
              ui.className = 'fake-recorder-ui';
              document.getElementById(id)?.append(ui);
              return {
                destroy: () => {
                  remote.log.push('destroy');
                  if (remote.create === 'destroy-throws') throw new Error('destroy failed');
                },
                ...(remote.create === 'no-instance'
                  ? {}
                  : {
                      instance: {
                        addEventListener: (type: string, listener: (event: unknown) => void) => {
                          (listeners[type] ??= []).push(listener);
                        },
                      },
                    }),
              };
            },
          },
        };
      }
      queueMicrotask(() => node.dispatchEvent(new Event(remote.script === 'error' ? 'error' : 'load')));
    }
  });
  return remote;
}

/**
 * Imports a fresh recorder core and loader (a new script cache). The host
 * functions come from the same fresh module graph, so they reach that core.
 */
export async function loadRecorder() {
  vi.resetModules();
  // One at a time: vitest can miss a module when two imports run at once.
  const ks = await import('../../src/core/ks');
  const hooks = await import('../../src/core/host-hooks');
  const region = await import('../../src/core/region');
  const script = await import('../../src/core/recorder-script');
  const { RecorderCore } = await import('../../src/core/recorder');
  return {
    RecorderCore,
    loadRecorderScript: script.loadRecorderScript,
    setKsProvider: ks.setKsProvider,
    setEventHandler: hooks.setEventHandler,
    setErrorHandler: hooks.setErrorHandler,
    setRegion: region.setRegion,
  };
}
