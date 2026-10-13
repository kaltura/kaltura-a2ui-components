// SEC-14: opt-in player sandbox (`setPlayerSandbox`), checked in real browsers.
// A local stub stands in for the Kaltura player page. It proves what the preset
// keeps (scripts, own origin, fullscreen, downloads) and what it blocks (top
// navigation). Real Cast, DRM and device behaviour are not covered here.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Harness } from './fixtures/harness';
import { ORIGIN_A } from './fixtures/constants';

const PLAYER = { partnerId: 1234567, uiconfId: 12345678, entryId: '0_abc123' };
const PLAYER_PAGE = /^https:\/\/cdnapisec\.kaltura\.com\/p\/\d+\/embedPlaykitJs\//;
const ESCAPE_URL = `${ORIGIN_A}/__health?escaped`;
const STUB = readFileSync(resolve(process.cwd(), 'e2e/fixtures/player-stub.html'), 'utf8').replace('__ESCAPE_URL__', ESCAPE_URL);

interface SandboxWindow {
  KalturaA2UIWebComponents: {
    setPlayerSandbox(tokens: readonly string[] | undefined): void;
    PLAYER_SANDBOX_PRESET: readonly string[];
  };
}

/** Mounts a player whose iframe loads the stub. `sandbox`: 'preset', a token list or none. */
async function mountPlayer(h: Harness, sandbox?: 'preset' | string[]) {
  await h.open();
  await h.page.route(PLAYER_PAGE, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
  await h.page.evaluate((s) => {
    const api = (window as unknown as SandboxWindow).KalturaA2UIWebComponents;
    if (s) api.setPlayerSandbox(s === 'preset' ? api.PLAYER_SANDBOX_PRESET : s);
  }, sandbox);
  await h.mount('kaltura-player', PLAYER);
  const frame = h.page.frameLocator('#host iframe');
  await expect(frame.locator('#top')).toBeAttached();
  return { frame, iframe: h.page.locator('#host iframe') };
}

const preset = (h: Harness) =>
  h.page.evaluate(() => (window as unknown as SandboxWindow).KalturaA2UIWebComponents.PLAYER_SANDBOX_PRESET.join(' '));

test.describe('SEC-14: player sandbox', () => {
  test('SEC-14: default player iframe has no sandbox and a click can navigate the top page', async ({ harness: h }) => {
    const { frame, iframe } = await mountPlayer(h);
    expect(await iframe.getAttribute('sandbox')).toBeNull();
    await frame.locator('#top').click();
    await h.page.waitForURL(ESCAPE_URL);
  });

  test('SEC-14: with the preset the stub page loads, runs its script and keeps its origin', async ({ harness: h }) => {
    const { frame, iframe } = await mountPlayer(h, 'preset');
    expect(await iframe.getAttribute('sandbox')).toBe(await preset(h));
    await expect(frame.locator('body')).toHaveAttribute('data-ran', '1');
    await expect(frame.locator('body')).toHaveAttribute('data-origin', 'https://cdnapisec.kaltura.com');
  });

  test('SEC-14: an empty sandbox blocks the stub script (control for the check above)', async ({ harness: h }) => {
    const { frame } = await mountPlayer(h, []);
    await h.settle();
    await expect(frame.locator('body')).not.toHaveAttribute('data-ran', '1');
  });

  test('SEC-14: with the preset a target=_top link click does not navigate the top page', async ({ harness: h }) => {
    const { frame } = await mountPlayer(h, 'preset');
    await frame.locator('#top').click();
    await h.settle();
    expect(h.page.url()).toBe(`${ORIGIN_A}/harness.html`);
  });

  test('SEC-14: with the preset fullscreen from inside the player works', async ({ harness: h }) => {
    const { frame } = await mountPlayer(h, 'preset');
    await frame.locator('#fs').click();
    await expect(frame.locator('body')).toHaveAttribute('data-fullscreen', 'ok');
  });

  test('SEC-14: with the preset an <a download> link downloads', async ({ harness: h }) => {
    const { frame } = await mountPlayer(h, 'preset');
    const download = h.page.waitForEvent('download');
    await frame.locator('#dl').click();
    expect((await download).suggestedFilename()).toBe('clip.txt');
  });

  test('SEC-14: without allow-downloads the same link does not download (control)', async ({ harness: h }) => {
    const { frame } = await mountPlayer(h, ['allow-scripts', 'allow-same-origin']);
    const downloads: unknown[] = [];
    h.page.on('download', (d) => downloads.push(d));
    await frame.locator('#dl').click();
    await h.settle();
    expect(downloads).toEqual([]);
  });
});
