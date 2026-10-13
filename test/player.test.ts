// What PlayerCore gives the Kaltura Player bundle: the script URL, the setup config and the loadMedia call.
// The bundle is a fake from test/helpers/player-remote.ts. Security checks: test/security/player.test.tsx.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount } from './helpers/render';
import { playerRemote, loadPlayer, scriptUrl, type PlayerRemote } from './helpers/player-remote';

const BASE_PROPS = {
  partnerId: 1234567,
  uiconfId: 47011143,
  entryId: '1_abc123',
};

let remote: PlayerRemote & { restore: () => void };

beforeEach(() => {
  remote = playerRemote();
});

afterEach(() => {
  remote.restore();
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>) {
  const { PlayerCore } = await loadPlayer();
  const view = await mount(PlayerCore, props);
  await remote.ready();
  return view;
}

describe('PlayerCore script and setup', () => {
  it('loads the bundle of the partner and uiconf from the Kaltura CDN', async () => {
    await render(BASE_PROPS);
    expect(remote.urls).toEqual([scriptUrl(BASE_PROPS.partnerId, BASE_PROPS.uiconfId)]);
  });

  it('sets the player up in its own container with the ids and the header option', async () => {
    const { container } = await render(BASE_PROPS);
    const holder = container.querySelector('[role="region"]')!;
    expect([remote.created[0].config, holder.id]).toEqual([
      {
        targetId: holder.id,
        provider: { partnerId: 1234567, uiConfId: 47011143, useHeaderForKs: true },
        playback: {},
      },
      expect.stringMatching(/^kaltura-player-[0-9a-f-]{36}$/),
    ]);
  });

  it('the player builds its UI inside the container, with no iframe', async () => {
    const { container } = await render(BASE_PROPS);
    expect([container.querySelectorAll('[role="region"] .fake-player-ui').length, container.querySelectorAll('iframe').length]).toEqual([1, 0]);
  });

  it('the container is a labelled region with the aspect ratio of the prop', async () => {
    const { container } = await render({ ...BASE_PROPS, aspectRatio: '4/3' });
    const holder = container.querySelector<HTMLElement>('[role="region"]')!;
    expect([holder.getAttribute('aria-label'), holder.style.aspectRatio]).toEqual(['Kaltura Player v7', '4/3']);
  });

  it('puts the ks prop in the provider config', async () => {
    await render({ ...BASE_PROPS, ks: 'djJ8MTIzNDU2N3w' });
    expect(remote.created[0].config.provider).toEqual({ partnerId: 1234567, uiConfId: 47011143, ks: 'djJ8MTIzNDU2N3w', useHeaderForKs: true });
  });

  it('passes autoplay and muted when they are true', async () => {
    await render({ ...BASE_PROPS, autoplay: true, muted: true });
    expect(remote.created[0].config.playback).toEqual({ autoplay: true, muted: true });
  });

  it('passes false as false', async () => {
    await render({ ...BASE_PROPS, autoplay: false, muted: false });
    expect(remote.created[0].config.playback).toEqual({ autoplay: false, muted: false });
  });

  it('passes only the playback options that are set', async () => {
    await render({ ...BASE_PROPS, muted: true });
    expect(remote.created[0].config.playback).toEqual({ muted: true });
  });
});

describe('PlayerCore loadMedia', () => {
  it('loads the entry with no seek options when none are set', async () => {
    await render(BASE_PROPS);
    expect(remote.created[0].loads).toEqual([{ info: { entryId: '1_abc123' }, options: {} }]);
  });

  it('rounds startTime and clipTo to whole seconds for seekFrom and clipTo', async () => {
    await render({ ...BASE_PROPS, startTime: 12.7, clipTo: 99.3 });
    expect(remote.created[0].loads[0].options).toEqual({ seekFrom: 13, clipTo: 99 });
  });

  it('keeps a startTime of 0', async () => {
    await render({ ...BASE_PROPS, startTime: 0 });
    expect(remote.created[0].loads[0].options).toEqual({ seekFrom: 0 });
  });

  it('shows the entry id and name, and the description without markup', async () => {
    const { container } = await render({ ...BASE_PROPS, entryName: 'Intro', entryDescription: '<b>Hello</b> world' });
    expect([container.querySelector('.player-title')?.textContent, container.querySelector('.player-desc')?.textContent]).toEqual([
      '1_abc123 — Intro',
      'Hello world',
    ]);
  });
});
