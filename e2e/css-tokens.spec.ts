// QA-02: component styles resolve their design tokens in a real browser,
// with and without host-defined variables. A self-referential custom property
// (`--x: var(--x, fb)`) is invalid at computed-value time, so both the default
// and the host value would be lost.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS } from './fixtures/constants';

const KS = 'e2e-css-tokens-ks';
const PLAYER = { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123', entryName: 'Name', entryDescription: 'Desc' };

// Light, unthemed page: no surfaces, text inherits from the page, borders are neutral grey.
const PAGE_TEXT = 'rgb(50, 60, 70)';
const NONE = 'rgba(0, 0, 0, 0)';
const GREY = 'rgba(128, 128, 128, 0.35)';
const DEFAULTS = {
  container: { backgroundColor: NONE, borderTopColor: GREY, borderTopLeftRadius: '8px' },
  label: { backgroundColor: NONE, color: PAGE_TEXT, borderTopColor: 'rgba(128, 128, 128, 0.2)' },
  title: { color: PAGE_TEXT },
  desc: { color: PAGE_TEXT },
};

const HOST = {
  '--surface-deep': 'rgb(1, 2, 3)',
  '--surface-card': 'rgb(4, 5, 6)',
  '--border-color': 'rgb(7, 8, 9)',
  '--border-subtle': 'rgb(10, 11, 12)',
  '--page-text': 'rgb(13, 14, 15)',
  '--page-text-secondary': 'rgb(16, 17, 18)',
  '--page-text-muted': 'rgb(19, 20, 21)',
  '--ds-roundness-2': '17px',
};

const HOST_RESOLVED = {
  container: { backgroundColor: HOST['--surface-deep'], borderTopColor: HOST['--border-color'], borderTopLeftRadius: '17px' },
  label: { backgroundColor: HOST['--surface-card'], color: HOST['--page-text-muted'], borderTopColor: HOST['--border-subtle'] },
  title: { color: HOST['--page-text'] },
  desc: { color: HOST['--page-text-secondary'] },
};

const hostRule = (selector: string) =>
  `${selector} { ${Object.entries(HOST).map(([k, v]) => `${k}: ${v};`).join(' ')} }`;

async function resolved(h: Harness) {
  await h.mount('kaltura-player', PLAYER);
  await h.settle();
  return h.page.evaluate(() => {
    const pick = (sel: string, keys: string[]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`missing ${sel}`);
      const cs = getComputedStyle(el);
      return Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue(k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))]));
    };
    return {
      container: pick('.kaltura-player-container', ['backgroundColor', 'borderTopColor', 'borderTopLeftRadius']),
      label: pick('.kaltura-player-label', ['backgroundColor', 'color', 'borderTopColor']),
      title: pick('.player-title', ['color']),
      desc: pick('.player-desc', ['color']),
    };
  });
}

test.describe('QA-02: CSS tokens', () => {
  test('QA-02: with no host variables the built-in defaults apply', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.page.addStyleTag({ content: `body { color: ${PAGE_TEXT}; }` });
    expect(await resolved(h)).toEqual(DEFAULTS);
  });

  test('QA-02: host variables on :root win over the defaults', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.page.addStyleTag({ content: hostRule(':root') });
    expect(await resolved(h)).toEqual(HOST_RESOLVED);
  });

  test('QA-02: host variables on a wrapper of the component win too', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.page.addStyleTag({ content: hostRule('#host') });
    expect(await resolved(h)).toEqual(HOST_RESOLVED);
  });
});

// The Unisphere containers get the class `kaltura-${runtimeName}-container` and the
// runtimeName already starts with `kaltura-`, hence `kaltura-kaltura-genie-container`.
const SERVER_URL = `${ALLOWED_HOSTS[0]}/v1`;
const UNISPHERE: [tag: string, selector: string][] = [
  ['kaltura-genie-widget', '.kaltura-kaltura-genie-container'],
  ['kaltura-content-lab', '.kaltura-kaltura-content-lab-container'],
  ['kaltura-agents-widget', '.kaltura-kaltura-agents-container'],
  ['kaltura-vod-avatar-wc', '.kaltura-kaltura-vod-avatar-container'],
];

