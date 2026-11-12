// The live demo (examples/demo): every example plays, the round trips work, the
// inspector shows the wire, and no example has a serious axe violation in light or dark.
// It builds the demo from dist/ into a temp folder, so run "npm run build" first (the
// e2e server does that when dist/ is missing).
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { build } from 'vite';

const config = fileURLToPath(new URL('../examples/demo/vite.config.ts', import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const EXAMPLES = readdirSync(fileURLToPath(new URL('../examples/a2ui', import.meta.url)))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace('.json', ''));

let server: Server;
let origin: string;

test.beforeAll(async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'kaltura-demo-'));
  await build({ configFile: config, logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  server = createServer((request, response) => {
    const path = join(outDir, (request.url ?? '/').split('?')[0]);
    const file = path.startsWith(outDir) && existsSync(path) && statSync(path).isFile() ? path : join(outDir, 'index.html');
    response.setHeader('content-type', TYPES[extname(file)] ?? 'text/plain');
    response.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(() => server.close());

/** Opens an example. Requests to other hosts get an empty 200, so no network is needed. */
async function open(page: Page, slug: string) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => message.type() === 'error' && problems.push(`console: ${message.text()}`));
  await page.route((url) => url.hostname !== '127.0.0.1', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto(`${origin}/#${slug}`);
  await page.getByLabel('Stream messages').uncheck();
  return problems;
}


for (const slug of EXAMPLES) {
  test(`${slug}: plays with no page error and sends capabilities first`, async ({ page }) => {
    const problems = await open(page, slug);
    await expect(page.getByTestId('stage')).not.toContainText('Waiting for the first message');
    await expect(page.getByRole('list', { name: 'Messages' }).getByRole('listitem').first()).toContainText('a2uiRendererCapabilities');
    expect(problems.filter((problem) => !/Failed to load resource|ERR_|MIME/.test(problem))).toEqual([]);
  });

  for (const theme of ['light', 'dark']) {
    test(`${slug}: no serious axe violation in the ${theme} theme`, async ({ page }) => {
      await open(page, slug);
      await page.getByLabel('Theme').selectOption(theme);
      await expect(page.getByTestId('stage')).not.toContainText('Waiting for the first message');
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
}

test('analytics: a button sends an event, and the reply changes the summary and the chart', async ({ page }) => {
  await open(page, '01_analytics-overview');
  await expect(page.getByText('1,708 plays in the last 7 days')).toBeVisible();
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await expect(page.getByText('6,647 plays in the last 30 days')).toBeVisible();
  await expect(page.getByTestId('stage').getByText('Plays per week')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Messages' })).toHaveText(/renderer-to-agent\s*action[\s\S]*agent-to-renderer\s*updateDataModel/);
});

test('search form: typed values go to the agent, and the reply fills the list', async ({ page }) => {
  await open(page, '03_search-form');
  await page.getByLabel('Search for').fill('lab safety');
  await page.getByTestId('stage').getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('stage').getByText('Lecture 1: Cells')).toBeVisible();
  await page.getByRole('tab', { name: /Wire/ }).click();
  const action = page.getByRole('list', { name: 'Messages' }).getByRole('listitem').filter({ hasText: /renderer-to-agent\s*action/ });
  await action.locator('summary').click();
  await expect(action).toContainText('"query": "lab safety"');
});

test('study kit: tabs switch and the flashcards render', async ({ page }) => {
  await open(page, '02_study-kit');
  await page.getByTestId('stage').getByRole('button', { name: 'Flashcards' }).click();
  await expect(page.getByTestId('stage').getByText('Mitochondria').first()).toBeVisible();
});

test('safe by default: the host refuses the player, and the agent gets an error', async ({ page }) => {
  await open(page, '04_safe-by-default');
  await expect(page.getByTestId('stage')).toContainText('partnerId is not allowed');
  const wire = page.getByRole('list', { name: 'Messages' });
  await expect(wire).toContainText('playerFeedback');
  await expect(wire).toContainText(/renderer-to-agent\s*error/);
});

test('theme: the picker sets data-theme, and System removes it', async ({ page }) => {
  await open(page, '01_analytics-overview');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Theme').selectOption('auto');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test('keyboard: the example list and the replay button work without a mouse', async ({ page }) => {
  await open(page, '01_analytics-overview');
  await page.getByRole('button', { name: 'Study kit' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Study kit' })).toBeVisible();
});

test('data model: the inspector shows what the agent sent', async ({ page }) => {
  await open(page, '01_analytics-overview');
  await page.getByRole('tab', { name: 'Data model' }).click();
  await expect(page.getByTestId('data-model')).toContainText('"total": 1708');
});

test('live ids: the form allows your ids and keeps the session off the page', async ({ page }) => {
  await open(page, '05_media-workspace');
  await page.getByText('Use your Kaltura account').click();
  await page.getByLabel('Partner ID').fill('555');
  await page.getByLabel('Kaltura Session').fill('secret-session');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('stage')).not.toContainText('partnerId is not allowed');
  expect(await page.content()).not.toContain('secret-session');
});
