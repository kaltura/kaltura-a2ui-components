// Covers: REC-01 (the recorder loads the documented Express Recorder script) and
// SEC-03 (recorder input validation). The script is a fake from
// test/helpers/recorder-remote.ts. There is no iframe: the script builds its UI
// inside our container.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act, StrictMode } from 'react';
import { mount } from '../helpers/render';
import { recorderRemote, loadRecorder, SCRIPT_URL, type RecorderRemote } from '../helpers/recorder-remote';
import type { KalturaError, KalturaEvent } from '../../src/core/host-hooks';

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const VALID = { partnerId: 123, uiconfId: 456 };

let remote: RecorderRemote & { restore: () => void };

beforeEach(() => {
  remote = recorderRemote();
});

afterEach(() => {
  remote.restore();
  document.querySelectorAll('script').forEach(tag => tag.remove());
  document.body.innerHTML = '';
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

const box = (container: HTMLElement) => container.querySelector('.kaltura-recorder-container') as HTMLElement;

describe('REC-01: the script comes from one fixed place', () => {
  it('REC-01: a valid recorder adds one script tag with the fixed Kaltura URL', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect(remote.tags().map(tag => tag.src)).toEqual([SCRIPT_URL]);
  });

  it('REC-01: props cannot change the script URL', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, entryName: 'https://evil.example/x.js', ks: 'https://evil.example/ks' });
    await remote.ready();
    expect(remote.tags().map(tag => tag.src)).toEqual([SCRIPT_URL]);
  });

  it('REC-01: setRegion moves the script, the API and the player host together', async () => {
    const { RecorderCore, setRegion } = await setup();
    setRegion('irp2');
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect([
      remote.tags().map(tag => tag.src),
      remote.created[0].options.serviceUrl,
      remote.created[0].options.playerUrl,
    ]).toEqual([
      ['https://api.eu.kaltura.com/apps/expressrecorder/v2.2.10/express-recorder.js'],
      'https://api.eu.kaltura.com',
      'https://api.eu.kaltura.com',
    ]);
  });

  it('REC-01: many recorders and remounts load the script once', async () => {
    const { RecorderCore } = await setup();
    const first = await mount(RecorderCore, VALID);
    await mount(RecorderCore, VALID);
    await remote.ready(2);
    await act(async () => first.root.unmount());
    await mount(RecorderCore, VALID);
    await remote.ready(3);
    expect(remote.tags().length).toBe(1);
  });

  it('REC-01: StrictMode runs the effect twice and still loads once and keeps one live recorder', async () => {
    const { RecorderCore } = await setup();
    await mount(function Strict(props: Record<string, unknown>) {
      return createElement(StrictMode, null, createElement(RecorderCore, props as never));
    }, VALID);
    await remote.ready();
    expect([remote.tags().length, remote.log.filter(entry => entry === 'create').length - remote.log.filter(entry => entry === 'destroy').length]).toEqual([1, 1]);
  });

  it('REC-01: the script is not added for bad props', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, { ...VALID, partnerId: '1' });
    expect(remote.tags().length).toBe(0);
  });
});

describe('REC-01: create options', () => {
  it('REC-01: the recorder gets the provider KS, the ids and the required app name', async () => {
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    const { id, options } = remote.created[0];
    expect([options, id]).toEqual([
      {
        ks: HOST_KS,
        serviceUrl: 'https://www.kaltura.com',
        playerUrl: 'https://cdnapisec.kaltura.com',
        partnerId: 123,
        uiConfId: 456,
        app: 'a2ui',
      },
      expect.stringMatching(/^kaltura-recorder-[0-9a-f-]{36}$/),
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
    });
    await remote.ready();
    expect(remote.created[0].options).toMatchObject({
      entryName: 'Interview',
      allowVideo: false,
      allowAudio: true,
      allowScreenShare: true,
      maxRecordingTime: 120,
    });
  });

  it('REC-01: the container id is the id the script gets, and the script builds its UI inside it', async () => {
    const { RecorderCore } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    await remote.ready();
    const holder = box(container);
    expect([holder.id, holder.id === remote.created[0].id, holder.querySelectorAll('.fake-recorder-ui').length, container.querySelectorAll('iframe').length]).toEqual([
      expect.stringMatching(/^kaltura-recorder-/),
      true,
      1,
      0,
    ]);
  });

  it('REC-01: a ks prop is the fallback when no provider is set', async () => {
    const { RecorderCore, setKsProvider } = await setup();
    setKsProvider(undefined);
    await mount(RecorderCore, { ...VALID, ks: 'prop-ks' });
    await remote.ready();
    expect(remote.created[0].options.ks).toBe('prop-ks');
  });
});

