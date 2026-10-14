// Covers: the optional serverUrl of the 6 Unisphere widgets. With none, the Unisphere host of the region is used.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '../helpers/render';
import { setKsProvider } from '../../src/core/ks';
import { setRegion } from '../../src/core/region';
import { GenieCore } from '../../src/core/genie';
import { ContentLabCore } from '../../src/core/content-lab';
import { AgentsWidgetCore } from '../../src/core/agents-widget';
import { VodAvatarCore } from '../../src/core/vod-avatar';
import { MediaManagerCore } from '../../src/core/media-manager';
import { AvatarCore } from '../../src/core/avatar';

const seen = vi.hoisted(() => ({ regions: [] as string[] }));

const fakeLoader = (region: string) => ({
  loader: async () => {
    seen.regions.push(region);
    return { kill() {} };
  },
  createWorkspace: async () => {
    seen.regions.push(region);
    return new Promise(() => {});
  },
  embeds: {
    workspace: async () => {
      seen.regions.push(region);
      return new Promise(() => {});
    },
  },
});

vi.mock('https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js', () => fakeLoader('nvp1'));
vi.mock('https://unisphere.irp2.ovp.kaltura.com/v1/loader/index.esm.js', () => fakeLoader('irp2'));

afterEach(() => {
  setRegion('nvp1');
  setKsProvider(undefined);
  document.body.innerHTML = '';
  seen.regions = [];
  vi.restoreAllMocks();
});

const base = { partnerId: 1, uiconfId: 2, entryId: '0_abc' };
const CASES = [
  ['Genie', GenieCore],
  ['Content Lab', ContentLabCore],
  ['AI Agents', AgentsWidgetCore],
  ['VOD Avatar', VodAvatarCore],
  ['Media Manager', MediaManagerCore],
  ['Avatar', AvatarCore],
] as const;

describe('serverUrl is optional on the Unisphere widgets', () => {
  it.each(CASES)('%s loads from the US host by default', async (_name, component) => {
    setKsProvider(() => 'host-ks');
    await mount(component, base);
    expect(seen.regions).toEqual(['nvp1']);
  });

  it.each(CASES)('%s loads from the host of the region set with setRegion', async (_name, component) => {
    setRegion('irp2');
    setKsProvider(() => 'host-ks');
    await mount(component, base);
    expect(seen.regions).toEqual(['irp2']);
  });

  it.each(CASES)('%s still refuses a host outside the allowlist', async (_name, component) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setKsProvider(() => 'host-ks');
    const { container } = await mount(component, { ...base, serverUrl: 'https://evil.example/v1' });
    expect([container.textContent?.endsWith('serverUrl is not an allowed Unisphere origin'), seen.regions]).toEqual([true, []]);
  });
});
