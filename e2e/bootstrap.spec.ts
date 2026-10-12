import { test, expect } from './fixtures/harness';
import { wcTags } from './fixtures/tags';

const tags = wcTags();

async function undefinedTags(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate((all) => all.filter((t) => !customElements.get(t)), tags);
}

test('KALTURA_WC_TAGS lists 12 tags', () => {
  expect(tags).toHaveLength(12);
});

test('defines all tags when the host provides process.env', async ({ harness: h }) => {
  await h.open();
  expect(h.pageErrors).toEqual([]);
  expect(await undefinedTags(h.page)).toEqual([]);
});

test('[pending E2E-01] loads on a bare page with no process shim', async ({ harness: h }) => {
  await h.open({ noshim: true });
  expect(h.pageErrors).toEqual([]);
});

test('[pending E2E-01] defines all tags on a bare page', async ({ harness: h }) => {
  await h.open({ noshim: true });
  expect(await undefinedTags(h.page)).toEqual([]);
});
