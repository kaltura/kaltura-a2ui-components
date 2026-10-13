// Error states: plain text, one shared alert box, and nothing echoed back.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS } from './fixtures/constants';

const KS = 'DUMMY_KS_NOT_REAL';
const SERVER_URL = `${ALLOWED_HOSTS[0]}/v1`;
const alerts = (h: Harness) => h.page.locator('#host [role=alert]');

test.describe('invalid serverUrl shows a generic plain-text error', () => {
  const BAD_URLS: Record<string, string> = {
    'foreign origin with a path marker': 'https://evil.invalid/E2E_URL_MARKER/v1',
    'markup in the URL': `https://evil.invalid/<img src=x onerror="window.__pwned.push('url')">/E2E_URL_MARKER`,
    'javascript: URL': "javascript:window.__pwned.push('js')//E2E_URL_MARKER",
  };
  for (const tag of ['kaltura-media-manager', 'kaltura-genie-widget']) {
    for (const [name, serverUrl] of Object.entries(BAD_URLS)) {
      test(`${tag}: ${name}`, async ({ harness: h }) => {
        await h.open();
        await h.mount(tag, { partnerId: 1234567, ks: KS, serverUrl });
        await h.settle();
        const text = await h.hostText();
        expect(text).toMatch(/^Failed to load /);
        expect(text).not.toMatch(/evil\.invalid|E2E_URL_MARKER|<img|javascript:/);
        expect(await alerts(h).count()).toBe(1);
        expect(await h.page.locator('#host img, #host script').count()).toBe(0);
        expect(await h.pwned()).toEqual([]);
      });
    }
  }
});

test.describe('error states use one alert box', () => {
  const player = { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' };
  const cases: Array<{ name: string; tag: string; config: Record<string, unknown>; kalturaMode?: 'throw' | 'notfound' }> = [
    { name: 'player with a bad entryId', tag: 'kaltura-player', config: { ...player, entryId: 'bad id' } },
    { name: 'recorder with a bad partnerId (inside the container)', tag: 'kaltura-recorder', config: { partnerId: -1, ks: KS } },
    { name: 'recorder with an empty ks', tag: 'kaltura-recorder', config: { partnerId: 1234567, ks: '' } },
    { name: 'captions editor with a bad entryId', tag: 'kaltura-captions-editor', config: { partnerId: 1234567, ks: KS, entryId: 'bad id' } },
    { name: 'flashcards with no cards array', tag: 'kaltura-flashcards', config: { title: 'Deck', cards: 'nope' } },
    { name: 'media manager with a bad serverUrl', tag: 'kaltura-media-manager', config: { partnerId: 1234567, ks: KS, serverUrl: 'https://evil.invalid/v1' } },
    { name: 'media manager, loader 404', tag: 'kaltura-media-manager', config: { partnerId: 1234567, ks: KS, serverUrl: SERVER_URL }, kalturaMode: 'notfound' },
    { name: 'genie, loader throws', tag: 'kaltura-genie-widget', config: { partnerId: 1234567, ks: KS, serverUrl: SERVER_URL }, kalturaMode: 'throw' },
  ];
  for (const c of cases) {
    test(c.name, async ({ harness: h }) => {
      if (c.kalturaMode) h.kalturaMode = c.kalturaMode;
      await h.open();
      await h.mount(c.tag, c.config);
      await h.settle();
      const alert = alerts(h);
      await expect(alert).toHaveCount(1);
      await expect(alert).toHaveClass('kaltura-load-error');
      await expect(alert).toHaveText(/^Failed to load /);
      await expect(alert).toBeVisible();
    });
  }

  // A web component gets no later config, so a blank would never fill in.
  test('a missing required prop shows the error in a web component', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-player', { partnerId: 1234567, uiconfId: 12345678 });
    await h.settle();
    await expect(alerts(h)).toHaveText('Failed to load player: Invalid entryId');
    await expect(h.page.locator('#host iframe')).toHaveCount(0);
  });
});

test.describe('flashcards: one bad clip does not hide the deck', () => {
  test('bad clip shows an alert on that clip only', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-flashcards', {
      title: 'Deck',
      summary: 'Cover text',
      partnerId: 1234567,
      uiconfId: 12345678,
      cards: [
        {
          title: 'With clips',
          content: 'First card text',
          clips: [
            { entryId: '0_good123', startTime: 0, endTime: 10, title: 'Good clip' },
            { entryId: 'bad id"><x', startTime: 0, endTime: 10, title: 'Bad clip' },
          ],
        },
        { title: 'After', content: 'Card after the bad clip' },
      ],
    });
    const deck = h.page.locator('#host [role=region]');
    const active = h.page.locator('.flashcard-slide.active');
    await expect(deck).toBeVisible();
    await expect(h.page.locator('.flashcard-slide')).toHaveCount(3);

    await h.page.getByRole('button', { name: 'Start' }).click();
    await expect(h.page.locator('.flashcard-counter')).toHaveText('2 / 3');
    await expect(active.locator('iframe')).toHaveAttribute('src', /entry_id=0_good123/);
    await expect(alerts(h)).toHaveCount(0);

    await active.getByRole('button', { name: 'Bad clip' }).click();
    await expect(active.locator('[role=alert]')).toHaveText('This clip cannot be shown.');
    await expect(active.locator('iframe')).toHaveCount(0);
    await expect(deck).toBeVisible();

    // The card ignores navigation while it animates. The arrow buttons are disabled then.
    await expect(h.page.getByRole('button', { name: 'Previous card' })).toBeEnabled();
    await h.page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(h.page.locator('.flashcard-counter')).toHaveText('3 / 3');
    await expect(active).toContainText('Card after the bad clip');
  });
});

// UX-01: without `box-sizing: border-box` the slide is taller than the track by
// its padding, and the controls bar covers the clip thumbnails.
test('UX-01: flashcard clip thumbnails are not covered on a plain page', async ({ harness: h }) => {
  await h.open();
  await h.mount('kaltura-flashcards', {
    title: 'Deck',
    partnerId: 1234567,
    uiconfId: 12345678,
    cards: [
      {
        title: 'With clips',
        content: 'Text',
        clips: [
          { entryId: '0_good123', startTime: 0, endTime: 10, title: 'First clip' },
          { entryId: '0_good124', startTime: 0, endTime: 10, title: 'Second clip' },
        ],
      },
    ],
  });
  await h.page.getByRole('button', { name: 'Start' }).click();
  await expect(h.page.getByRole('button', { name: 'Previous card' })).toBeEnabled();
  const hitIsThumb = await h.page.getByRole('button', { name: 'Second clip' }).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  expect(hitIsThumb).toBe(true);
});
