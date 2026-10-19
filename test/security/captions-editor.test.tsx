// Covers: SEC-10 (the KS is a data attribute of the editor iframe, never in a URL) and SEC-07 (hostile
// values stay inside one attribute) for the Captions editor (docs/adr/0008). The editor page is a
// fake from test/helpers/captions-remote.ts. The page is fetched, turned into a blob URL and loaded
// in a sandboxed iframe that reads its settings from `data-*` attributes.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { mount, afterQuietPeriod } from '../helpers/render';
import { captionsRemote, EDITOR_URL, EDITOR_INIT, EDITOR_INTEGRITY } from '../helpers/captions-remote';
import { CaptionsEditorCore } from '../../src/core/captions-editor';
import { setKsProvider } from '../../src/core/ks';
import { setErrorHandler, type KalturaError } from '../../src/core/host-hooks';

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const VALID = { partnerId: 123, entryId: '0_abc12345' };

let remote: ReturnType<typeof captionsRemote>;
let errors: KalturaError[];

beforeEach(() => {
  remote = captionsRemote();
  errors = [];
  setErrorHandler(error => errors.push(error));
  setKsProvider(() => HOST_KS);
});

afterEach(() => {
  remote.restore();
  setErrorHandler(undefined);
  setKsProvider(undefined);
  document.body.innerHTML = '';
});

const frame = (container: Element) => container.querySelector('iframe') as HTMLIFrameElement;

describe('SEC-10: the editor page request', () => {
  it('SEC-10: the page comes from the fixed service host URL, without cookies, referrer or query string', async () => {
    await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    expect(remote.fetches).toEqual([{ url: EDITOR_URL, init: EDITOR_INIT }]);
  });

  it('SEC-10: props cannot change the page URL', async () => {
    await mount(CaptionsEditorCore, { ...VALID, uiconfId: 55, ks: 'https://evil.example/ks' });
    await remote.ready();
    expect(remote.fetches.map(fetch => fetch.url)).toEqual([EDITOR_URL]);
  });

  it('SEC-10: no page is requested for bad props', async () => {
    await mount(CaptionsEditorCore, { ...VALID, entryId: '../x' });
    expect(remote.fetches).toEqual([]);
  });
});

describe('SEC-07: assetId', () => {
  it('SEC-07: a valid assetId is one data attribute of the iframe', async () => {
    const { container } = await mount(CaptionsEditorCore, { ...VALID, assetId: '1_asset123' });
    await remote.ready();
    expect(frame(container).getAttribute('data-assetid')).toBe('1_asset123');
  });

  it.each([undefined, ''])('SEC-07: assetId %j sets no attribute', async assetId => {
    const { container } = await mount(CaptionsEditorCore, { ...VALID, assetId });
    await remote.ready();
    expect(frame(container).hasAttribute('data-assetid')).toBe(false);
  });

  it.each(['../x', '1_a"b', 'a b', '1_'.padEnd(70, 'a')])('SEC-07: the hostile assetId %j loads no page', async assetId => {
    const { container } = await mount(CaptionsEditorCore, { ...VALID, assetId });
    expect([remote.fetches, container.textContent]).toEqual([[], 'Failed to load captions editor: Invalid assetId']);
  });

  it('SEC-07: a new assetId rebuilds the iframe with the new attribute', async () => {
    const { container, root } = await mount(CaptionsEditorCore, { ...VALID, assetId: '1_aaa' });
    await remote.ready();
    await act(async () => root.render(createElement(CaptionsEditorCore, { ...VALID, assetId: '1_bbb' })));
    await afterQuietPeriod();
    await remote.ready(2);
    expect(frame(container).getAttribute('data-assetid')).toBe('1_bbb');
  });
});

