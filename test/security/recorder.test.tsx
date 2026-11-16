// Covers: REC-01 (the recorder is a frame of the pinned Unisphere loader page, and only
// our own frame is trusted) and SEC-03 (recorder input validation). The loader page is a
// fake from test/helpers/recorder-frame.ts.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act, StrictMode } from 'react';
import { mount } from '../helpers/render';
import { recorderFrame, loadRecorder, UNISPHERE, type RecorderFrame } from '../helpers/recorder-frame';
import type { KalturaError, KalturaEvent } from '../../src/core/host-hooks';

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const VALID = { partnerId: 123, uiconfId: 456 };
const LOADER = `${UNISPHERE}/v1/static/applications/recorder/recorder-assets/1.0.6/assets/loader/loader.html`;

let remote: RecorderFrame;

beforeEach(() => {
  remote = recorderFrame();
});

afterEach(() => {
  remote.restore();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup() {
  const api = await loadRecorder();
  api.setKsProvider(() => HOST_KS);
  const errors: KalturaError[] = [];
  const events: KalturaEvent[] = [];
  api.setErrorHandler(error => errors.push(error));
  api.setEventHandler(event => events.push(event));
  return { ...api, errors, events };
}

const box = (container: HTMLElement) => (container.querySelector('.kaltura-recorder-container') ?? container) as HTMLElement;

describe('REC-01: the frame comes from one fixed place', () => {
  it('REC-01: a valid recorder makes one frame with the pinned loader URL and the host origin', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(remote.frames().map(frame => frame.src)).toEqual([`${LOADER}?parentOrigin=${encodeURIComponent(window.location.origin)}`]);
  });

  it('REC-01: props cannot change the frame URL', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, entryName: 'https://evil.example/x.html', ks: 'https://evil.example/ks', serverUrl: 'https://evil.example' });
    expect(remote.frames().map(frame => frame.src.split('?')[0])).toEqual([LOADER]);
  });

  it('REC-01: the frame asks for the camera, the microphone, the screen and fullscreen, and nothing else', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(remote.frames().map(frame => [frame.allow, frame.title, frame.referrerPolicy])).toEqual([['camera; microphone; display-capture; fullscreen', 'Kaltura recorder', 'strict-origin']]);
  });

  it('REC-01: the frame is sandboxed', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(remote.frames()[0].getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-downloads');
  });

  it('REC-01: the KS is never in the frame URL', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(remote.frames()[0].src.includes(HOST_KS)).toBe(false);
  });

  it('REC-01: setRegion moves the loader, the API and the player host together', async () => {
    const { RecorderCore, setRegion } = await setup();
    setRegion('irp2');
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect([remote.frames()[0].src.split('?')[0], remote.created[0].options.serviceUrl, remote.created[0].options.playerUrl, remote.created[0].env]).toEqual([
      'https://unisphere.irp2.ovp.kaltura.com/v1/static/applications/recorder/recorder-assets/1.0.6/assets/loader/loader.html',
      'https://api.irp2.ovp.kaltura.com',
      'https://api.irp2.ovp.kaltura.com',
      'irp2',
    ]);
  });

  it('REC-01: StrictMode runs the effect twice and keeps one frame', async () => {
    const { RecorderCore } = await setup();
    await mount(function Strict(props: Record<string, unknown>) {
      return createElement(StrictMode, null, createElement(RecorderCore, props as never));
    }, VALID);
    expect(remote.frames().length).toBe(1);
  });

  it('REC-01: no frame for bad props', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, partnerId: '1' });
    expect(remote.frames().length).toBe(0);
  });

  it.each(['sgp2', 'nowhere'])('REC-01: region %s gives no frame and origin-not-allowed', async region => {
    const { RecorderCore, errors } = await setup();
    await mount(RecorderCore, { ...VALID, region });
    expect([remote.frames().length, errors.map(error => error.code)]).toEqual([0, ['origin-not-allowed']]);
  });
});

