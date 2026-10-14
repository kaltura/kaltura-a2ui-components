// Covers: REG-01 (hard-coded US hosts). setRegion maps every host per region.
// The default (nvp1) hosts are the same as before setRegion existed.
// The guide lists no regional CDN host: the player and the recorder use the regional web host.
// The KMC uses the kmc host the guide lists.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { setRegion, type KalturaRegion } from '../../src/adapters/react/index';
import { playerScriptUrl } from '../../src/core/player-script';
import { buildThumbnailUrl } from '../../src/core/flashcards';
import { CaptionsEditorCore } from '../../src/core/captions-editor';
import { buildAnalyticsUrl } from '../../src/core/analytics';
import { recorderScriptUrl } from '../../src/core/recorder-script';
import { mount } from '../helpers/render';
import { captionsRemote } from '../helpers/captions-remote';

const clip = { entryId: '0_abc', startTime: 4, endTime: 9 };

// Captured before plan item 3.1c. Analytics changed on purpose with ANA-01. The player and the
// flashcards clips use one script URL. The captions editor sends its page request to the service
// host and gets the CDN and service hosts as data attributes.
const US = {
  player: 'https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2',
  thumbnail: 'https://cfvod.kaltura.com/p/1/thumbnail/entry_id/0_abc/width/200/vid_sec/5',
  captions: {
    page: 'https://www.kaltura.com/apps/captionstudio/v1.3.10/embed.php',
    cdnurl: 'https://cdnapisec.kaltura.com',
    serviceurl: 'https://www.kaltura.com',
  },
  analytics: 'https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html',
  recorder: 'https://www.kaltura.com/apps/expressrecorder/v2.2.10/express-recorder.js',
};

let captions: ReturnType<typeof captionsRemote>;

beforeEach(() => {
  captions = captionsRemote();
});

async function urls() {
  const pages = captions.blobs.length + 1;
  captions.fetches.length = 0;
  const { container } = await mount(CaptionsEditorCore, { partnerId: 1, ks: 'k', entryId: '0_abc' });
  await captions.ready(pages);
  const iframe = container.querySelector('iframe')!;
  return {
    player: playerScriptUrl(1, 2),
    thumbnail: buildThumbnailUrl(clip, 1),
    captions: {
      page: captions.fetches[0].url,
      cdnurl: iframe.getAttribute('data-cdnurl'),
      serviceurl: iframe.getAttribute('data-serviceurl'),
    },
    analytics: buildAnalyticsUrl(),
    recorder: recorderScriptUrl(),
  };
}

// api, vod and kmc: kaltura.md API Getting Started §4. web: the regional API host (player, recorder).
const REGIONAL: Record<Exclude<KalturaRegion, 'nvp1'>, { api: string; vod: string; web: string; kmc: string }> = {
  irp2: { api: 'https://api.eu.kaltura.com', vod: 'https://cfvod.irp2.ovp.kaltura.com', web: 'https://api.eu.kaltura.com', kmc: 'https://kmc.irp2.ovp.kaltura.com' },
  frp2: { api: 'https://api.de.kaltura.com', vod: 'https://cfvod.frp2.ovp.kaltura.com', web: 'https://api.de.kaltura.com', kmc: 'https://kmc.de.kaltura.com' },
  cap2: { api: 'https://api.ca.kaltura.com', vod: 'https://cfvod.cap2.ovp.kaltura.com', web: 'https://api.cap2.ovp.kaltura.com', kmc: 'https://kmc.ca.kaltura.com' },
  syp2: { api: 'https://api.ap.kaltura.com', vod: 'https://cfvod.syp2.ovp.kaltura.com', web: 'https://api.syp2.ovp.kaltura.com', kmc: 'https://kmc.ap.kaltura.com' },
};

afterEach(() => {
  captions.restore();
  setRegion('nvp1');
  document.body.innerHTML = '';
});

describe('REG-01: setRegion', () => {
  it('REG-01: the default hosts are the US hosts', async () => {
    expect(await urls()).toEqual(US);
  });

  it('REG-01: setRegion("nvp1") gives the default hosts', async () => {
    setRegion('irp2');
    setRegion('nvp1');
    expect(await urls()).toEqual(US);
  });

  it.each(Object.entries(REGIONAL))('REG-01: %s maps every host', async (code, hosts) => {
    setRegion(code as KalturaRegion);
    const cdn = 'https://cdnapisec.kaltura.com';
    expect(await urls()).toEqual({
      player: US.player.replace(cdn, hosts.web),
      thumbnail: US.thumbnail.replace('https://cfvod.kaltura.com', hosts.vod),
      captions: {
        page: US.captions.page.replace('https://www.kaltura.com', hosts.api),
        cdnurl: hosts.web,
        serviceurl: hosts.api,
      },
      analytics: US.analytics.replace('https://kmc.kaltura.com', hosts.kmc),
      recorder: US.recorder.replace('https://www.kaltura.com', hosts.web),
    });
  });

  it.each(['sgp2', 'us', '', 'nvp1 '])('REG-01: refuses the unknown code %j', code => {
    expect(() => setRegion(code as KalturaRegion)).toThrow('Unknown Kaltura region. Use nvp1, irp2, frp2, cap2, syp2');
  });

  it('REG-01: an unknown code keeps the region', async () => {
    setRegion('frp2');
    expect(() => setRegion('xx' as KalturaRegion)).toThrow();
    expect(buildThumbnailUrl(clip, 1)).toBe('https://cfvod.frp2.ovp.kaltura.com/p/1/thumbnail/entry_id/0_abc/width/200/vid_sec/5');
  });

  it('REG-01: a regional thumbnail still passes the Kaltura host check', async () => {
    const { toKalturaCdnUrl } = await import('../../src/core/media-url');
    setRegion('syp2');
    expect(toKalturaCdnUrl(buildThumbnailUrl(clip, 1))).not.toBe('');
  });
});
