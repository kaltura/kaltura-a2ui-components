// Covers: QA-01 / SEC-17 (web components ignore late `config`, never unmount).
// Turns green: plan item 2.1 (defineKalturaElement helper).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { playerRemote } from '../helpers/player-remote';

type KalturaElement = HTMLElement & { config: Record<string, unknown> };

const create = (tag: string) => document.createElement(tag) as KalturaElement;
const settle = () => act(async () => {});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('QA-01: web component lifecycle', () => {
  it('QA-01: config set after the element is connected still renders', async () => {
    const player = playerRemote();
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-player');
    document.body.appendChild(el);
    await settle();
    el.config = { partnerId: 123, uiconfId: 456, entryId: '1_abc' };
    await settle();
    await player.ready();
    player.restore();
    expect(player.created.map(created => created.config.provider.partnerId)).toEqual([123]);
  });

  it('QA-01: removing the element unmounts its React root', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = { title: 't', cards: [{ title: 'a', content: 'b' }] };
    document.body.appendChild(el);
    await settle();
    expect(el.childElementCount).toBeGreaterThan(0);
    el.remove();
    await settle();
    expect(el.childElementCount).toBe(0);
  });

  it('QA-01: re-attaching an element does not log React errors', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = { title: 't', cards: [{ title: 'a', content: 'b' }] };
    document.body.appendChild(el);
    await settle();
    el.remove();
    await settle();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.appendChild(el);
    await settle();
    const calls = spy.mock.calls.length;
    spy.mockRestore();
    expect(calls).toBe(0);
  });
});
