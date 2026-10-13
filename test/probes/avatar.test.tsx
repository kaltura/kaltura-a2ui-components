// Covers: QA-04 (avatar lifecycle: StrictMode, many instances, unmount races).
// The avatar runs on the Unisphere embeds API: one workspace and one contained
// embed per mount, removed and destroyed on unmount.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode, createElement, act } from 'react';
import { mount } from '../helpers/render';
import { avatarRemote, loadAvatar, SERVER_URL, type RemoteOptions } from '../helpers/avatar-remote';

const VALID = { partnerId: 1, serverUrl: SERVER_URL };

// vitest fails the second of two parallel imports of a mocked URL, and
// StrictMode runs the effect twice. So this file serves the fake module
// without import(). The allowlist check still runs. The real import() is
// covered in test/security/avatar.test.tsx and e2e/avatar.spec.ts.
const served = vi.hoisted(() => ({ module: {} as unknown }));
vi.mock('../../src/core/unisphere-loader', async (original: () => Promise<typeof import('../../src/core/unisphere-loader')>) => {
  const real = await original();
  return { ...real, loadUnisphereModule: async (url: string) => (real.deriveLoaderUrl(url), served.module) };
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

async function setup(options?: RemoteOptions) {
  const remote = avatarRemote(options);
  served.module = remote.module;
  const api = await loadAvatar(remote.module);
  api.setKsProvider(() => 'ks-1');
  return { remote, ...api };
}

const settle = () => act(async () => new Promise(r => setTimeout(r, 30)));

describe('QA-04: one embed per mount', () => {
  it('QA-04: StrictMode makes one workspace and one embed', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(StrictMode, { children: createElement(AvatarCore, VALID) });
    await remote.mounted();
    expect(remote.log).toEqual(['workspace', 'contained']);
  });

  it('QA-04: the embed mounts into the container by its own unique id', async () => {
    const { remote, AvatarCore } = await setup();
    const first = await mount(AvatarCore, VALID);
    await remote.mounted();
    const second = await mount(AvatarCore, VALID);
    await vi.waitFor(() => expect(remote.params).toHaveLength(2));
    const ids = [first, second].map(({ container }) => container.querySelector('.kaltura-avatar-container')?.id);
    expect([remote.params.map(p => p.elementId), ids[0] !== ids[1], ids[0]?.startsWith('kaltura-avatar-')]).toEqual([ids, true, true]);
  });

  it('QA-04: a prop change removes the old embed and makes a new one', async () => {
    const { remote, AvatarCore } = await setup();
    const { root } = await mount(AvatarCore, VALID);
    await remote.mounted();
    await act(async () => root.render(createElement(AvatarCore, { ...VALID, openingPhrase: 'Hello' })));
    await vi.waitFor(() => expect(remote.log).toEqual(['workspace', 'contained', 'unsubscribe', 'remove', 'destroy', 'workspace', 'contained']));
  });
});

describe('QA-04: unmount cleans up', () => {
  it('QA-04: unmount unsubscribes, removes the embed, destroys the workspace and empties the container', async () => {
    const { remote, AvatarCore } = await setup();
    const { container, root } = await mount(AvatarCore, VALID);
    await remote.mounted();
    const box = container.querySelector('.kaltura-avatar-container')!;
    box.append(document.createElement('canvas'));
    await act(async () => root.unmount());
    expect([remote.log, box.childElementCount]).toEqual([['workspace', 'contained', 'unsubscribe', 'remove', 'destroy'], 0]);
  });

  it('QA-04: the live loader name `destory` is called when there is no `destroy`', async () => {
    const { remote, AvatarCore } = await setup({ destroyName: 'destory' });
    const { root } = await mount(AvatarCore, VALID);
    await remote.mounted();
    await act(async () => root.unmount());
    expect(remote.log.at(-1)).toBe('destroy');
  });

  it('QA-04: unmount while the workspace loads destroys it when it arrives and never mounts the embed', async () => {
    let open = () => {};
    const gate = new Promise<void>(resolve => (open = resolve));
    const { remote, AvatarCore } = await setup({ gate });
    const { root } = await mount(AvatarCore, VALID);
    await vi.waitFor(() => expect(remote.log).toEqual(['workspace']));
    await act(async () => root.unmount());
    open();
    await vi.waitFor(() => expect(remote.log).toEqual(['workspace', 'destroy']));
  });

  it('QA-04: unmount before the loader arrives never creates a workspace', async () => {
    const remote = avatarRemote();
    let open = () => {};
    const gate = new Promise<void>(resolve => (open = resolve));
    served.module = gate.then(() => remote.module);
    const { AvatarCore, setKsProvider } = await loadAvatar(remote.module);
    setKsProvider(() => 'ks-1');
    const { root } = await mount(AvatarCore, VALID);
    await act(async () => root.unmount());
    open();
    await settle();
    expect(remote.log).toEqual([]);
  });

  it('QA-04: a throwing remove or destroy does not break unmount', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const remote = avatarRemote();
    const { embeds } = remote.module as { embeds: { workspace: (c: never) => Promise<Record<string, unknown>> } };
    const broken = {
      embeds: {
        workspace: async (config: never) => {
          const ws = (await embeds.workspace(config)) as { apis: { genieAvatar: { contained: (p: never) => unknown } } };
          const contained = ws.apis.genieAvatar.contained;
          ws.apis.genieAvatar.contained = p => ({ ...(contained(p) as object), remove: () => { throw new Error('remove'); } });
          return { ...ws, destroy: () => { throw new Error('destroy'); } };
        },
      },
    };
    served.module = broken;
    const { AvatarCore, setKsProvider } = await loadAvatar(broken);
    setKsProvider(() => 'ks-1');
    const { container, root } = await mount(AvatarCore, VALID);
    await remote.mounted();
    await act(async () => root.unmount());
    expect([container.innerHTML, errors.mock.calls.length]).toEqual(['', 0]);
  });
});

