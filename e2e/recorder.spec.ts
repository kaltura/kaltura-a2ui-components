// REC-01: `<kaltura-recorder>` loads the Express Recorder script in a real browser.
// The script is the stub in e2e/fixtures/express-recorder-stub.js, served for the
// real Kaltura URL by Harness.open(). The host supplies the KS with setKsProvider.
import { test, expect, type Harness } from './fixtures/harness';

const KS = 'E2E_RECORDER_KS_marker_91c2';
const SCRIPT_URL = 'https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js';
const CONFIG = { partnerId: 1234567, uiconfId: 7654321 };

interface RecorderWindow {
  __recorderCreates?: Array<{ id: string; options: Record<string, unknown> }>;
  __recorderLog?: string[];
  __recorderEmit(type: string, detail?: unknown): void;
  __events?: unknown[];
  __errors2?: unknown[];
  KalturaA2UIWebComponents: {
    setEventHandler(handler: (event: unknown) => void): void;
    setErrorHandler(handler: (error: unknown) => void): void;
  };
}

const creates = (h: Harness) => h.page.evaluate(() => (window as unknown as RecorderWindow).__recorderCreates ?? []);
const log = (h: Harness) => h.page.evaluate(() => (window as unknown as RecorderWindow).__recorderLog ?? []);
const scriptRequests = (h: Harness) => h.requests.filter((url) => url === SCRIPT_URL);

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

test.describe('REC-01: the script and the create call', () => {
  test('REC-01: one script from the fixed Kaltura URL, the provider KS in the create options, no iframe', async ({ harness: h }) => {
    await start(h);
    await expect.poll(async () => (await creates(h)).length).toBe(1);
    const [created] = await creates(h);
    expect([
      scriptRequests(h),
      created.options,
      await h.page.locator(`#host #${created.id} .stub-recorder-ui`).count(),
      await h.page.locator('#host iframe').count(),
      await h.providerWidgets(),
    ]).toEqual([
      [SCRIPT_URL],
      {
        ks: KS,
        serviceUrl: 'https://www.kaltura.com/api_v3',
        playerUrl: 'https://cdnapisec.kaltura.com',
        partnerId: 1234567,
        uiConfId: 7654321,
        app: 'a2ui',
      },
      1,
      0,
      ['recorder'],
    ]);
  });

  test('REC-01: two recorders and a remount load the script once', async ({ harness: h }) => {
    await start(h);
    await h.mount('kaltura-recorder', CONFIG);
    await expect.poll(async () => (await creates(h)).length).toBe(2);
    await h.page.evaluate(() => document.querySelector('kaltura-recorder')?.remove());
    await h.mount('kaltura-recorder', CONFIG);
    await expect.poll(async () => (await creates(h)).length).toBe(3);
    expect([scriptRequests(h).length, await h.page.locator('script[src*="express-recorder"]').count()]).toEqual([1, 1]);
  });

  test('REC-01: the KS is not in the DOM, the script URL, the events or the console', async ({ harness: h }) => {
    await start(h);
    await expect.poll(async () => (await creates(h)).length).toBe(1);
    await h.page.evaluate(() => (window as unknown as RecorderWindow).__recorderEmit('error', { code: 'X', message: 'bad' }));
    const everywhere = JSON.stringify([
      await h.page.content(),
      h.requests,
      await events(h),
      await errors(h),
      h.consoleText,
      h.pageErrors,
    ]);
    expect(everywhere).not.toContain(KS);
  });

  test('REC-01: the optional props reach the recorder', async ({ harness: h }) => {
    await start(h, { ...CONFIG, entryName: 'Interview', allowVideo: false, maxRecordingTime: 120 });
    await expect.poll(async () => (await creates(h)).length).toBe(1);
    expect((await creates(h))[0].options).toMatchObject({ entryName: 'Interview', allowVideo: false, maxRecordingTime: 120 });
  });
});

test.describe('REC-01: lifecycle', () => {
  test('REC-01: removing the element destroys the recorder and empties it', async ({ harness: h }) => {
    await start(h);
    await expect.poll(() => log(h)).toEqual(['create']);
    await h.page.evaluate(() => document.querySelector('kaltura-recorder')?.remove());
    await expect.poll(() => log(h)).toEqual(['create', 'destroy']);
    await expect(h.page.locator('.stub-recorder-ui')).toHaveCount(0);
  });

  test('REC-01: moving the element keeps one live recorder', async ({ harness: h }) => {
    await start(h);
    await expect.poll(() => log(h)).toEqual(['create']);
    await h.page.evaluate(() => {
      const el = document.querySelector('kaltura-recorder') as HTMLElement;
      document.body.append(el);
    });
    await h.settle();
    const live = (await log(h)).filter((entry) => entry === 'create').length - (await log(h)).filter((entry) => entry === 'destroy').length;
    expect([live, await h.page.locator('.stub-recorder-ui').count()]).toEqual([1, 1]);
  });
});

test.describe('REC-01: events and errors', () => {
  test('REC-01: mediaUploadEnded reaches setEventHandler with the entry id', async ({ harness: h }) => {
    await start(h);
    await expect.poll(async () => (await creates(h)).length).toBe(1);
    const [created] = await creates(h);
    await h.page.evaluate(() => (window as unknown as RecorderWindow).__recorderEmit('mediaUploadEnded', { entryId: '1_abc12345' }));
    expect(await events(h)).toEqual([
      { type: 'recorder-upload-ended', widget: 'recorder', detail: { entryId: '1_abc12345', instanceId: created.id } },
    ]);
  });

  test('REC-01: a remote error becomes a generic code and its text is dropped', async ({ harness: h }) => {
    await start(h);
    await expect.poll(async () => (await creates(h)).length).toBe(1);
    await h.page.evaluate(() =>
      (window as unknown as RecorderWindow).__recorderEmit('error', { code: 'NO_MEDIA_DEVICES', message: 'remote <b>text</b>' }),
    );
    expect([await errors(h), await h.hostText()]).toEqual([
      [{ code: 'render-failed', widget: 'recorder', message: 'Recorder error' }],
      'stub recorder',
    ]);
  });
});

test.describe('REC-01: failures show fixed text', () => {
  for (const [mode, text] of [
    ['fail', 'Recorder script failed to load'],
    ['no-api', 'Recorder API is missing'],
  ] as const) {
    test(`REC-01: script ${mode} shows an alert and reports load-failed`, async ({ harness: h }) => {
      h.recorderMode = mode;
      await start(h);
      await expect(h.page.locator('#host [role=alert]')).toHaveText(`Failed to load recorder: ${text}`);
      expect([await errors(h), await h.page.locator('#host iframe').count()]).toEqual([
        [{ code: 'load-failed', widget: 'recorder', message: `Failed to load recorder: ${text}` }],
        0,
      ]);
      expect(JSON.stringify([await h.page.content(), h.consoleText])).not.toContain(KS);
    });
  }

  test('REC-01: bad props load no script', async ({ harness: h }) => {
    await start(h, { partnerId: -1, uiconfId: 7654321 });
    await h.settle();
    expect([scriptRequests(h), await h.page.locator('#host [role=alert]').allTextContents()]).toEqual([
      [],
      ['Failed to load recorder: Invalid partnerId'],
    ]);
  });
});
