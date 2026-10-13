// Covers: SEC-08 (the avatar loaded a `latest` SDK script with no SRI hash).
// The avatar now loads through the allowlisted Unisphere loader and the
// embeds API. There is no script tag, the KS comes from the host provider
// only, and errors are fixed text.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, findUnsafe, PAYLOAD } from '../helpers/render';
import { avatarRemote, loadAvatar, SERVER_URL } from '../helpers/avatar-remote';

const HOST_KS = 'djJ8MTIzfHVzZXIta3MtZnJvbS1ob3N0';
const AGENT_KS = 'agent-written-ks';
const VALID = { partnerId: 1, serverUrl: SERVER_URL };

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function setup(module?: Record<string, unknown>) {
  const remote = avatarRemote();
  const api = await loadAvatar(module ?? remote.module);
  api.setKsProvider(() => HOST_KS);
  return { remote, ...api };
}

describe('SEC-08: the avatar loads only through the allowlisted Unisphere loader', () => {
  it('SEC-08: a valid avatar uses the embeds API and adds no script tag', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, VALID);
    await remote.mounted();
    expect([remote.log, document.querySelectorAll('script').length]).toEqual([['workspace', 'contained'], 0]);
  });

  it.each(['https://evil.example/v1', 'https://static.avatar.us.kaltura.ai/web-sdk/latest/index.js', 'javascript:alert(1)'])(
    'SEC-08: serverUrl %s is refused before any load',
    async serverUrl => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { remote, AvatarCore } = await setup();
      const { container } = await mount(AvatarCore, { ...VALID, serverUrl });
      expect([container.textContent, remote.log]).toEqual(['Failed to load Kaltura Avatar: serverUrl is not an allowed Unisphere origin', []]);
    },
  );

  it('SEC-08: no source file loads the old avatar SDK', () => {
    const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter(file => /\.(ts|tsx)$/.test(file));
    const legacy = files.filter(file => /static\.avatar|KalturaAvatar\.create|loadScriptOnce/.test(readFileSync(join('src', file), 'utf8')));
    expect(legacy).toEqual([]);
  });
});

describe('SEC-08: the KS comes from the host provider only', () => {
  it('SEC-08: the provider KS goes into the workspace session', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, VALID);
    await remote.mounted();
    expect(remote.configs[0]?.session).toEqual({ ks: HOST_KS, partnerId: 1 });
  });

  it('SEC-08: the provider is asked for the avatar KS', async () => {
    const remote = avatarRemote();
    const { AvatarCore, setKsProvider } = await loadAvatar(remote.module);
    const provider = vi.fn((_widget: string) => HOST_KS);
    setKsProvider(provider);
    await mount(AvatarCore, VALID);
    await remote.mounted();
    expect(provider.mock.calls).toEqual([['avatar']]);
  });

  it('SEC-08: with no provider a ks prop is ignored and nothing loads', async () => {
    const remote = avatarRemote();
    const { AvatarCore } = await loadAvatar(remote.module);
    const { container } = await mount(AvatarCore, { ...VALID, ks: AGENT_KS });
    expect([container.innerHTML, remote.log]).toEqual(['', []]);
  });

  it('SEC-08: a ks prop never reaches the embed when a provider is set', async () => {
    const { remote, AvatarCore } = await setup();
    await mount(AvatarCore, { ...VALID, ks: AGENT_KS });
    await remote.mounted();
    expect(JSON.stringify(remote.configs).includes(AGENT_KS)).toBe(false);
  });

  it('SEC-08: a bad provider KS shows the plain-text error and loads nothing', async () => {
    const remote = avatarRemote();
    const { AvatarCore, setKsProvider } = await loadAvatar(remote.module);
    setKsProvider(() => 'bad\u0000ks');
    const { container } = await mount(AvatarCore, VALID);
    expect([container.textContent, remote.log]).toEqual(['Failed to load Kaltura Avatar: Invalid ks', []]);
  });
});