describe('QA-04: props map to the embed', () => {
  it('QA-04: autoConnect, openingPhrase, captions and theme', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, { ...VALID, autoConnect: true, openingPhrase: 'Hi', captions: true, theme: 'studio' });
    await remote.mounted();
    expect([remote.configs[0]?.apis, remote.params[0]?.autoConnect]).toEqual([
      [{ name: 'genieAvatar', settings: { openingPhrase: 'Hi', captions: { enable: true }, theme: { type: 'studio' } } }],
      true,
    ]);
  });

  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    [null, 'dark'],
  ])('QA-04: data-theme %s gives theme %s', async (attribute, type) => {
    if (attribute) document.documentElement.setAttribute('data-theme', attribute);
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, VALID);
    await remote.mounted();
    expect(remote.configs[0]?.apis[0]?.settings.theme).toEqual({ type });
  });

  it('QA-04: the region of serverUrl goes to the workspace as env', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, VALID);
    await remote.mounted();
    expect(remote.configs[0]?.env).toBe('nvp1');
  });

  it('QA-04: a host-added origin sends no env', async () => {
    const remote = avatarRemote();
    served.module = remote.module;
    const { AvatarCore, setKsProvider, setExtraAllowedOrigins } = await loadAvatar(remote.module);
    setExtraAllowedOrigins(['https://unisphere.example.com']);
    setKsProvider(() => 'ks-1');
    await mount(AvatarCore, { ...VALID, serverUrl: 'https://unisphere.example.com/v1' });
    await remote.mounted();
    expect([remote.log, 'env' in (remote.configs[0] ?? {})]).toEqual([['workspace', 'contained'], false]);
  });
});

describe('QA-04: disconnect events', () => {
  it.each([
    ['ConversationEnded', 'ConversationEnded'],
    ['<b>x</b>', 'UnknownReason'],
    [42, 'UnknownReason'],
  ])('QA-04: reason %j reaches the host as %s', async (reason, expected) => {
    const { remote, AvatarCore, setEventHandler } = await setup();
    const events = vi.fn();
    setEventHandler(events);
    const { container } = await mount(AvatarCore, VALID);
    await remote.mounted();
    remote.disconnect({ reason, error: new Error('remote text') });
    const instanceId = container.querySelector('.kaltura-avatar-container')?.id;
    expect(events.mock.calls).toEqual([[{ type: 'avatar-disconnected', widget: 'avatar', detail: { reason: expected, instanceId } }]]);
  });

  it('QA-04: null disconnect data sends no event', async () => {
    const { remote, AvatarCore, setEventHandler } = await setup();
    const events = vi.fn();
    setEventHandler(events);
    await mount(AvatarCore, VALID);
    await remote.mounted();
    remote.disconnect(null);
    expect(events).not.toHaveBeenCalled();
  });
});
