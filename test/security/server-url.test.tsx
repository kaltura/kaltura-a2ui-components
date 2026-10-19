// Covers: SEC-01 / QA-03 (an agent-supplied serverUrl is checked before import()).
// Technique: vi.doMock() on each derived loader URL records whether import()
// was reached. A rejected URL must never reach import().
// deriveLoaderUrl lives in core/unisphere-loader.ts and is re-exported from core/media-manager.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '../helpers/render';

const loaded = vi.hoisted(() => [] as string[]);

const BAD = [
  'https://evil.example/v1',
  'http://cdnapisec.kaltura.com/v1', // http downgrade
  'https://cdnapisec.kaltura.com.evil.example/v1', // suffix confusion
  'https://cdnapisec.kaltura.com@evil.example/v1', // userinfo confusion
  'https://evil.example/v1?h=cdnapisec.kaltura.com',
  'data:text/javascript,export const createWorkspace=()=>{window.__pwned=1}//v1',
  'javascript:window.__pwned=1//v1',
  '//evil.example/v1',
  '/relative/v1',
];
// An origin on the allowlist.
const GOOD = 'https://unisphere.nvp1.ovp.kaltura.com/v1';

beforeEach(() => {
  loaded.length = 0;
  vi.resetModules();
});
afterEach(() => {
  document.body.innerHTML = '';
});

async function deriveFor(url: string) {
  const { deriveLoaderUrl } = await import('../../src/core/media-manager');
  return deriveLoaderUrl(url);
}

async function run(Comp: string, serverUrl: string) {
  // A rejected serverUrl has no loader URL. Spy on the naive one to prove import() is never reached.
  const loaderUrl = await deriveFor(serverUrl).catch(() => serverUrl.replace(/\/v1\/?$/, '/v1/loader/index.esm.js'));
  vi.doMock(loaderUrl, () => {
    loaded.push(serverUrl);
    return { createWorkspace: async () => { throw new Error('mock'); }, loader: async () => { throw new Error('mock'); } };
  });
  const mods: Record<string, [string, string, Record<string, unknown>]> = {
    MediaManagerCore: ['../../src/core/media-manager', 'MediaManagerCore', {}],
    GenieCore: ['../../src/core/genie', 'GenieCore', { uiconfId: 2 }],
    ContentLabCore: ['../../src/core/content-lab', 'ContentLabCore', { uiconfId: 2, entryId: '0_abc' }],
    VodAvatarCore: ['../../src/core/vod-avatar', 'VodAvatarCore', { entryId: '0_a' }],
    AgentsWidgetCore: ['../../src/core/agents-widget', 'AgentsWidgetCore', {}],
  };
  const [path, exp, extra] = mods[Comp];
  const m = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
  const { container } = await mount(m[exp], { partnerId: 1, ks: 'dummy', serverUrl, ...extra });
  return container;
}

const NAMES = ['MediaManagerCore', 'GenieCore', 'ContentLabCore', 'VodAvatarCore', 'AgentsWidgetCore'];

describe('SEC-01: serverUrl allowlist: import() must not be reached for non-Kaltura origins', () => {
  for (const name of NAMES) {
    it.each(BAD)(`SEC-01: ${name}: %s`, async bad => {
      await run(name, bad);
      expect(loaded).toEqual([]);
    });
  }
});

describe('SEC-01: serverUrl allowlist: control', () => {
  it.each(NAMES)('SEC-01: %s: real Kaltura origin is still imported (control)', async name => {
    await run(name, GOOD);
    expect(loaded).toEqual([GOOD]);
  });
});

describe('SEC-01: deriveLoaderUrl', () => {
  it.each([...BAD, 'blob:https://evil.example/uuid/v1'])('SEC-01: throws for %s', async bad => {
    const { deriveLoaderUrl } = await import('../../src/core/media-manager');
    expect(() => deriveLoaderUrl(bad)).toThrow();
  });
  it('QA-05: an allowlisted origin without /v1 still yields a loader path', async () => {
    const { deriveLoaderUrl } = await import('../../src/core/media-manager');
    expect(deriveLoaderUrl('https://unisphere.nvp1.ovp.kaltura.com')).toContain('/v1/loader/index.esm.js');
  });
});