describe('REC-01: lifecycle', () => {
  it('REC-01: unmount destroys the recorder and empties the container', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await remote.ready();
    const holder = box(container);
    await act(async () => root.unmount());
    expect([remote.log, holder.childElementCount]).toEqual([['create', 'destroy'], 0]);
  });

  it('REC-01: a prop that needs a new recorder destroys the old one first', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => root.render(createElement(RecorderCore, { ...VALID, maxRecordingTime: 60 })));
    await remote.ready(2);
    expect([remote.log, box(container).querySelectorAll('.fake-recorder-ui').length, remote.created[1].options.maxRecordingTime]).toEqual([
      ['create', 'destroy', 'create'],
      1,
      60,
    ]);
  });

  it('REC-01: unmount before the script loads creates nothing', async () => {
    remote.script = 'hold';
    const { RecorderCore, loadRecorderScript } = await setup();
    const { root } = await mount(RecorderCore, VALID);
    await act(async () => root.unmount());
    remote.script = 'load';
    // The held tag finishes later: load it the way the browser would.
    (window as { Kaltura?: unknown }).Kaltura = { ExpressRecorder: { create: () => remote.log.push('create') } };
    remote.tags()[0].dispatchEvent(new Event('load'));
    await loadRecorderScript();
    expect(remote.log).toEqual([]);
  });

  it('REC-01: valid to invalid props destroys the recorder and shows the error', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => {
      root.render(createElement(RecorderCore, { ...VALID, partnerId: '1' } as never));
    });
    expect([remote.log, box(container).textContent]).toEqual([['create', 'destroy'], 'Failed to load recorder: Invalid partnerId']);
  });

  it('REC-01: invalid to valid props replaces the error with the recorder', async () => {
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, { ...VALID, partnerId: 'x' });
    await act(async () => {
      root.render(createElement(RecorderCore, VALID));
    });
    await remote.ready();
    expect([box(container).querySelectorAll('.kaltura-load-error').length, box(container).querySelectorAll('.fake-recorder-ui').length]).toEqual([0, 1]);
  });

  it('REC-01: a recorder whose destroy throws does not break unmount', async () => {
    remote.create = 'destroy-throws';
    const { RecorderCore } = await setup();
    const { container, root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => root.unmount());
    expect([remote.log, box(container)?.childElementCount ?? 0]).toEqual([['create', 'destroy'], 0]);
  });
});

