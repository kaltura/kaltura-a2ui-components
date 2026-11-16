// Fake recorder loader page. jsdom loads no frames, so the helper plays the page: it sends `recorderInit`
// from the frame's window and records what the host posts back (`loadRecorder`).
// Used by test/security/recorder*.test.tsx and the tests that mount a recorder.
import { vi } from 'vitest';

export const UNISPHERE = 'https://unisphere.nvp1.ovp.kaltura.com';

export interface RecorderFrame {
  /** Recorder frames in the page. */
  frames: () => HTMLIFrameElement[];
  /** Every `loadRecorder` the host posted: the frame, the target origin and the payload. */
  created: Array<{ frame: HTMLIFrameElement; targetOrigin: string; options: Record<string, unknown>; env: unknown }>;
  /** Sends a message as the page of a frame. Default: the latest frame and the origin in its `src`. */
  post: (data: unknown, from?: { frame?: HTMLIFrameElement; origin?: string; source?: Window | null }) => void;
  /** An `uploadComplete` message with the payload as a JSON string, as the recorder sends it. */
  uploaded: (payload: unknown, from?: { frame?: HTMLIFrameElement }) => void;
  /** Waits for `count` frames, then sends `recorderInit` from each new one. */
  ready: (count?: number) => Promise<void>;
  restore: () => void;
}

export function recorderFrame(): RecorderFrame {
  const seen = new Set<HTMLIFrameElement>();
  const spies: Array<{ mockRestore: () => void }> = [];
  const frames = () => [...document.querySelectorAll<HTMLIFrameElement>('iframe[title="Kaltura recorder"]')];
  const created: RecorderFrame['created'] = [];
  const post: RecorderFrame['post'] = (data, from = {}) => {
    const frame = from.frame ?? frames().at(-1);
    window.dispatchEvent(new MessageEvent('message', { data, origin: from.origin ?? (frame ? new URL(frame.src).origin : UNISPHERE), source: 'source' in from ? from.source : frame?.contentWindow }));
  };
  return {
    frames,
    created,
    post,
    uploaded: (payload, from) => post({ messageType: 'uploadComplete', payload: JSON.stringify(payload) }, from),
    ready: async (count = 1) => {
      await vi.waitFor(() => {
        if (frames().length < count) throw new Error('recorder frame not created yet');
      });
      for (const frame of frames().filter(candidate => !seen.has(candidate))) {
        seen.add(frame);
        const target = frame.contentWindow;
        if (!target) throw new Error('frame has no window');
        spies.push(
          vi.spyOn(target, 'postMessage').mockImplementation(((message: { payload?: { config?: Record<string, unknown>; env?: unknown } }, targetOrigin: string) => {
            created.push({ frame, targetOrigin, options: message.payload?.config ?? {}, env: message.payload?.env });
          }) as never),
        );
        post({ messageType: 'recorderInit' }, { frame });
      }
    },
    restore: () => spies.forEach(spy => spy.mockRestore()),
  };
}

/**
 * Imports a fresh recorder core. The host functions come from the same fresh module graph,
 * so they reach that core.
 */
export async function loadRecorder() {
  vi.resetModules();
  // One at a time: vitest can miss a module when two imports run at once.
  const ks = await import('../../src/core/ks');
  const hooks = await import('../../src/core/host-hooks');
  const region = await import('../../src/core/region');
  const { RecorderCore } = await import('../../src/core/recorder');
  return {
    RecorderCore,
    setKsProvider: ks.setKsProvider,
    setEventHandler: hooks.setEventHandler,
    setErrorHandler: hooks.setErrorHandler,
    setRegion: region.setRegion,
  };
}
