// Fake editor page for the captions editor: stubs `fetch` and the blob URL functions.
// jsdom has no `URL.createObjectURL` and loads no iframes, so the test reads the iframe attributes only.
// Used by the tests that mount a captions editor.
import { vi } from 'vitest';

export const EDITOR_URL = 'https://www.kaltura.com/apps/captionstudio/latest/embed.php';
export const EDITOR_HTML = '<!doctype html><base href="https://www.kaltura.com/apps/captionstudio/latest/"><title>editor</title>';

export interface CaptionsRemote {
  /** Every fetch: URL and options. */
  fetches: Array<{ url: string; init?: RequestInit }>;
  /** The blob URL created for each page, in order. */
  blobs: string[];
  /** Blob URLs given to `revokeObjectURL`. */
  revoked: string[];
  /** What the page request does. `hold` never finishes. */
  fetch: 'ok' | 'http-error' | 'not-html' | 'network-error' | 'hold';
  /** Waits until `count` pages were fetched and turned into blob URLs. */
  ready: (count?: number) => Promise<void>;
  restore: () => void;
}

/** Installs the stubs. Call `restore` in `afterEach`. */
export function captionsRemote(): CaptionsRemote {
  const remote: CaptionsRemote = {
    fetches: [],
    blobs: [],
    revoked: [],
    fetch: 'ok',
    ready: async (count = 1) => {
      await vi.waitFor(() => {
        if (remote.blobs.length < count) throw new Error('editor page not ready yet');
      });
    },
    restore: () => {
      fetchSpy.mockRestore();
      delete (URL as { createObjectURL?: unknown }).createObjectURL;
      delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    },
  };
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    remote.fetches.push({ url: String(input), init });
    if (remote.fetch === 'hold') return new Promise<Response>(() => {});
    if (remote.fetch === 'network-error') throw new TypeError('Failed to fetch');
    return new Response(EDITOR_HTML, {
      status: remote.fetch === 'http-error' ? 500 : 200,
      headers: { 'content-type': remote.fetch === 'not-html' ? 'text/plain' : 'text/html; charset=utf-8' },
    });
  });
  Object.assign(URL, {
    createObjectURL: () => {
      const url = `blob:https://host.example/fake-${remote.blobs.length + 1}`;
      remote.blobs.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => remote.revoked.push(url),
  });
  return remote;
}
