// Covers: SEC-10 (the KS goes only into the player setup config, never into a URL, the DOM, events or
// errors) and SEC-11 (bad ids load nothing) for the Player script path (docs/adr/0008).
// The Kaltura Player bundle is a fake from test/helpers/player-remote.ts. There is no iframe:
// the script builds its UI inside our container.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act, StrictMode } from 'react';
import { mount } from '../helpers/render';
import { playerRemote, loadPlayer, scriptUrl, ERROR_EVENT } from '../helpers/player-remote';
import type { KalturaError } from '../../src/core/host-hooks';

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const VALID = { partnerId: 123, uiconfId: 456, entryId: '0_abc12345' };

let remote: ReturnType<typeof playerRemote>;

beforeEach(() => {
  remote = playerRemote();
});

afterEach(() => {
  remote.restore();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function setup() {
  const api = await loadPlayer();
  api.setKsProvider(() => HOST_KS);
  const errors: KalturaError[] = [];
  api.setErrorHandler(error => errors.push(error));
  return { ...api, errors };
}

const region = (container: HTMLElement) => container.querySelector('[role="region"]') as HTMLElement;

describe('SEC-10: the script comes from one fixed place', () => {
  it('SEC-10: a valid player adds one script tag with the Kaltura CDN URL of its partner and uiconf', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    await remote.ready();
    expect(remote.urls).toEqual([scriptUrl(123, 456)]);
  });

  it('SEC-10: props cannot change the script URL', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, { ...VALID, entryName: 'https://evil.example/x.js', ks: 'https://evil.example/ks' });
    await remote.ready();
    expect(remote.urls).toEqual([scriptUrl(123, 456)]);
  });

  it('SEC-10: the script tag has no query string, so no KS or id can ride in it', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, { ...VALID, ks: HOST_KS });
    await remote.ready();
    expect(new URL(remote.urls[0]).search).toBe('');
  });

  it('SEC-10: setRegion moves the script to the regional host', async () => {
    const { PlayerCore, setRegion } = await setup();
    setRegion('irp2');
    await mount(PlayerCore, VALID);
    await remote.ready();
    expect(remote.urls).toEqual(['https://api.eu.kaltura.com/p/123/embedPlaykitJs/partner_id/123/uiconf_id/456']);
  });

  it('SEC-10: many players of one uiconf and remounts load the script once', async () => {
    const { PlayerCore } = await setup();
    const first = await mount(PlayerCore, VALID);
    await mount(PlayerCore, { ...VALID, entryId: '0_other123' });
    await remote.ready(2);
    await act(async () => first.root.unmount());
    await mount(PlayerCore, VALID);
    await remote.ready(3);
    expect(remote.urls.length).toBe(1);
  });

  it('SEC-10: another uiconf loads its own bundle', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    await mount(PlayerCore, { ...VALID, uiconfId: 789 });
    await remote.ready(2);
    expect(remote.urls).toEqual([scriptUrl(123, 456), scriptUrl(123, 789)]);
  });

  it('SEC-10: StrictMode runs the effect twice and keeps one live player', async () => {
    const { PlayerCore } = await setup();
    const { container } = await mount(StrictMode as never, { children: createElement(PlayerCore, VALID) });
    await remote.ready(1);
    expect([remote.urls.length, region(container).querySelectorAll('.fake-player-ui').length]).toEqual([1, 1]);
  });

  it('SEC-11: the script is not added for bad props', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, { ...VALID, entryId: '../x' });
    expect([remote.urls, remote.created]).toEqual([[], []]);
  });
});

describe('SEC-10: setup config and loadMedia', () => {
  it('SEC-10: the player gets the provider KS in the provider config, with the KS header option', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    await remote.ready();
    expect(remote.created[0].config.provider).toEqual({ partnerId: 123, uiConfId: 456, ks: HOST_KS, useHeaderForKs: true });
  });

  it('SEC-10: the container id is the id the script gets, and the script builds its UI inside it', async () => {
    const { PlayerCore } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    await remote.ready();
    expect([region(container).id, remote.created[0].config.targetId, region(container).querySelectorAll('.fake-player-ui').length]).toEqual([
      remote.created[0].config.targetId,
      expect.stringMatching(/^kaltura-player-/),
      1,
    ]);
  });

  it('SEC-10: two players get two different container ids', async () => {
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    await mount(PlayerCore, VALID);
    await remote.ready(2);
    expect(new Set(remote.created.map(created => created.config.targetId)).size).toBe(2);
  });
});