describe('SEC-08: a missing or broken remote API is load-failed', () => {
  it.each([
    ['no embeds export', { embeds: undefined }],
    ['no workspace function', { embeds: {} }],
    ['a workspace that is not a function', { embeds: { workspace: 'x' } }],
  ])('SEC-08: %s', async (_name, module) => {
    const { AvatarCore, setErrorHandler } = await setup(module);
    const errors = vi.fn();
    setErrorHandler(errors);
    const { container } = await mount(AvatarCore, VALID);
    expect([container.textContent, errors.mock.calls.map(([e]) => e.code)]).toEqual(['Failed to load Kaltura Avatar: Unisphere embeds API is missing', ['load-failed']]);
  });

  it('SEC-08: a workspace with no genieAvatar.contained is destroyed and shows load-failed', async () => {
    const remote = avatarRemote({ contained: 'missing' });
    const { AvatarCore, setKsProvider } = await loadAvatar(remote.module);
    setKsProvider(() => HOST_KS);
    const { container } = await mount(AvatarCore, VALID);
    expect([container.textContent, remote.log]).toEqual(['Failed to load Kaltura Avatar: Avatar embed is missing', ['workspace', 'destroy']]);
  });
});

describe('SEC-08: remote error text never reaches the page, the console or the host', () => {
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const hostile = `${PAYLOAD} ${HOST_KS}`;

  it.each([
    ['workspace rejects', { workspace: hostile }],
    ['contained throws', { contained: hostile }],
  ])('SEC-08: %s', async (_name, options) => {
    const spies = methods.map(m => vi.spyOn(console, m).mockImplementation(() => {}));
    const remote = avatarRemote(options);
    const { AvatarCore, setKsProvider, setErrorHandler } = await loadAvatar(remote.module);
    setKsProvider(() => HOST_KS);
    const errors = vi.fn();
    setErrorHandler(errors);
    const { container } = await mount(AvatarCore, VALID);
    const leaked = JSON.stringify([document.body.innerHTML, spies.flatMap(s => s.mock.calls), errors.mock.calls]);
    expect([container.textContent, leaked.includes(HOST_KS), leaked.includes('onerror')]).toEqual(['Failed to load Kaltura Avatar: Avatar could not start', false, false]);
  });
});

describe('SEC-08: hostile props', () => {
  it.each([
    ['partnerId', { partnerId: -1 }],
    ['serverUrl', { serverUrl: `${SERVER_URL}/${'a'.repeat(2048)}` }],
    ['openingPhrase', { openingPhrase: 'a'.repeat(501) }],
    ['openingPhrase', { openingPhrase: 5 }],
    ['theme', { theme: 'custom' }],
    ['theme', { theme: PAYLOAD }],
    ['captions', { captions: PAYLOAD }],
    ['autoConnect', { autoConnect: 'true' }],
  ])('SEC-08: a bad %s shows the plain-text error and loads nothing', async (name, props) => {
    const { remote, AvatarCore } = await setup();
    const { container } = await mount(AvatarCore, { ...VALID, ...props });
    expect([container.textContent, findUnsafe(container), remote.log]).toEqual([`Failed to load Kaltura Avatar: Invalid ${name}`, [], []]);
  });

  it('SEC-08: props outside the schema never reach the embed', async () => {
    const { remote, AvatarCore } = await setup();
    const extra = { customTheme: { a: PAYLOAD }, _serverWebsocketEvents: true, stageMode: 'full-screen', widgetId: 'w', avatarId: 'a' };
    await mount(AvatarCore, { ...VALID, ...extra });
    await remote.mounted();
    expect([remote.configs[0]?.apis, remote.params[0]?.autoConnect, Object.keys(remote.configs[0] ?? {})]).toEqual([
      [{ name: 'genieAvatar', settings: { theme: { type: 'dark' } } }],
      false,
      ['env', 'session', 'apis'],
    ]);
  });

  it('SEC-08: a hostile opening phrase reaches the embed as data and the page stays inert', async () => {
    const { remote, AvatarCore } = await setup();
    const { container } = await mount(AvatarCore, { ...VALID, openingPhrase: PAYLOAD });
    await remote.mounted();
    expect([remote.configs[0]?.apis[0]?.settings.openingPhrase, findUnsafe(container)]).toEqual([PAYLOAD, []]);
  });
});
