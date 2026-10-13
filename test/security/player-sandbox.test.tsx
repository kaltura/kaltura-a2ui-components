// Covers: SEC-14, opt-in player sandbox. `setPlayerSandbox` is a host option.
// The default stays no sandbox. Only allowlisted tokens pass, and no prop or
// element config can set it.
import { describe, it, expect, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { mount } from '../helpers/render';
import { setPlayerSandbox, PLAYER_SANDBOX_PRESET } from '../../src/adapters/react/index';
import * as wc from '../../src/adapters/webcomponent/index';
import { PlayerCore } from '../../src/core/player';
import { FlashcardsCore } from '../../src/core/flashcards';

const PLAYER = { partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: 'k' };
const DECK = {
  title: 'Deck',
  cards: [{ title: 'C1', content: 'x', clips: [{ entryId: '1_abc', startTime: 0, endTime: 1 }] }],
  partnerId: 1,
  uiconfId: 2,
  ks: 'k',
};
const PRESET = PLAYER_SANDBOX_PRESET.join(' ');

afterEach(() => {
  setPlayerSandbox(undefined);
  document.body.innerHTML = '';
});

const playerSandbox = async (props: Record<string, unknown> = PLAYER) =>
  (await mount(PlayerCore, props)).container.querySelector('iframe')?.getAttribute('sandbox');

async function clipSandbox(props: Record<string, unknown> = DECK) {
  const { container } = await mount(FlashcardsCore, props);
  await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')?.click());
  const iframe = container.querySelector('iframe.flashcard-clip-player');
  if (!iframe) throw new Error('no clip iframe rendered');
  return iframe.getAttribute('sandbox');
}

describe('SEC-14: setPlayerSandbox', () => {
  it('SEC-14: player iframe has no sandbox by default', async () => {
    expect(await playerSandbox()).toBeNull();
  });

  it('SEC-14: player iframe gets the preset', async () => {
    setPlayerSandbox(PLAYER_SANDBOX_PRESET);
    expect(await playerSandbox()).toBe(PRESET);
  });

  it('SEC-14: flashcards clip iframe gets the preset', async () => {
    setPlayerSandbox(PLAYER_SANDBOX_PRESET);
    expect(await clipSandbox()).toBe(PRESET);
  });

  it('SEC-14: a space-separated string works', async () => {
    setPlayerSandbox('  allow-scripts\nallow-same-origin ');
    expect(await playerSandbox()).toBe('allow-scripts allow-same-origin');
  });

  it('SEC-14: an empty list gives the strictest sandbox', async () => {
    setPlayerSandbox([]);
    expect(await playerSandbox()).toBe('');
  });

  it('SEC-14: undefined removes the sandbox again', async () => {
    setPlayerSandbox(PLAYER_SANDBOX_PRESET);
    setPlayerSandbox(undefined);
    expect(await playerSandbox()).toBeNull();
  });

  it.each(['allow-top-navigation', 'allow-top-navigation-to-custom-protocols', 'allow-everything', 'ALLOW-SCRIPTS'])(
    'SEC-14: rejects %s',
    token => {
      expect(() => setPlayerSandbox(['allow-scripts', token])).toThrow(`Sandbox token not allowed: ${token}`);
    },
  );

  it('SEC-14: a rejected call keeps the previous value', async () => {
    setPlayerSandbox(['allow-scripts']);
    expect(() => setPlayerSandbox('allow-scripts allow-top-navigation')).toThrow();
    expect(await playerSandbox()).toBe('allow-scripts');
  });

  it('SEC-14: the preset has no top navigation token', () => {
    expect(PLAYER_SANDBOX_PRESET.filter(t => t.startsWith('allow-top-navigation'))).toEqual([]);
  });

  it('SEC-14: a mounted player keeps its sandbox; a new one gets the new value', async () => {
    setPlayerSandbox(['allow-scripts']);
    const { container, root } = await mount(PlayerCore, PLAYER);
    setPlayerSandbox(PLAYER_SANDBOX_PRESET);
    await act(async () => root.render(createElement(PlayerCore as never, { ...PLAYER, muted: true } as never)));
    expect([container.querySelector('iframe')?.getAttribute('sandbox'), await playerSandbox()]).toEqual([
      'allow-scripts',
      PRESET,
    ]);
  });

  it('SEC-14: a sandbox prop from the agent is ignored on the player', async () => {
    expect(await playerSandbox({ ...PLAYER, sandbox: 'allow-scripts allow-top-navigation' })).toBeNull();
  });

  it('SEC-14: a sandbox prop from the agent does not replace the host value on the player', async () => {
    setPlayerSandbox(['allow-scripts']);
    expect(await playerSandbox({ ...PLAYER, sandbox: 'allow-scripts allow-top-navigation' })).toBe('allow-scripts');
  });

  it('SEC-14: a sandbox prop from the agent is ignored on the flashcards clip', async () => {
    expect(await clipSandbox({ ...DECK, sandbox: 'allow-scripts allow-top-navigation' })).toBeNull();
  });

  it('SEC-14: web component bundle exposes the same option and preset', () => {
    expect([wc.setPlayerSandbox, wc.PLAYER_SANDBOX_PRESET]).toEqual([setPlayerSandbox, PLAYER_SANDBOX_PRESET]);
  });

  it('SEC-14: kaltura-player element uses the host value, not its config', async () => {
    wc.setPlayerSandbox(PLAYER_SANDBOX_PRESET);
    const el = document.createElement('kaltura-player') as HTMLElement & { config: unknown };
    el.config = { ...PLAYER, sandbox: 'allow-top-navigation' };
    await act(async () => document.body.appendChild(el));
    const sandbox = el.querySelector('iframe')?.getAttribute('sandbox');
    await act(async () => el.remove());
    expect(sandbox).toBe(PRESET);
  });
});