describe('SEC-10: lifecycle', () => {
  it('SEC-10: unmount destroys the player and empties the container', async () => {
    const { PlayerCore } = await setup();
    const { container, root } = await mount(PlayerCore, VALID);
    await remote.ready();
    const holder = region(container);
    await act(async () => root.unmount());
    expect([remote.log, holder.childElementCount]).toEqual([['setup', 'loadMedia', 'destroy'], 0]);
  });

  it('SEC-10: a prop that needs a new player destroys the old one first', async () => {
    const { PlayerCore } = await setup();
    const { container, root } = await mount(PlayerCore, VALID);
    await remote.ready();
    await act(async () => root.render(createElement(PlayerCore, { ...VALID, entryId: '0_other123' })));
    await remote.ready(2);
    expect([remote.log, region(container).querySelectorAll('.fake-player-ui').length]).toEqual([
      ['setup', 'loadMedia', 'destroy', 'setup', 'loadMedia'],
      1,
    ]);
  });

  it('SEC-10: unmount before the script loads creates nothing', async () => {
    remote.script = 'hold';
    const { PlayerCore } = await setup();
    const { root } = await mount(PlayerCore, VALID);
    await act(async () => root.unmount());
    // The held tag finishes later: load it the way the browser would.
    remote.install();
    remote.tags()[0].dispatchEvent(new Event('load'));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(remote.log).toEqual([]);
  });

  it('SEC-10: valid to invalid props destroys the player and shows the error', async () => {
    const { PlayerCore } = await setup();
    const { container, root } = await mount(PlayerCore, VALID);
    await remote.ready();
    await act(async () => {
      root.render(createElement(PlayerCore, { ...VALID, partnerId: '1' } as never));
    });
    expect([remote.log, container.textContent]).toEqual([['setup', 'loadMedia', 'destroy'], 'Failed to load player: Invalid partnerId']);
  });

  it('SEC-10: invalid to valid props replaces the error with the player', async () => {
    const { PlayerCore } = await setup();
    const { container, root } = await mount(PlayerCore, { ...VALID, partnerId: 'x' });
    await act(async () => {
      root.render(createElement(PlayerCore, VALID));
    });
    await remote.ready();
    expect([container.querySelectorAll('.kaltura-load-error').length, container.querySelectorAll('.fake-player-ui').length]).toEqual([0, 1]);
  });

  it('SEC-10: a player whose destroy throws does not break unmount', async () => {
    remote.setup = 'destroy-throws';
    const { PlayerCore } = await setup();
    const { container, root } = await mount(PlayerCore, VALID);
    await remote.ready();
    const holder = region(container);
    await act(async () => root.unmount());
    expect([remote.log, holder.childElementCount]).toEqual([['setup', 'loadMedia', 'destroy'], 0]);
  });
});

