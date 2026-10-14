// Covers: SEC-10 (the Player script loader). One fixed URL per bundle, no query string, a shared load,
// fixed failure text and no cache of a failed load. The bundle has no SRI: Kaltura builds it per
// uiconf at an unversioned path (docs/adr/0008). The fake bundle is in test/helpers/player-remote.ts.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { playerRemote, loadPlayer, scriptUrl } from '../helpers/player-remote';

let remote: ReturnType<typeof playerRemote>;

beforeEach(() => {
  remote = playerRemote();
});

afterEach(() => {
  remote.restore();
});

describe('SEC-10: player script loader', () => {
  it('SEC-10: the URL is the CDN path of the partner and uiconf, with no query string', async () => {
    const { playerScriptUrl } = await loadPlayer();
    expect(playerScriptUrl(1, 2)).toBe('https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2');
  });

  it('SEC-10: the tag has the fixed URL and no integrity or crossorigin attribute', async () => {
    const { loadPlayerScript } = await loadPlayer();
    await loadPlayerScript(1, 2);
    const tag = new DOMParser().parseFromString(remote.html[0], 'text/html').querySelector('script')!;
    expect([tag.src, tag.hasAttribute('integrity'), tag.hasAttribute('crossorigin')]).toEqual([scriptUrl(1, 2), false, false]);
  });

  it('SEC-10: the tag leaves the page once the bundle ran', async () => {
    const { loadPlayerScript } = await loadPlayer();
    await loadPlayerScript(1, 2);
    expect(remote.tags().length).toBe(0);
  });

  it('SEC-10: concurrent loads of one bundle share one promise and one tag', async () => {
    const { loadPlayerScript } = await loadPlayer();
    const [a, b] = [loadPlayerScript(1, 2), loadPlayerScript(1, 2)];
    await Promise.all([a, b]);
    expect([a === b, remote.urls.length]).toEqual([true, 1]);
  });

  it('SEC-10: a later load of the same bundle adds no tag', async () => {
    const { loadPlayerScript } = await loadPlayer();
    await loadPlayerScript(1, 2);
    await loadPlayerScript(1, 2);
    expect(remote.urls.length).toBe(1);
  });

  it('SEC-10: a bundle that ran in between is loaded again, because each bundle replaces window.KalturaPlayer', async () => {
    const { loadPlayerScript } = await loadPlayer();
    await loadPlayerScript(1, 2);
    await loadPlayerScript(1, 3);
    await loadPlayerScript(1, 2);
    expect(remote.urls).toEqual([scriptUrl(1, 2), scriptUrl(1, 3), scriptUrl(1, 2)]);
  });

  it.each([
    ['error', 'Player script failed to load. Check partnerId, uiconfId, region and CSP'],
    ['no-api', 'Player API is missing'],
    ['no-setup', 'Player API is missing'],
  ] as const)('SEC-10: a script that ends as "%s" rejects with load-failed and fixed text, and leaves no tag', async (script, text) => {
    remote.script = script;
    const { loadPlayerScript } = await loadPlayer();
    const failure = await loadPlayerScript(1, 2).catch((error: unknown) => error);
    expect([(failure as { code: string }).code, (failure as Error).message, remote.tags().length]).toEqual(['load-failed', text, 0]);
  });

  it('SEC-10: after a failure the next load adds a new tag', async () => {
    remote.script = 'error';
    const { loadPlayerScript } = await loadPlayer();
    await loadPlayerScript(1, 2).catch(() => {});
    remote.script = 'load';
    await loadPlayerScript(1, 2);
    expect(remote.urls.length).toBe(2);
  });

  it('SEC-10: setRegion moves the script host', async () => {
    const { loadPlayerScript, setRegion } = await loadPlayer();
    setRegion('frp2');
    await loadPlayerScript(1, 2);
    expect(remote.urls).toEqual(['https://api.de.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2']);
  });
});
