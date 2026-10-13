// Covers: SEC-10 (the KS is a data attribute of the editor iframe, never in a URL) and SEC-07 (hostile
// values stay inside one attribute) for the Captions editor (docs/adr/0008). The editor page is a
// fake from test/helpers/captions-remote.ts. The page is fetched, turned into a blob URL and loaded
// in a sandboxed iframe that reads its settings from `data-*` attributes.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createElement, act } from 'react';
import { mount } from '../helpers/render';
import { captionsRemote, EDITOR_URL } from '../helpers/captions-remote';
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
    expect(remote.fetches).toEqual([{ url: EDITOR_URL, init: { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' } }]);
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

  it('SEC-10: the iframe has the fixed title and the playback permissions only', async () => {
    const { container } = await mount(CaptionsEditorCore, VALID);
    await remote.ready();
    expect([frame(container).title, frame(container).allow]).toEqual(['Kaltura Captions Editor', 'autoplay *; fullscreen *; encrypted-media *']);
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