describe('SEC-10: the KS stays out of the DOM, the URL, events and errors', () => {
  it('SEC-10: the KS is only in the setup config', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => vi.spyOn(console, method).mockImplementation(() => {}));
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    await remote.ready();
    remote.emit(ERROR_EVENT, { message: `bad ${HOST_KS}` });
    const everywhere = JSON.stringify([
      remote.urls,
      remote.html,
      container.innerHTML,
      container.textContent,
      remote.created.map(created => created.loads),
      errors,
      spies.flatMap(spy => spy.mock.calls.map(call => String(call))),
    ]);
    expect([everywhere.includes(HOST_KS), JSON.stringify(remote.created[0].config.provider).includes(HOST_KS)]).toEqual([false, true]);
  });

  it.each(['error', 'no-api', 'no-setup'] as const)('SEC-10: when the script fails (%s) no text holds the KS', async script => {
    remote.script = script;
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    expect(JSON.stringify([container.innerHTML, errors]).includes(HOST_KS)).toBe(false);
  });

  it('SEC-10: a setup that throws with the KS in its message shows fixed text only', async () => {
    remote.setup = 'throw';
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    expect([region(container).textContent, errors]).toEqual([
      'Failed to load player: Player could not start',
      [{ code: 'render-failed', widget: 'player', message: 'Failed to load player: Player could not start' }],
    ]);
  });

  it.each(['load-rejects', 'load-throws'] as const)('SEC-10: a loadMedia that fails (%s) with the KS in its message shows fixed text only', async mode => {
    remote.setup = mode;
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    expect(JSON.stringify([container.textContent, errors]).includes(HOST_KS)).toBe(false);
  });

  it.each(['load-rejects', 'load-throws'] as const)('SEC-10: a player that started before the failure (%s) is destroyed', async mode => {
    remote.setup = mode;
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    expect(remote.log).toEqual(['setup', 'loadMedia', 'destroy']);
  });
});

describe('SEC-10: player errors reach the host as fixed text', () => {
  it('SEC-10: a player error is reported as render-failed with fixed text', async () => {
    const { PlayerCore, errors } = await setup();
    await mount(PlayerCore, VALID);
    await remote.ready();
    remote.emit(ERROR_EVENT, { code: 7000, message: '<img src=x onerror=1> remote text' });
    expect(errors).toEqual([{ code: 'render-failed', widget: 'player', message: 'Player error' }]);
  });

  it('SEC-10: the remote error text is neither reported nor shown', async () => {
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    await remote.ready();
    remote.emit(ERROR_EVENT, { message: 'remote text <b>x</b>' });
    expect([JSON.stringify(errors).includes('remote text'), container.textContent?.includes('remote text')]).toEqual([false, false]);
  });

  it('SEC-10: a bundle without Event.ERROR is listened to on "error"', async () => {
    remote.setup = 'no-event-const';
    const { PlayerCore, errors } = await setup();
    await mount(PlayerCore, VALID);
    await remote.ready();
    remote.emit('error');
    expect(errors.length).toBe(1);
  });

  it('SEC-10: an error after unmount is dropped', async () => {
    const { PlayerCore, errors } = await setup();
    const { root } = await mount(PlayerCore, VALID);
    await remote.ready();
    await act(async () => root.unmount());
    remote.emit(ERROR_EVENT);
    expect(errors).toEqual([]);
  });
});

describe('SEC-10: load failures show fixed text and a code', () => {
  it.each([
    ['the script tag fails', { script: 'error' }, 'Player script failed to load', 'load-failed'],
    ['the script defines no player API', { script: 'no-api' }, 'Player API is missing', 'load-failed'],
    ['the script defines no setup', { script: 'no-setup' }, 'Player API is missing', 'load-failed'],
    ['setup returns no player', { setup: 'no-player' }, 'Player could not start', 'render-failed'],
    ['the player has no loadMedia', { setup: 'no-load-media' }, 'Player could not start', 'render-failed'],
    ['the player has no addEventListener', { setup: 'no-add-listener' }, 'Player could not start', 'render-failed'],
  ] as const)('SEC-10: %s', async (_name, mode, text, code) => {
    Object.assign(remote, mode);
    const { PlayerCore, errors } = await setup();
    const { container } = await mount(PlayerCore, VALID);
    expect([region(container).textContent, errors]).toEqual([
      `Failed to load player: ${text}`,
      [{ code, widget: 'player', message: `Failed to load player: ${text}` }],
    ]);
  });

  it('SEC-10: a failed load is not cached, the next player tries again', async () => {
    remote.script = 'error';
    const { PlayerCore } = await setup();
    await mount(PlayerCore, VALID);
    remote.script = 'load';
    const { container } = await mount(PlayerCore, VALID);
    await remote.ready();
    expect([region(container).querySelectorAll('.fake-player-ui').length, remote.urls.length]).toEqual([1, 2]);
  });
});
