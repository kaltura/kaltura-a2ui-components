// Covers: SEC-05 (on the A2UI path the host provider is the only KS source).
// The renderer passes props the schema does not list through to the component, so a `ks` in
// agent output must stop in the A2UI adapter, whatever the widget.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { playerRemote } from '../helpers/player-remote';
import { captionsRemote } from '../helpers/captions-remote';
import { recorderRemote } from '../helpers/recorder-remote';
import { renderSurface } from './surface-helper';
import { setKsProvider } from '../../src/core/ks';
import { kalturaReactCatalog } from '../../src/adapters/react/index';

const SERVER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
const seen = vi.hoisted(() => ({ configs: [] as unknown[] }));

vi.mock('https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js', () => ({
  loader: async (config: unknown) => {
    seen.configs.push(config);
    return { kill() {} };
  },
  createWorkspace: async (config: unknown) => {
    seen.configs.push(config);
    return new Promise(() => {});
  },
  embeds: {
    workspace: async (config: unknown) => {
      seen.configs.push(config);
      return new Promise(() => {});
    },
  },
}));

// Each fake script patches `document.head.append`, so install only the one a widget needs.
const none = { created: [] as unknown[], restore() {} };
let remotes: { player: ReturnType<typeof playerRemote> | typeof none; captions: ReturnType<typeof captionsRemote> | typeof none; recorder: ReturnType<typeof recorderRemote> | typeof none };

function install(component: string) {
  remotes = {
    player: component === 'KalturaPlayer' || component === 'KalturaFlashcards' ? playerRemote() : none,
    captions: component === 'KalturaCaptionsEditor' ? captionsRemote() : none,
    recorder: component === 'KalturaRecorder' ? recorderRemote() : none,
  };
}

beforeEach(() => {
  remotes = { player: none, captions: none, recorder: none };
});

afterEach(() => {
  Object.values(remotes).forEach(remote => remote.restore());
  setKsProvider(undefined);
  document.body.innerHTML = '';
  seen.configs = [];
  vi.restoreAllMocks();
});

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const AGENT_KS = 'agent-written-ks';
const unisphere = { partnerId: 1, serverUrl: SERVER_URL, uiconfId: 2, entryId: '0_abc' };
const CARDS = [{ title: 'C', content: 'x', clips: [{ entryId: '1_abc', startTime: 0, endTime: 1 }] }];

const WIDGETS: Array<[string, Record<string, unknown>]> = [
  ['KalturaPlayer', { partnerId: 1, uiconfId: 2, entryId: '0_abc' }],
  ['KalturaFlashcards', { title: 'Deck', partnerId: 1, uiconfId: 2, cards: CARDS }],
  ['KalturaCaptionsEditor', { partnerId: 1, entryId: '0_abc' }],
  ['KalturaRecorder', { partnerId: 1, uiconfId: 2 }],
  ['KalturaAnalytics', { partnerId: 1 }],
  ['KalturaMediaManager', unisphere],
  ['KalturaGenie', unisphere],
  ['KalturaContentLab', unisphere],
  ['KalturaAgentsWidget', unisphere],
  ['KalturaVodAvatar', unisphere],
  ['KalturaAvatar', unisphere],
];

/** Everything a widget could pass the KS to: the remote scripts, the Unisphere configs and the page. */
async function sinks(host: HTMLElement, hasKs: boolean): Promise<string> {
  const button = host.querySelector<HTMLButtonElement>('.flashcard-action-btn');
  if (button) await act(async () => button.click());
  if (remotes.player !== none) await (remotes.player as ReturnType<typeof playerRemote>).ready();
  if (hasKs && remotes.recorder !== none) await (remotes.recorder as ReturnType<typeof recorderRemote>).ready();
  await act(async () => {
    await new Promise(r => setTimeout(r, 30));
  });
  return JSON.stringify([remotes.player.created, remotes.recorder.created, seen.configs]) + document.body.innerHTML;
}

describe('SEC-05: a ks prop in agent output is ignored', () => {
  it.each(WIDGETS)('SEC-05: %s ignores a ks prop when there is no provider', async (component, props) => {
    install(component);
    const { host } = await renderSurface(kalturaReactCatalog, [{ id: 'root', component, ...props, ks: AGENT_KS }]);
    expect((await sinks(host, false)).includes(AGENT_KS)).toBe(false);
  });

  it.each(WIDGETS)('SEC-05: %s ignores a ks prop when the provider returns nothing', async (component, props) => {
    install(component);
    setKsProvider(() => undefined);
    const { host } = await renderSurface(kalturaReactCatalog, [{ id: 'root', component, ...props, ks: AGENT_KS }]);
    expect((await sinks(host, false)).includes(AGENT_KS)).toBe(false);
  });

  it.each(WIDGETS)('SEC-05: %s uses the provider KS and not the ks prop', async (component, props) => {
    install(component);
    setKsProvider(() => HOST_KS);
    const { host } = await renderSurface(kalturaReactCatalog, [{ id: 'root', component, ...props, ks: AGENT_KS }]);
    const found = await sinks(host, true);
    // Analytics sends its KS by postMessage, so it never shows in a sink.
    expect([component === 'KalturaAnalytics' || found.includes(HOST_KS), found.includes(AGENT_KS)]).toEqual([true, false]);
  });
});