describe('SEC-10: the editor iframe', () => {
  it('SEC-10: the iframe loads the blob URL of the page and is sandboxed', async () => {
    const { container } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    expect([frame(container).getAttribute('src'), frame(container).getAttribute('sandbox')]).toEqual([
      remote.blobs[0],
      'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
    ]);
  });

  it('SEC-10: the KS is only in the data-ks attribute', async () => {
    const { container } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    const html = frame(container).outerHTML.split(HOST_KS);
    expect([html.length, frame(container).getAttribute('data-ks'), container.textContent, JSON.stringify(remote.fetches)]).toEqual([
      2,
      HOST_KS,
      '',
      expect.not.stringContaining(HOST_KS),
    ]);
  });

  it('SEC-07: a ks with markup stays in one attribute and adds no element', async () => {
    setKsProvider(undefined);
    const hostile = `"><img src=x onerror="window.__pwned=1">`;
    const { container } = await mount(CaptionsEditorCore, { ...VALID, ks: hostile });
    await remote.ready();
    expect([frame(container).getAttribute('data-ks'), container.querySelectorAll('*').length, container.querySelectorAll('img').length]).toEqual([hostile, 2, 0]);
  });

  it('SEC-10: the iframe has the fixed title and the playback permissions only, for named origins and no wildcard', async () => {
    const { container } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    const origins = `'self' https://cdnapisec.kaltura.com`;
    expect([frame(container).title, frame(container).allow]).toEqual([
      'Kaltura Captions Editor',
      `autoplay ${origins}; fullscreen ${origins}; encrypted-media ${origins}`,
    ]);
  });
});

describe('SEC-10: lifecycle', () => {
  it('SEC-10: unmount empties the container and revokes the blob URL', async () => {
    const { container, root } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    const holder = container.firstElementChild as HTMLElement;
    await act(async () => root.unmount());
    expect([holder.childElementCount, remote.revoked]).toEqual([0, remote.blobs]);
  });

  it('SEC-10: a prop change replaces the iframe and revokes the old blob URL', async () => {
    const { container, root } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    await act(async () => root.render(createElement(CaptionsEditorCore, { ...VALID, entryId: '0_other123' })));
    await remote.ready(2);
    expect([container.querySelectorAll('iframe').length, frame(container).getAttribute('data-entryid'), remote.revoked]).toEqual([1, '0_other123', [remote.blobs[0]]]);
  });

  it('SEC-10: valid to invalid props removes the iframe and shows the error', async () => {
    const { container, root } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    await act(async () => {
      root.render(createElement(CaptionsEditorCore, { ...VALID, partnerId: '1' } as never));
    });
    expect([container.querySelectorAll('iframe').length, container.textContent, remote.revoked]).toEqual([
      0,
      'Failed to load captions editor: Invalid partnerId',
      remote.blobs,
    ]);
  });
});

