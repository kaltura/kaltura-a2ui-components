// Fake Kaltura Player bundle: `window.KalturaPlayer.setup`, like the embedPlaykitJs script.
// jsdom fetches no scripts, so the helper fires the script tag's load or error event itself.
// Used by the tests that mount a player or a flashcards clip.
import { vi } from 'vitest';
import type { PlayerApi, PlayerHandle, PlayerSetupConfig } from '../../src/core/player-script';

/** The bundle URL for the default (US) region. */
export const scriptUrl = (partnerId: number, uiconfId: number) =>
  `https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/partner_id/${partnerId}/uiconf_id/${uiconfId}`;

/** The name of the event the fake player uses for errors (`player.Event.ERROR`). */
export const ERROR_EVENT = 'fake-player-error';

export interface PlayerRemote {
  /** Calls in order: setup, loadMedia, destroy. */
  log: string[];
  /** Config and `loadMedia` calls of every `setup`. */
  created: Array<{ config: PlayerSetupConfig; loads: Array<{ info: unknown; options: unknown }> }>;
  /** What the script tag does once it is in the page. `hold` never finishes. `no-api` and `no-setup` define no usable API. */
  script: 'load' | 'error' | 'hold' | 'no-api' | 'no-setup';
  /**
   * What `setup` and the handle do. `throw`: setup throws with the KS in its message.
   * `no-player`: setup returns nothing. `no-load-media`: the handle has no `loadMedia`. `no-load-playlist`: no `loadPlaylist`.
   * `no-add-listener`: the handle has no `addEventListener`. `no-event-const`: the handle has no `Event.ERROR`.
   * `destroy-throws`: `destroy` throws. `load-rejects` and `load-throws`: `loadMedia` fails with the KS in its message.
   */
  setup:
    | 'ok'
    | 'throw'
    | 'no-player'
    | 'no-load-media'
    | 'no-load-playlist'
    | 'no-add-listener'
    | 'no-event-const'
    | 'destroy-throws'
    | 'load-rejects'
    | 'load-throws';
  /** Script tags for the player that are still in the page. The loader removes a tag when it finishes. */
  tags: () => HTMLScriptElement[];
  /** Every script URL that was added, also of the tags removed since. */
  urls: string[];
  /** The markup of every script tag at the moment it was added. */
  html: string[];
  /** Calls the listeners of the latest player, as the bundle does. */
  emit: (type: string, detail?: unknown) => void;
  /** Waits until `count` players exist. The load chain can outlast the DOM wait in `mount`. */
  ready: (count?: number) => Promise<void>;
  /** Defines `window.KalturaPlayer`, as a bundle does when it runs. */
  install: () => void;
}

// One API object for the whole test file. A loader cache can keep it from an earlier test,
// so it always talks to the remote of the running test.
let active: (PlayerRemote & { listeners: Record<string, Array<(event: unknown) => void>> }) | undefined;

const api: PlayerApi = {
  setup(config) {
    const remote = active;
    if (!remote) throw new Error('no player remote');
    remote.log.push('setup');
    const entry = { config, loads: [] as Array<{ info: unknown; options: unknown }> };
    remote.created.push(entry);
    if (remote.setup === 'throw') throw new Error(`cannot find element with id '${config.targetId}' ${String(config.provider.ks)}`);
    if (remote.setup === 'no-player') return undefined;
    const ui = document.createElement('div');
    ui.className = 'fake-player-ui';
    document.getElementById(config.targetId)?.append(ui);
    const handle: PlayerHandle = {
      destroy: () => {
        remote.log.push('destroy');
        if (remote.setup === 'destroy-throws') throw new Error('destroy failed');
      },
      ...(remote.setup === 'no-event-const' ? {} : { Event: { ERROR: ERROR_EVENT } }),
      ...(remote.setup === 'no-add-listener'
        ? {}
        : {
            addEventListener: (type: string, listener: (event: unknown) => void) => {
              (remote.listeners[type] ??= []).push(listener);
            },
          }),
      ...(remote.setup === 'no-load-playlist'
        ? {}
        : {
            loadPlaylist: (info: { playlistId: string }) => {
              remote.log.push('loadPlaylist');
              entry.loads.push({ info, options: undefined });
              return Promise.resolve({});
            },
          }),
      ...(remote.setup === 'no-load-media'
        ? {}
        : {
            loadMedia: (info: { entryId: string }, options?: { seekFrom?: number; clipTo?: number }) => {
              remote.log.push('loadMedia');
              entry.loads.push({ info, options });
              if (remote.setup === 'load-throws') throw new Error(`load failed ${String(config.provider.ks)}`);
              if (remote.setup === 'load-rejects') return Promise.reject(new Error(`load failed ${String(config.provider.ks)}`));
              return Promise.resolve({});
            },
          }),
    };
    return handle;
  },
};

/** Installs the fake script API on `window`. Call `restore` in `afterEach`. */
export function playerRemote(): PlayerRemote & { restore: () => void } {
  const append = document.head.append.bind(document.head);
  const remote = {
    log: [],
    created: [],
    script: 'load',
    setup: 'ok',
    urls: [],
    html: [],
    listeners: {},
    tags: () => [...document.querySelectorAll<HTMLScriptElement>('script[src*="embedPlaykitJs"]')],
    emit: (type: string, detail?: unknown) => (remote.listeners[type] ?? []).forEach(listener => listener({ type, detail })),
    ready: async (count = 1) => {
      await vi.waitFor(() => {
        if (remote.created.length < count) throw new Error('player not created yet');
      });
    },
    install: () => {
      (window as { KalturaPlayer?: unknown }).KalturaPlayer = api;
    },
    restore: () => {
      spy.mockRestore();
      active = undefined;
      delete (window as { KalturaPlayer?: unknown }).KalturaPlayer;
    },
  } as PlayerRemote & { listeners: Record<string, Array<(event: unknown) => void>>; restore: () => void };
  active = remote;
  const spy = vi.spyOn(document.head, 'append').mockImplementation((...nodes: Array<Node | string>) => {
    append(...nodes);
    for (const node of nodes) {
      if (!(node instanceof HTMLScriptElement) || !node.src.includes('embedPlaykitJs')) continue;
      remote.urls.push(node.src);
      remote.html.push(node.outerHTML);
      if (remote.script === 'hold') continue;
      if (remote.script === 'load') remote.install();
      else if (remote.script === 'no-setup') (window as { KalturaPlayer?: unknown }).KalturaPlayer = {};
      else delete (window as { KalturaPlayer?: unknown }).KalturaPlayer;
      queueMicrotask(() => node.dispatchEvent(new Event(remote.script === 'error' ? 'error' : 'load')));
    }
  });
  return remote;
}

/**
 * Imports a fresh player core and loader (a new script cache). The host
 * functions come from the same fresh module graph, so they reach that core.
 */
export async function loadPlayer() {
  vi.resetModules();
  // One at a time: vitest can miss a module when two imports run at once.
  const ks = await import('../../src/core/ks');
  const hooks = await import('../../src/core/host-hooks');
  const region = await import('../../src/core/region');
  const script = await import('../../src/core/player-script');
  const { PlayerCore, PlayerEmbed } = await import('../../src/core/player');
  const { FlashcardsCore } = await import('../../src/core/flashcards');
  return {
    PlayerCore,
    PlayerEmbed,
    FlashcardsCore,
    loadPlayerScript: script.loadPlayerScript,
    playerScriptUrl: script.playerScriptUrl,
    setKsProvider: ks.setKsProvider,
    setErrorHandler: hooks.setErrorHandler,
    setRegion: region.setRegion,
  };
}
