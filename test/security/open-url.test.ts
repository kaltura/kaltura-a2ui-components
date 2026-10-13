import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { buildKalturaCatalog, kalturaReactCatalog } from '../../src/adapters/react';
import { renderSurface } from './surface-helper';

type Invoke = (name: string, args: unknown, ctx: never) => unknown;
const callOpenUrl = (catalog = kalturaReactCatalog, url: unknown = '') =>
  (catalog.invoker as Invoke)('openUrl', { url }, {} as never);

describe('SEC-02: openUrl in the merged Kaltura catalog', () => {
  let open: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    open = vi.fn();
    vi.stubGlobal('open', open);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  it('SEC-02: replaces the basic openUrl in the merged catalog', () => {
    expect(kalturaReactCatalog.functions.get('openUrl')?.name).toBe('openUrl');
    callOpenUrl(kalturaReactCatalog, 'javascript:alert(1)');
    expect(open).not.toHaveBeenCalled();
  });

  it('SEC-02: opens an https URL with noopener,noreferrer', () => {
    callOpenUrl(kalturaReactCatalog, 'https://example.com/a?b=1');
    expect(open).toHaveBeenCalledWith('https://example.com/a?b=1', '_blank', 'noopener,noreferrer');
  });

  it('SEC-02: also blocks in a catalog built with a custom id', () => {
    callOpenUrl(buildKalturaCatalog('https://example.com/c.json'), 'javascript:alert(1)');
    expect(open).not.toHaveBeenCalled();
  });

  it('SEC-02: opens an https URL with an uppercase scheme, normalised', () => {
    callOpenUrl(kalturaReactCatalog, 'HTTPS://example.com/');
    expect(open).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['mixed case', 'JaVaScRiPt:alert(1)'],
    ['leading space', '   javascript:alert(1)'],
    ['leading control char', '\u0001javascript:alert(1)'],
    ['tab inside scheme', 'java\tscript:alert(1)'],
    ['newline inside scheme', 'java\nscript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['blob', 'blob:https://example.com/00000000-0000-0000-0000-000000000000'],
    ['file', 'file:///etc/passwd'],
    ['http', 'http://example.com/'],
    ['mailto', 'mailto:a@example.com'],
    ['protocol-relative', '//example.com/'],
    ['relative path', '/path'],
    ['percent-encoded scheme', '%6Aavascript:alert(1)'],
    ['full-width scheme', 'ｊavascript:alert(1)'],
    ['empty', ''],
    ['not a URL', 'not a url'],
  ])('SEC-02: ignores %s URL and warns', (_label, url) => {
    callOpenUrl(kalturaReactCatalog, url);
    expect(open).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('SEC-02: does not echo the blocked URL in the warning', () => {
    callOpenUrl(kalturaReactCatalog, 'javascript:alert(1)');
    expect(String(warn.mock.calls[0][0])).not.toContain('alert');
  });

  // Since 0.13, a Button runs a functionCall action in the browser, not as an event for the host.
  it.each([
    ['javascript:alert(1)', []],
    ['https://example.com/', [['https://example.com/', '_blank', 'noopener,noreferrer']]],
  ])('SEC-02: a basic Button openUrl action with %s goes through the safe openUrl', async (url, calls) => {
    const view = await renderSurface(kalturaReactCatalog, [
      { id: 'root', component: 'Button', child: 'label', action: { functionCall: { call: 'openUrl', args: { url } } } },
      { id: 'label', component: 'Text', text: 'Open' },
    ]);
    await act(async () => view.host.querySelector('button')?.click());
    act(() => view.root.unmount());
    expect(open.mock.calls).toEqual(calls);
  });
});