describe('REC-01: the KS stays out of the DOM, the URL, events and errors', () => {
  it('REC-01: the KS is only in the create options', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => vi.spyOn(console, method).mockImplementation(() => {}));
    const { RecorderCore, events, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    await remote.ready();
    remote.emit('mediaUploadEnded', { entryId: '0_abc12345' });
    remote.emit('error', { code: 'X', message: `bad ${HOST_KS}` });
    const everywhere = JSON.stringify([
      remote.tags().map(tag => tag.outerHTML),
      container.innerHTML,
      container.textContent,
      events,
      errors,
      spies.flatMap(spy => spy.mock.calls.map(call => String(call))),
    ]);
    expect([everywhere.includes(HOST_KS), JSON.stringify(remote.created[0].options).includes(HOST_KS)]).toEqual([false, true]);
  });

  it.each(['error', 'no-api'] as const)('REC-01: when the script fails (%s) no text holds the KS', async script => {
    remote.script = script;
    const { RecorderCore, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    expect(JSON.stringify([container.innerHTML, errors]).includes(HOST_KS)).toBe(false);
  });

  it('REC-01: a create that throws with the KS in its message shows fixed text only', async () => {
    remote.create = 'throw';
    const { RecorderCore, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    expect([box(container).textContent, errors]).toEqual([
      'Failed to load recorder: Recorder could not start',
      [{ code: 'load-failed', widget: 'recorder', message: 'Failed to load recorder: Recorder could not start' }],
    ]);
  });
});

describe('REC-01: recorder events reach the host', () => {
  it('REC-01: mediaUploadEnded becomes recorder-upload-ended with the entry id and instance id', async () => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.emit('mediaUploadEnded', { entryId: '1_abc12345' });
    expect(events).toEqual([
      { type: 'recorder-upload-ended', widget: 'recorder', detail: { entryId: '1_abc12345', instanceId: remote.created[0].id } },
    ]);
  });

  it.each([
    ['no detail', undefined],
    ['no entry id', {}],
    ['a number', { entryId: 5 }],
    ['markup', { entryId: '<img src=x onerror=1>' }],
    ['a path', { entryId: '../x' }],
  ])('REC-01: mediaUploadEnded with %s sends no entry id', async (_name, detail) => {
    const { RecorderCore, events } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.emit('mediaUploadEnded', detail);
    expect(events).toEqual([{ type: 'recorder-upload-ended', widget: 'recorder', detail: { instanceId: remote.created[0].id } }]);
  });

  it('REC-01: a late upload event after unmount is dropped', async () => {
    const { RecorderCore, events } = await setup();
    const { root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => root.unmount());
    remote.emit('mediaUploadEnded', { entryId: '1_abc12345' });
    expect(events).toEqual([]);
  });

  it('REC-01: a throwing event handler does not reach the recorder', async () => {
    const { RecorderCore, setEventHandler } = await setup();
    setEventHandler(() => {
      throw new Error('host bug');
    });
    await mount(RecorderCore, VALID);
    await remote.ready();
    expect(() => remote.emit('mediaUploadEnded', { entryId: '1_abc12345' })).not.toThrow();
  });
});