describe('SEC-10: the pinned page', () => {
  it('SEC-10: the page request carries the sha384 hash of the pinned page and the page path names the pinned version', async () => {
    await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    expect([remote.fetches[0].init?.integrity, EDITOR_URL]).toEqual([EDITOR_INTEGRITY, expect.stringContaining('/captionstudio/v1.3.10/')]);
  });

  it('SEC-10: the blob page has a hash and crossorigin on main.js and main.css, and keeps the existing hash on bootstrap', async () => {
    await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    const doc = new DOMParser().parseFromString(await remote.pageText(0), 'text/html');
    const pinned = [...doc.querySelectorAll('script, link[rel~="stylesheet"]')].map(el => [
      el.getAttribute('src') ?? el.getAttribute('href'),
      el.getAttribute('integrity')?.slice(0, 7),
      el.getAttribute('crossorigin'),
    ]);
    expect(pinned).toEqual([
      ['bootstrap.min.css', 'sha384-', 'anonymous'],
      ['./static/css/main.74b8a353.css', 'sha384-', 'anonymous'],
      ['./static/js/main.6315bf26.js', 'sha384-', 'anonymous'],
    ]);
  });

  it('SEC-10: the hashes on main.js and main.css are the pinned ones', async () => {
    await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    const doc = new DOMParser().parseFromString(await remote.pageText(0), 'text/html');
    expect([doc.querySelector('script')?.getAttribute('integrity'), doc.querySelector('link[href*="main."]')?.getAttribute('integrity')]).toEqual([
      'sha384-iYhkCPdMwqiJ1wjyPCV5MqsbuVv3oGWa++mhGj30xoyxj1cCaAWEQXB9nuy+dBU0',
      'sha384-2kxBNi7/SGtDcBTjMkIn4DH7vjmBIfgHZ2WWhIto/1JNh+d+34SV0fScG987xwlZ',
    ]);
  });

  it('SEC-10: a page that does not match its hash shows the fixed text, builds no blob and sends no KS', async () => {
    remote.fetch = 'tampered';
    const { container } = await mount(CaptionsEditorCore, VALID);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect([container.textContent, container.querySelectorAll('iframe').length, remote.blobs, JSON.stringify([remote.fetches, errors]).includes(HOST_KS)]).toEqual([
      'Failed to load captions editor: Captions editor could not start',
      0,
      [],
      false,
    ]);
  });

  it('SEC-10: a page with a script that has no pinned hash shows the fixed text and builds no blob', async () => {
    remote.fetch = 'unpinned-script';
    const { container } = await mount(CaptionsEditorCore, VALID);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect([container.textContent, container.querySelectorAll('iframe').length, remote.blobs]).toEqual([
      'Failed to load captions editor: Captions editor could not start',
      0,
      [],
    ]);
  });
});

describe('SEC-10: the page request limits', () => {
  it('SEC-10: a page over 1 MiB shows the fixed text and builds no blob', async () => {
    remote.fetch = 'oversize';
    const { container } = await mount(CaptionsEditorCore, VALID);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect([container.textContent, remote.blobs]).toEqual(['Failed to load captions editor: Captions editor could not start', []]);
  });

  it('SEC-10: a request that takes more than 15 s is aborted and shows the fixed text', async () => {
    const timers = vi.spyOn(globalThis, 'setTimeout');
    remote.fetch = 'hold';
    const { container } = await mount(CaptionsEditorCore, VALID);
    const limit = timers.mock.calls.find(([, delay]) => delay === 15_000)?.[0] as () => void;
    await act(async () => limit());
    expect([(remote.fetches[0].init?.signal as AbortSignal).aborted, container.textContent, remote.blobs]).toEqual([
      true,
      'Failed to load captions editor: Captions editor could not start',
      [],
    ]);
  });

  it('SEC-10: unmount aborts the page request', async () => {
    remote.fetch = 'hold';
    const { root } = await mount(CaptionsEditorCore, VALID);
    await act(async () => root.unmount());
    expect((remote.fetches[0].init?.signal as AbortSignal).aborted).toBe(true);
  });
});

describe('SEC-10: load failures show fixed text and a load-failed code', () => {
  it.each(['http-error', 'not-html', 'network-error'] as const)('SEC-10: when the page request ends as "%s"', async mode => {
    remote.fetch = mode;
    const { container } = await mount(CaptionsEditorCore, VALID);
    const text = 'Failed to load captions editor: Captions editor could not start';
    expect([container.textContent, container.querySelectorAll('iframe').length, remote.blobs, errors]).toEqual([
      text,
      0,
      [],
      [{ code: 'load-failed', widget: 'captions-editor', message: text }],
    ]);
  });

  it('SEC-10: no failure text holds the KS', async () => {
    remote.fetch = 'network-error';
    const { container } = await mount(CaptionsEditorCore, VALID);
    expect(JSON.stringify([container.innerHTML, errors]).includes(HOST_KS)).toBe(false);
  });

  it('SEC-10: unmount while the page is loading creates no iframe and no error', async () => {
    remote.fetch = 'hold';
    const { root } = await mount(CaptionsEditorCore, VALID);
    await act(async () => root.unmount());
    expect([remote.blobs, errors]).toEqual([[], []]);
  });
});
