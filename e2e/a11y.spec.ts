import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/harness';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function seriousViolations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

test('chart has no serious axe violations', async ({ harness: h }) => {
  await h.open();
  await h.mount('kaltura-chart', {
    chartType: 'bar',
    title: 'Views per month',
    data: [
      { month: 'Jan', views: 120 },
      { month: 'Feb', views: 180 },
      { month: 'Mar', views: 90 },
    ],
  });
  await expect(h.page.locator('.kaltura-chart-container')).toBeVisible();
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