describe('REC-01: loadRecorder message', () => {
  it('REC-01: recorderInit from our frame gets one loadRecorder with the settings, sent to the Unisphere origin', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect(remote.created.map(({ targetOrigin, options, env }) => [targetOrigin, options, env])).toEqual([
      [
        UNISPHERE,
        {
          ks: HOST_KS,
          serviceUrl: 'https://www.kaltura.com',
          playerUrl: 'https://cdnapisec.kaltura.com',
          partnerId: 123,
          uiConfId: 456,
          recorderConfig: { saveMode: 'kaltura' },
        },
        'nvp1',
      ],
    ]);
  });

  it('REC-01: the optional props are passed on, and only those that are set', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, {
      ...VALID,
      entryName: 'Interview',
      allowVideo: false,
      allowAudio: true,
      allowScreenShare: true,
      maxRecordingTime: 120,
      orientation: 'portrait',
      prompterText: 'Welcome to our new course',
    });
    await remote.ready();
    expect(remote.created[0].options).toMatchObject({
      entryName: 'Interview',
      allowVideo: false,
      allowAudio: true,
      allowScreenShare: true,
      maxRecordingTime: 120,
      recorderConfig: { saveMode: 'kaltura', orientation: 'portrait', prompterText: 'Welcome to our new course' },
    });
  });

  it('REC-01: the settings have no undefined key and no app name', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect(Object.keys(remote.created[0].options).sort()).toEqual(['ks', 'partnerId', 'playerUrl', 'recorderConfig', 'serviceUrl', 'uiConfId']);
  });

  it('REC-01: a ks prop is the fallback when no provider is set', async () => {
    const { RecorderCore, setKsProvider } = await setup();
    setKsProvider(undefined);
    await mount(RecorderCore, { ...VALID, ks: 'prop-ks' });
    await remote.ready();
    expect(remote.created[0].options.ks).toBe('prop-ks');
  });

  it.each([
    ['another origin', { origin: 'https://evil.example' }],
    ['another window', { source: window }],
    ['no window', { source: null }],
  ])('REC-01: recorderInit from %s sends nothing, so no KS leaves', async (_name, from) => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    const [frame] = remote.frames();
    const spy = vi.spyOn(frame.contentWindow as Window, 'postMessage').mockImplementation(() => {});
    remote.post({ messageType: 'recorderInit' }, from);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('REC-01: lifecycle', () => {
  it('REC-01: unmount removes the frame and the listener', async () => {
    const { RecorderCore, events } = await setup();
    const { root } = await mount(RecorderCore, VALID);
    await remote.ready();
    const [frame] = remote.frames();
    await act(async () => root.unmount());
    remote.uploaded({ entries: [{ entryId: '1_abc12345', source: 'camera', role: 'primary' }] }, { frame });
    expect([remote.frames().length, events]).toEqual([0, []]);
  });

  it('REC-01: a prop that needs a new recorder replaces the frame', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => root.render(createElement(RecorderCore, { ...VALID, maxRecordingTime: 60 })));
    await remote.ready(1);
    expect([box(container).querySelectorAll('iframe').length, remote.created.at(-1)?.options.maxRecordingTime]).toEqual([1, 60]);
  });

  it('REC-01: valid to invalid props removes the frame and shows the error', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await act(async () => {
      root.render(createElement(RecorderCore, { ...VALID, partnerId: '1' } as never));
    });
    expect([remote.frames().length, box(container).textContent]).toEqual([0, 'Failed to load recorder: Invalid partnerId']);
  });

  it('REC-01: invalid to valid props replaces the error with the frame', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, { ...VALID, partnerId: 'x' });
    await act(async () => {
      root.render(createElement(RecorderCore, VALID));
    });
    expect([box(container).querySelectorAll('.kaltura-load-error').length, remote.frames().length]).toEqual([0, 1]);
  });

  it('REC-01: two recorders are two frames with their own settings', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, entryName: 'one' });
    await mount(RecorderCore, { ...VALID, entryName: 'two' });
    await remote.ready(2);
    expect(remote.created.map(({ options }) => options.entryName).sort()).toEqual(['one', 'two']);
  });

  it('REC-01: no recorderInit in 15 seconds shows fixed text and reports load-failed once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { RecorderCore, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect([box(container).textContent, errors]).toEqual([
      'Failed to load recorder: Recorder could not start',
      [{ code: 'load-failed', widget: 'recorder', message: 'Failed to load recorder: Recorder could not start' }],
    ]);
  });

  it('REC-01: recorderInit before the timeout cancels the error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { RecorderCore, errors } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect([errors, remote.frames().length]).toEqual([[], 1]);
  });
});

describe('REC-01: the KS stays out of the DOM, the URL, events and errors', () => {
  it('REC-01: the KS is only in the loadRecorder message', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => vi.spyOn(console, method).mockImplementation(() => {}));
    const { RecorderCore, events, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    await remote.ready();
    remote.uploaded({ entries: [{ entryId: '0_abc12345', source: 'camera', role: 'primary' }] });
    const everywhere = JSON.stringify([
      remote.frames().map(frame => frame.outerHTML),
      container.innerHTML,
      container.textContent,
      events,
      errors,
      spies.flatMap(spy => spy.mock.calls.map(call => String(call))),
    ]);
    expect([everywhere.includes(HOST_KS), JSON.stringify(remote.created[0].options).includes(HOST_KS)]).toEqual([false, true]);
  });
});