async function container(h: Harness, tag: string, selector: string) {
  await h.mount(tag, { partnerId: 1234567, serverUrl: SERVER_URL, entryId: '0_abc123' });
  await h.settle();
  return h.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing ${sel}`);
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      borderTopColor: cs.borderTopColor,
      borderTopWidth: cs.borderTopWidth,
      borderTopLeftRadius: cs.borderTopLeftRadius,
    };
  }, selector);
}

test.describe('QA-02: Unisphere containers', () => {
  test.beforeEach(async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
  });

  for (const [tag, selector] of UNISPHERE) {
    test(`QA-02: ${selector} with no host variables gets the defaults`, async ({ harness: h }) => {
      expect(await container(h, tag, selector)).toEqual({
        backgroundColor: NONE,
        borderTopColor: GREY,
        borderTopWidth: '1px',
        borderTopLeftRadius: '8px',
      });
    });

    test(`QA-02: ${selector} follows host variables`, async ({ harness: h }) => {
      await h.page.addStyleTag({ content: hostRule(':root') });
      expect(await container(h, tag, selector)).toEqual({
        backgroundColor: HOST['--surface-deep'],
        borderTopColor: HOST['--border-color'],
        borderTopWidth: '1px',
        borderTopLeftRadius: '17px',
      });
    });
  }

  test('QA-02: .kaltura-kaltura-genie-container gets the dark defaults under data-theme=dark', async ({ harness: h }) => {
    await h.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    expect(await container(h, 'kaltura-genie-widget', '.kaltura-kaltura-genie-container')).toMatchObject({
      backgroundColor: 'rgb(0, 0, 0)',
      borderTopColor: 'rgba(255, 255, 255, 0.12)',
    });
  });

  test('QA-02: the Media Manager container follows host roundness, default 12px', async ({ harness: h }) => {
    const radius = async () => {
      await h.mount('kaltura-media-manager', { partnerId: 1234567, serverUrl: SERVER_URL, entryId: '0_abc123' });
      await h.settle();
      return h.page.evaluate(
        () => getComputedStyle(document.querySelector('.kaltura-media-manager-container')!).borderBottomLeftRadius,
      );
    };
    expect(await radius()).toBe('12px');
    await h.page.addStyleTag({ content: ':root { --ds-roundness-3: 19px; }' });
    expect(await radius()).toBe('19px');
  });
});

test.describe('QA-02: chart text and tooltip', () => {
  test.beforeEach(async ({ harness: h }) => {
    await h.open();
  });

  test('QA-02: pie total text follows the page text colour with no host variables', async ({ harness: h }) => {
    await h.page.addStyleTag({ content: `body { color: ${PAGE_TEXT}; }` });
    await h.mount('kaltura-chart', { chartType: 'pie', xKey: 'name', yKeys: ['value'], data: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }] });
    await h.settle();
    const fill = await h.page.locator('.kaltura-chart-body svg text', { hasText: 'total' }).evaluate((el) => getComputedStyle(el).fill);
    expect(fill).toBe(PAGE_TEXT);
  });

  // The visx tooltip is portalled to <body>, outside the component tokens.
  const tooltip = (h: Harness) =>
    h.page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'visx-tooltip';
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      return { backgroundColor: cs.backgroundColor, color: cs.color, borderTopLeftRadius: cs.borderTopLeftRadius };
    });

  test('QA-02: the portalled tooltip is opaque with no host variables', async ({ harness: h }) => {
    expect(await tooltip(h)).toEqual({ backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)', borderTopLeftRadius: '8px' });
  });

  test('QA-02: the portalled tooltip follows root host variables', async ({ harness: h }) => {
    await h.page.addStyleTag({ content: hostRule(':root') });
    expect(await tooltip(h)).toEqual({
      backgroundColor: HOST['--surface-card'],
      color: HOST['--page-text'],
      borderTopLeftRadius: '17px',
    });
  });
});
