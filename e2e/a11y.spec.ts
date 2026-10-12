import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Harness } from './fixtures/harness';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function seriousViolations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

const CHART = {
  chartType: 'bar',
  title: 'Views per month',
  data: [
    { month: 'Jan', views: 120 },
    { month: 'Feb', views: 180 },
    { month: 'Mar', views: 90 },
  ],
};

async function mountChart(h: Harness) {
  await h.mount('kaltura-chart', CHART);
  await expect(h.page.locator('.kaltura-chart-container')).toBeVisible();
}

test('chart has no serious axe violations', async ({ harness: h }) => {
  await h.open();
  await mountChart(h);
  expect(await seriousViolations(h.page)).toEqual([]);
});

// A dark host: data-theme on the root, dark page, light text. No design tokens.
const DARK_PAGE = 'html, body { background: #111; color: #eee; }';

test('chart on a dark host page has no serious axe violations', async ({ harness: h }) => {
  await h.open();
  await h.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await h.page.addStyleTag({ content: DARK_PAGE });
  await mountChart(h);
  expect(await seriousViolations(h.page)).toEqual([]);
});

test('chart on a dark host page with host tokens has no serious axe violations', async ({ harness: h }) => {
  await h.open();
  await h.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await h.page.addStyleTag({
    content: `${DARK_PAGE} :root { --surface-card: #1b1b1b; --surface-elevated: #262626; --page-text: #f5f5f5; --page-text-secondary: #d0d0d0; --page-text-muted: #b0b0b0; }`,
  });
  await mountChart(h);
  expect(await seriousViolations(h.page)).toEqual([]);
});

test('flashcards have no serious axe violations', async ({ harness: h }) => {
  await h.open();
  await h.mount('kaltura-flashcards', {
    title: 'Deck',
    summary: 'A short **summary**.',
    cards: [
      { title: 'Card one', content: 'First card text.' },
      { title: 'Card two', content: 'Second card text.' },
    ],
  });
  await expect(h.page.locator('.flashcard-content').first()).toBeVisible();
  expect(await seriousViolations(h.page)).toEqual([]);
});
