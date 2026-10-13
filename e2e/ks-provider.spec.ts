// KS provider wiring (plan 3.1 pulled forward). The host calls setKsProvider.
// The agent config never carries a ks, and the KS never shows as text or in logs.
import { test, expect, type Harness } from './fixtures/harness';
import { ALLOWED_HOSTS } from './fixtures/constants';

const KS = 'E2E_KS_marker_7f3a9c1d';
const PROP_KS = 'E2E_PROP_KS_marker_55aa';
const SERVER_URL = `${ALLOWED_HOSTS[0]}/v1`;
const iframeSrc = (h: Harness) => h.page.locator('#host iframe').getAttribute('src');

const UNISPHERE_TAGS = [
  'kaltura-media-manager',
  'kaltura-genie-widget',
  'kaltura-content-lab',
  'kaltura-vod-avatar-wc',
  'kaltura-agents-widget',
];
const recorderConfig = { partnerId: 1234567, uiconfId: 7654321 };
const recorderCreates = (h: Harness) =>
  h.page.evaluate(() => (window as unknown as { __recorderCreates?: Array<{ options: { ks?: string } }> }).__recorderCreates ?? []);
const unisphereConfig = { partnerId: 1234567, serverUrl: SERVER_URL, entryId: '0_dummy' };

/** The KS must not appear in any visible text or console line. */
async function expectNoKsInTextOrLogs(h: Harness) {
  expect(await h.hostText()).not.toContain(KS);
  expect(await h.page.locator('#host').textContent()).not.toContain(KS);
  expect(h.consoleText.filter((line) => line.includes(KS))).toEqual([]);
}

test.describe('provider supplies the KS, config has none', () => {
  test('recorder gets the KS from a sync provider, in its create options only', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-recorder', recorderConfig);
    await expect.poll(async () => (await recorderCreates(h)).map((c) => c.options.ks)).toEqual([KS]);
    expect(await h.page.locator('#host iframe').count()).toBe(0);
    await expectNoKsInTextOrLogs(h);
  });

  test('player iframe gets the KS from a sync provider', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-player', { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' });
    await h.settle();
    expect(await iframeSrc(h)).toContain(`ks=${encodeURIComponent(KS)}`);
    await expectNoKsInTextOrLogs(h);
  });

  test('captions editor and analytics iframes get the KS', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-captions-editor', { partnerId: 1234567, entryId: '0_abc123' });
    await h.mount('kaltura-analytics', { partnerId: 1234567 });
    await h.settle();
    const srcs = await h.page.locator('#host iframe').evaluateAll((fs) => fs.map((f) => f.getAttribute('src')));
    expect(srcs.map((s) => s?.includes(`ks=${encodeURIComponent(KS)}`))).toEqual([true, true]);
    await expectNoKsInTextOrLogs(h);
  });

  for (const tag of UNISPHERE_TAGS) {
    test(`${tag} passes the provider KS to the Unisphere loader`, async ({ harness: h }) => {
      await h.open();
      await h.setKsProvider('sync', KS);
      await h.mount(tag, unisphereConfig);
      await h.settle();
      // Media Manager calls createWorkspace. The other widgets call loader.
      const received = JSON.stringify([...(await h.loaderConfigs()), ...(await h.workspaceConfigs())]);
      expect(received).toContain(KS);
      expect(h.loaderRequests()).toEqual([`${ALLOWED_HOSTS[0]}/v1/loader/index.esm.js`]);
      await expectNoKsInTextOrLogs(h);
    });
  }

  test('an async provider renders nothing until it resolves', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('async', KS);
    await h.mount('kaltura-recorder', recorderConfig);
    expect(await h.page.locator('kaltura-recorder').innerHTML()).toBe('');
    await expect.poll(async () => (await recorderCreates(h)).map((c) => c.options.ks)).toEqual([KS]);
    await expectNoKsInTextOrLogs(h);
  });

  test('the provider is called once per mounted component', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-recorder', recorderConfig);
    await h.mount('kaltura-recorder', recorderConfig);
    await h.settle();
    expect(await h.providerCalls()).toBe(2);
  });

  test('the provider receives the widget name', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-recorder', recorderConfig);
    await h.mount('kaltura-analytics', { partnerId: 1234567 });
    await h.mount('kaltura-genie-widget', unisphereConfig);
    await h.settle();
    expect(await h.providerWidgets()).toEqual(['analytics', 'genie', 'recorder']);
  });

  test('the provider wins over a ks prop', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', KS);
    await h.mount('kaltura-recorder', { ...recorderConfig, ks: PROP_KS });
    await h.settle();
    await expect.poll(async () => (await recorderCreates(h)).map((c) => c.options.ks)).toEqual([KS]);
  });
});

test.describe('no provider result falls back to the ks prop', () => {
  test('no provider set', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-recorder', { ...recorderConfig, ks: PROP_KS });
    await expect.poll(async () => (await recorderCreates(h)).map((c) => c.options.ks)).toEqual([PROP_KS]);
  });

  test('provider returns an empty string', async ({ harness: h }) => {
    await h.open();
    await h.setKsProvider('sync', '');
    await h.mount('kaltura-recorder', { ...recorderConfig, ks: PROP_KS });
    await expect.poll(async () => (await recorderCreates(h)).map((c) => c.options.ks)).toEqual([PROP_KS]);
  });
});

test.describe('missing KS', () => {
  // A web component gets no later config, so it shows the error instead of a blank.
  test('widgets that need a KS show the error and load nothing', async ({ harness: h }) => {
    await h.open();
    for (const tag of UNISPHERE_TAGS) await h.mount(tag, unisphereConfig);
    await h.mount('kaltura-recorder', recorderConfig);
    await h.settle();
    expect(await h.page.locator('#host iframe').count()).toBe(0);
    expect(await h.page.locator('#host [role=alert]').allTextContents()).toEqual(
      Array(UNISPHERE_TAGS.length + 1).fill(expect.stringMatching(/^Failed to load .*: Invalid ks$/)),
    );
    expect(h.loaderRequests()).toEqual([]);
  });

  test('the player still loads without a KS', async ({ harness: h }) => {
    await h.open();
    await h.mount('kaltura-player', { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' });
    await h.settle();
    expect(await iframeSrc(h)).not.toContain('ks=');
  });
});

test.describe('bad provider output is refused and never echoed', () => {
  const cases: Array<[string, 'sync' | 'throw' | 'reject', string]> = [
    ['control character in the KS', 'sync', `${KS}\u0001`],
    ['provider throws', 'throw', KS],
    ['provider rejects', 'reject', KS],
  ];
  for (const [name, mode, ks] of cases) {
    test(name, async ({ harness: h }) => {
      await h.open();
      await h.setKsProvider(mode, ks);
      await h.mount('kaltura-recorder', { ...recorderConfig, ks: PROP_KS });
      await h.mount('kaltura-media-manager', unisphereConfig);
      await h.settle();
      expect([await h.page.locator('#host iframe').count(), (await recorderCreates(h)).length]).toEqual([0, 0]);
      expect(h.loaderRequests()).toEqual([]);
      expect(await h.hostText()).toContain('Invalid ks');
      await expectNoKsInTextOrLogs(h);
    });
  }
});

// The rejection is created when the component renders and handled in an effect.
// Without a catch at creation the browser reports it as unhandled.
test('SEC-05: a rejected provider leaves no unhandled rejection', async ({ harness: h }) => {
  await h.open();
  await h.setKsProvider('reject', KS);
  await h.mount('kaltura-recorder', recorderConfig);
  await h.settle();
  expect(h.pageErrors).toEqual([]);
});
