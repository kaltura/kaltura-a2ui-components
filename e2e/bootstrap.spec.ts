import { test, expect } from './fixtures/harness';
import { wcTags } from './fixtures/tags';

const tags = wcTags();

async function undefinedTags(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate((all) => all.filter((t) => !customElements.get(t)), tags);
}

test('KALTURA_WC_TAGS lists 12 tags', () => {
  expect(tags).toHaveLength(12);
});

test('loads on a bare page with no process shim', async ({ harness: h }) => {
  await h.open();
  expect(h.pageErrors).toEqual([]);
});

test('defines all tags on a bare page', async ({ harness: h }) => {
  await h.open();
  expect(await undefinedTags(h.page)).toEqual([]);
});
