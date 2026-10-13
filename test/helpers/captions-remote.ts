// Fake editor page for the captions editor: stubs `fetch` and the blob URL functions.
// jsdom has no `URL.createObjectURL` and loads no iframes, so the test reads the iframe attributes only.
// The page is the real v1.3.10 `embed.php` (its <base> tag names the host). Like a browser, the fake
// `fetch` rejects when the body does not match the `integrity` option.
// Used by the tests that mount a captions editor.
import { createHash } from 'node:crypto';
import { expect, vi } from 'vitest';

export const EDITOR_URL = 'https://www.kaltura.com/apps/captionstudio/v1.3.10/embed.php';
export const EDITOR_HTML = '<!DOCTYPE html><html lang="en" class="closed-captions-html"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no"><meta name="theme-color" content="#000000"><base href="https://www.kaltura.com/apps/captionstudio/v1.3.10/index.html" /><link rel="stylesheet" href="bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous"><title>Closed Captions Studio</title><link href="./static/css/main.74b8a353.css" rel="stylesheet"></head><body class="closed-captions-body"><noscript>You need to enable JavaScript to run this app.</noscript><div id="root" class="closed-captions-studio"></div><script type="text/javascript" src="./static/js/main.6315bf26.js"></script></body></html>';
/** The sha384 of `EDITOR_HTML`: what the editor pins for the US host. */
export const EDITOR_INTEGRITY = 'sha384-HajZJL7XrUQ8Z7IPRBS0KXRI4J5/fQ83kcyvxaVfGoi2pKKD4sWGltXVnNjZ6bFJ';
/** The `fetch` options the editor sends to the US host. */
export const EDITOR_INIT = {
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
  redirect: 'error',
  integrity: EDITOR_INTEGRITY,
  signal: expect.any(AbortSignal),
};

export interface CaptionsRemote {
  /** Every fetch: URL and options. */
  fetches: Array<{ url: string; init?: RequestInit }>;
  /** The blob URL created for each page, in order. */
  blobs: string[];
  /** The text of the page behind blob URL number `index`. */
  pageText: (index: number) => Promise<string>;
  /** Blob URLs given to `revokeObjectURL`. */
  revoked: string[];
  /**
   * What the page request does. `hold` ends only when aborted. `tampered` is a page that does
   * not match its hash. `oversize` and `unpinned-script` skip the hash check, to reach the later checks.
   */
  fetch: 'ok' | 'http-error' | 'not-html' | 'network-error' | 'hold' | 'tampered' | 'oversize' | 'unpinned-script';
  /** Waits until `count` pages were fetched and turned into blob URLs. */
  ready: (count?: number) => Promise<void>;
  restore: () => void;
}

/** Installs the stubs. Call `restore` in `afterEach`. */
export function captionsRemote(): CaptionsRemote {
  const objects: Blob[] = [];
  const remote: CaptionsRemote = {
    fetches: [],
    blobs: [],
    pageText: index =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(objects[index]);
      }),
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
    if (remote.fetch === 'hold') {
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    }
    if (remote.fetch === 'network-error') throw new TypeError('Failed to fetch');
    const page = EDITOR_HTML.replace('https://www.kaltura.com', new URL(String(input)).origin);
    const body =
      remote.fetch === 'tampered'
        ? page.replace('<title>', '<script>alert(1)</script><title>')
        : remote.fetch === 'unpinned-script'
          ? page.replace('</body>', '<script src="./static/js/other.js"></script></body>')
          : remote.fetch === 'oversize'
            ? page + ' '.repeat(1024 * 1024)
            : page;
    const checked = remote.fetch !== 'unpinned-script' && remote.fetch !== 'oversize';
    if (checked && init?.integrity !== `sha384-${createHash('sha384').update(body).digest('base64')}`) throw new TypeError('Failed to fetch');
    return new Response(body, {
      status: remote.fetch === 'http-error' ? 500 : 200,
      headers: { 'content-type': remote.fetch === 'not-html' ? 'text/plain' : 'text/html; charset=utf-8' },
    });
  });
  Object.assign(URL, {
    createObjectURL: (blob: Blob) => {
      const url = `blob:https://host.example/fake-${remote.blobs.length + 1}`;
      remote.blobs.push(url);
      objects.push(blob);
      return url;
    },
    revokeObjectURL: (url: string) => remote.revoked.push(url),
  });
  return remote;
}
