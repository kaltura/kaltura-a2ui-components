// REC-01: `<kaltura-recorder>` frames the Unisphere recorder loader page in a real browser.
// The page is the stub in e2e/fixtures/recorder-loader-stub.html, served for the real Unisphere URL
// by Harness.open(). The host supplies the KS with setKsProvider.
import { test, expect, type Harness } from './fixtures/harness';

const KS = 'E2E_RECORDER_KS_marker_91c2';
const FRAME_URL = /^https:\/\/unisphere\.nvp1\.ovp\.kaltura\.com\/v1\/static\/applications\/recorder\/recorder-assets\/[\d.]+\/assets\/loader\/loader\.html\?parentOrigin=/;
const CONFIG = { partnerId: 1234567, uiconfId: 7654321 };

interface RecorderWindow {
  __events?: unknown[];
  __errors2?: unknown[];
  KalturaA2UIWebComponents: {
    setEventHandler(handler: (event: unknown) => void): void;
    setErrorHandler(handler: (error: unknown) => void): void;
  };
}

async function start(h: Harness, config: Record<string, unknown> = CONFIG) {
  await h.open();
  await h.setKsProvider('sync', KS);
  await h.page.evaluate(() => {
    const w = window as unknown as RecorderWindow;
    w.__events = [];
    w.__errors2 = [];
    w.KalturaA2UIWebComponents.setEventHandler((event) => w.__events?.push(event));
    w.KalturaA2UIWebComponents.setErrorHandler((error) => w.__errors2?.push(error));
  });
  await h.mount('kaltura-recorder', config);
}

const events = (h: Harness) => h.page.evaluate(() => (window as unknown as RecorderWindow).__events ?? []);
const errors = (h: Harness) => h.page.evaluate(() => (window as unknown as RecorderWindow).__errors2 ?? []);
const frames = (h: Harness) => h.page.locator('#host iframe[title="Kaltura recorder"]');
const ready = async (h: Harness) => expect.poll(async () => (await h.recorderLoads()).length).toBe(1);

test.describe('REC-01: the frame and the loadRecorder message', () => {
  test('REC-01: one frame of the pinned loader page, the KS only in the postMessage', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    const [load] = await h.recorderLoads();
    expect([
      await frames(h).count(),
      await frames(h).getAttribute('src'),
      await frames(h).getAttribute('allow'),
      await frames(h).getAttribute('sandbox'),
      load,
      await h.providerWidgets(),
    ]).toEqual([
      1,
      expect.stringMatching(FRAME_URL),
      'camera; microphone; display-capture; fullscreen',
      'allow-scripts allow-same-origin allow-downloads',
      {
        env: 'nvp1',
        config: {
          ks: KS,
          serviceUrl: 'https://www.kaltura.com',
          playerUrl: 'https://cdnapisec.kaltura.com',
          partnerId: 1234567,
          uiConfId: 7654321,
          recorderConfig: { saveMode: 'kaltura' },
        },
      },
      ['recorder'],
    ]);
  });

  test('REC-01: the KS is not in the DOM, the frame URL, the events or the console', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    await h.recorderSays({ messageType: 'uploadComplete', payload: JSON.stringify({ entryId: '1_abc12345', source: 'camera' }) });
    await expect.poll(async () => (await events(h)).length).toBe(1);
    const everywhere = JSON.stringify([await h.page.content(), h.requests, await events(h), await errors(h), h.consoleText, h.pageErrors]);
    expect(everywhere).not.toContain(KS);
  });

  test('REC-01: the optional props reach the recorder', async ({ harness: h }) => {
    await start(h, { ...CONFIG, entryName: 'Interview', allowVideo: false, maxRecordingTime: 120, orientation: 'portrait', prompterText: 'Hello' });
    await ready(h);
    expect((await h.recorderLoads())[0].config).toMatchObject({
      entryName: 'Interview',
      allowVideo: false,
      maxRecordingTime: 120,
      recorderConfig: { saveMode: 'kaltura', orientation: 'portrait', prompterText: 'Hello' },
    });
  });
});

test.describe('REC-01: lifecycle', () => {
  test('REC-01: removing the element removes the frame', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    await h.page.evaluate(() => document.querySelector('kaltura-recorder')?.remove());
    await expect(frames(h)).toHaveCount(0);
  });

  test('REC-01: moving the element keeps one frame', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    await h.page.evaluate(() => {
      const el = document.querySelector('kaltura-recorder') as HTMLElement;
      document.body.append(el);
    });
    await h.settle();
    expect(await h.page.locator('kaltura-recorder iframe[title="Kaltura recorder"]').count()).toBe(1);
  });
});

test.describe('REC-01: messages from the frame', () => {
  test('REC-01: uploadComplete reaches setEventHandler with the entry id', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    await h.recorderSays({ messageType: 'uploadComplete', payload: JSON.stringify({ entryId: '1_abc12345', source: 'camera' }) });
    await expect.poll(async () => (await events(h)).length).toBe(1);
    expect(await events(h)).toEqual([
      { type: 'recorder-upload-ended', widget: 'recorder', detail: { entryId: '1_abc12345', instanceId: expect.stringMatching(/^kaltura-recorder-/) } },
    ]);
  });

  test('REC-01: a message with a bad entry id is dropped and other messages are ignored', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    await h.recorderSays({ messageType: 'uploadComplete', payload: JSON.stringify({ entryId: '<img src=x>' }) });
    await h.recorderSays({ messageType: 'recordingStarted' });
    await h.recorderSays({ messageType: 'cameraBlob', payload: 'x' });
    await h.settle();
    expect([await events(h), await errors(h)]).toEqual([[], []]);
  });

  test('REC-01: orientationChanged reshapes the frame', async ({ harness: h }) => {
    await start(h);
    await ready(h);
    const ratio = () => frames(h).evaluate((frame) => (frame as HTMLElement).style.aspectRatio);
    expect(await ratio()).toBe('800 / 480');
    await h.recorderSays({ messageType: 'orientationChanged', payload: { orientation: 'portrait' } });
    await expect.poll(ratio).toBe('480 / 800');
  });
});

test.describe('REC-01: failures show fixed text', () => {
  test('REC-01: no recorderInit in 15 s shows an alert and reports load-failed', async ({ harness: h }) => {
    h.recorderMode = 'silent';
    await h.page.clock.install();
    await start(h);
    await expect(frames(h)).toHaveCount(1);
    await h.page.clock.fastForward(16_000);
    await expect(h.page.locator('#host [role=alert]')).toHaveText('Failed to load recorder: Recorder could not start');
    expect([await errors(h), await frames(h).count()]).toEqual([
      [{ code: 'load-failed', widget: 'recorder', message: 'Failed to load recorder: Recorder could not start' }],
      0,
    ]);
    expect(JSON.stringify([await h.page.content(), h.consoleText])).not.toContain(KS);
  });

  test('REC-01: bad props load no frame', async ({ harness: h }) => {
    await start(h, { partnerId: -1, uiconfId: 7654321 });
    await h.settle();
    expect([await frames(h).count(), await h.page.locator('#host [role=alert]').allTextContents()]).toEqual([
      0,
      ['Failed to load recorder: Invalid partnerId'],
    ]);
  });

  test('REC-01: a region with no Unisphere host loads no frame', async ({ harness: h }) => {
    await start(h, { ...CONFIG, region: 'sgp2' });
    await h.settle();
    expect(await frames(h).count()).toBe(0);
    await expect(h.page.locator('#host [role=alert]')).toContainText('Failed to load recorder');
  });
});