describe('REC-01: every recorder error is reported as render-failed', () => {
  it.each([
    ['PERMISSION_DENIED', 'render-failed', 'Recorder error'],
    ['NO_MEDIA_DEVICES', 'render-failed', 'Recorder error'],
    ['BROWSER_NOT_SUPPORTED', 'render-failed', 'Recorder error'],
    [undefined, 'render-failed', 'Recorder error'],
  ])('REC-01: error code %s is reported as %s', async (code, mapped, message) => {
    const { RecorderCore, errors } = await setup();
    await mount(RecorderCore, VALID);
    await remote.ready();
    remote.emit('error', { code, message: '<img src=x onerror=1> remote text' });
    expect(errors).toEqual([{ code: mapped, widget: 'recorder', message }]);
  });

  it('REC-01: the remote error text is neither reported nor shown', async () => {
    const { RecorderCore, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    await remote.ready();
    remote.emit('error', { code: 'NO_MEDIA_DEVICES', message: 'remote text <b>x</b>' });
    expect([JSON.stringify(errors).includes('remote text'), container.textContent?.includes('remote text')]).toEqual([false, false]);
  });

  it('REC-01: an error after unmount is dropped', async () => {
    const { RecorderCore, errors } = await setup();
    const { root } = await mount(RecorderCore, VALID);
    await remote.ready();
    await act(async () => root.unmount());
    remote.emit('error', { code: 'PERMISSION_DENIED' });
    expect(errors).toEqual([]);
  });
});

describe('REC-01: load failures show fixed text and a load-failed code', () => {
  it.each([
    ['the script tag fails', 'error', 'Recorder script failed to load', undefined],
    ['the script defines no recorder API', 'no-api', 'Recorder API is missing', undefined],
    ['the recorder handle has no instance', undefined, 'Recorder could not start', 'no-instance'],
  ] as const)('REC-01: %s', async (_name, script, text, create) => {
    if (script) remote.script = script;
    if (create) remote.create = create;
    const { RecorderCore, errors } = await setup();
    const { container } = await mount(RecorderCore, VALID);
    expect([box(container).textContent, errors]).toEqual([
      `Failed to load recorder: ${text}`,
      [{ code: 'load-failed', widget: 'recorder', message: `Failed to load recorder: ${text}` }],
    ]);
  });

  it('REC-01: a recorder that started before the failure is destroyed', async () => {
    remote.create = 'no-instance';
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    expect(remote.log).toEqual(['create', 'destroy']);
  });

  it('REC-01: a failed load is not cached, the next recorder tries again', async () => {
    remote.script = 'error';
    const { RecorderCore } = await setup();
    await mount(RecorderCore, VALID);
    remote.script = 'load';
    const { container } = await mount(RecorderCore, VALID);
    await remote.ready();
    expect([box(container).querySelectorAll('.fake-recorder-ui').length, remote.tags().length]).toEqual([1, 1]);
  });
});

describe('REC-01: bad props show a plain-text error and load nothing', () => {
  const bad: Array<[string, Record<string, unknown>]> = [
    ['string partnerId', { partnerId: '123' }],
    ['partnerId with path traversal', { partnerId: '1/../evil' }],
    ['zero partnerId', { partnerId: 0 }],
    ['negative partnerId', { partnerId: -5 }],
    ['float partnerId', { partnerId: 1.5 }],
    ['NaN partnerId', { partnerId: NaN }],
    ['Infinity partnerId', { partnerId: Infinity }],
    ['unsafe-integer partnerId', { partnerId: 2 ** 60 }],
    ['exponent-form partnerId string', { partnerId: '1e3' }],
    ['string uiconfId', { uiconfId: '5' }],
    ['zero uiconfId', { uiconfId: 0 }],
    ['negative uiconfId', { uiconfId: -1 }],
    ['float uiconfId', { uiconfId: 0.5 }],
    ['null uiconfId', { uiconfId: null }],
    ['long entryName', { entryName: 'a'.repeat(257) }],
    ['number entryName', { entryName: 5 }],
    ['string allowVideo', { allowVideo: 'false' }],
    ['string allowScreenShare', { allowScreenShare: 'true' }],
    ['zero maxRecordingTime', { maxRecordingTime: 0 }],
    ['huge maxRecordingTime', { maxRecordingTime: 86401 }],
    ['float maxRecordingTime', { maxRecordingTime: 1.5 }],
    ['empty ks', { ks: '' }],
    ['number ks', { ks: 5 }],
    ['ks with newline', { ks: 'a\nb' }],
    ['ks with NUL', { ks: 'a\u0000b' }],
    ['ks with tab', { ks: 'a\tb' }],
    ['ks with DEL', { ks: 'a\u007fb' }],
    ['ks with C1 control', { ks: 'a\u0085b' }],
  ];

  it.each(bad)('REC-01: %s', async (_name, props) => {
    const { RecorderCore, setKsProvider } = await setup();
    setKsProvider(undefined);
    const { container } = await mount(RecorderCore, { ...VALID, ks: 'k', ...props });
    expect([remote.tags().length, remote.created.length, box(container).querySelector('.kaltura-load-error')?.textContent]).toEqual([
      0,
      0,
      expect.stringMatching(/^Failed to load recorder: Invalid \w+(: call setKsProvider)?$/),
    ]);
  });

  it.each([
    ['missing partnerId', { uiconfId: 1, ks: 'k' }],
    ['missing uiconfId', { partnerId: 1, ks: 'k' }],
    ['missing ks', { partnerId: 1, uiconfId: 1 }],
  ])('REC-01: %s is pending: no error and no script', async (_name, props) => {
    const { RecorderCore, setKsProvider } = await setup();
    setKsProvider(undefined);
    const { container } = await mount(RecorderCore, props);
    expect([box(container).textContent, box(container).childElementCount, remote.tags().length]).toEqual(['', 0, 0]);
  });

  it('REC-01: the error does not echo hostile input and adds no elements besides the box', async () => {
    const { RecorderCore } = await setup();
    const { container } = await mount(RecorderCore, { ...VALID, partnerId: '<img src=x onerror="window.__pwned=1">' });
    expect([box(container).querySelectorAll('*').length, container.textContent, container.querySelector('img')]).toEqual([
      1,
      'Failed to load recorder: Invalid partnerId',
      null,
    ]);
  });

  it('REC-01: an entryName with markup is passed as plain text and creates no element', async () => {
    const { RecorderCore } = await setup();
    const { container } = await mount(RecorderCore, { ...VALID, entryName: '<img src=x onerror="window.__pwned=1">' });
    await remote.ready();
    expect([container.querySelector('img'), (window as { __pwned?: number }).__pwned]).toEqual([null, undefined]);
  });
});