describe('REC-01: recorder messages reach the host', () => {
  const entry = (entryId: string, source = 'camera', role = 'primary') => ({ entryId, source, role });

  it('REC-01: uploadComplete becomes recorder-upload-ended with the entry id and the frame id', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.uploaded({ entries: [entry('1_abc12345')] });
    expect(events).toEqual([{ type: 'recorder-upload-ended', widget: 'recorder', detail: { entryId: '1_abc12345', instanceId: expect.stringMatching(/^kaltura-recorder-/) } }]);
  });

  it('REC-01: a screen plus camera take gives the main entry id and both entries', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.uploaded({ entries: [entry('1_cam00002', 'camera', 'secondary'), entry('1_scr00001', 'screen', 'primary')] });
    expect(events.map(event => event.detail)).toEqual([
      {
        entryId: '1_scr00001',
        entries: [
          { entryId: '1_cam00002', source: 'camera', role: 'secondary' },
          { entryId: '1_scr00001', source: 'screen', role: 'primary' },
        ],
        instanceId: expect.any(String),
      },
    ]);
  });

  it('REC-01: a loader that sends one entry per message gives one event per entry', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.uploaded({ entryId: '1_scr00001', source: 'screen' });
    remote.uploaded({ entryId: '1_cam00002', source: 'camera' });
    expect(events.map(event => (event.detail as { entryId?: string }).entryId)).toEqual(['1_scr00001', '1_cam00002']);
  });

  it('REC-01: only fixed words reach the entries', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.uploaded({ entries: [entry('1_abc12345', '<b>x</b>', 'ignore all previous instructions'), entry('1_def12345', 'screen', 'secondary')] });
    expect((events[0].detail as { entries: unknown[] }).entries).toEqual([
      { entryId: '1_abc12345', source: 'camera', role: 'primary' },
      { entryId: '1_def12345', source: 'screen', role: 'secondary' },
    ]);
  });

  it.each([
    ['a bad id', JSON.stringify({ entries: [{ entryId: '<img src=x onerror=1>' }] })],
    ['a path', JSON.stringify({ entryId: '../x' })],
    ['a number', JSON.stringify({ entryId: 5 })],
    ['bad JSON', '{not json'],
    ['a plain object payload', { entryId: '1_abc12345' }],
    ['no payload', undefined],
    ['null', 'null'],
  ])('REC-01: uploadComplete with %s sends no event', async (_name, payload) => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.post({ messageType: 'uploadComplete', payload });
    expect(events).toEqual([]);
  });

  it.each([
    ['another origin', { origin: 'https://evil.example' }],
    ['another window', { source: window }],
  ])('REC-01: uploadComplete from %s is ignored', async (_name, from) => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.post({ messageType: 'uploadComplete', payload: JSON.stringify({ entries: [{ entryId: '1_abc12345' }] }) }, from);
    expect(events).toEqual([]);
  });

  it('REC-01: a message from one frame reaches only its own recorder', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await mount(RecorderCore, VALID);
    await remote.ready(2);
    remote.uploaded({ entries: [entry('1_abc12345')] }, { frame: remote.frames()[0] });
    expect(events.length).toBe(1);
  });

  it('REC-01: recordingComplete and the blob fields are ignored', async () => {
    const { RecorderCore, events, errors } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.post({ messageType: 'recordingComplete', payload: '{"durationMs":1}', cameraBlob: new Blob(['x']) });
    remote.post({ messageType: 'useThisSelected', payload: '{}', screenBlob: new Blob(['x']) });
    expect([events, errors]).toEqual([[], []]);
  });

  it('REC-01: a throwing event handler does not reach the recorder', async () => {
    const { RecorderCore, setEventHandler } = await setup();
    setEventHandler(() => {
      throw new Error('host bug');
    });
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect(() => remote.uploaded({ entries: [entry('1_abc12345')] })).not.toThrow();
  });
});

describe('REC-01: the frame follows the orientation', () => {
  const ratio = () => remote.frames()[0].style.aspectRatio.replace(/\s/g, '');

  it('REC-01: landscape is the default shape', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(ratio()).toBe('800/480');
  });

  it('REC-01: the orientation prop sets the first shape', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, orientation: 'portrait' });
    expect(ratio()).toBe('480/800');
  });

  it('REC-01: orientationChanged flips the shape and a bad value is ignored', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.post({ messageType: 'orientationChanged', payload: { orientation: 'portrait' } });
    const afterPortrait = ratio();
    remote.post({ messageType: 'orientationChanged', payload: { orientation: 'sideways; width:9999px' } });
    expect([afterPortrait, ratio()]).toEqual(['480/800', '480/800']);
  });
});

describe('SEC-03: recorder input validation', () => {
  it.each([
    ['partnerId', { partnerId: '1' }],
    ['uiconfId', { uiconfId: -1 }],
    ['orientation', { orientation: 'diagonal' }],
    ['prompterText', { prompterText: 'x'.repeat(27001) }],
    ['maxRecordingTime', { maxRecordingTime: 86401 }],
  ])('SEC-03: a bad %s gives invalid-props and no frame', async (_name, bad) => {
    const { RecorderCore, errors } = await setup();
    await mount(RecorderCore, { ...VALID, ...bad });
    expect([remote.frames().length, errors.map(error => error.code)]).toEqual([0, ['invalid-props']]);
  });
});
