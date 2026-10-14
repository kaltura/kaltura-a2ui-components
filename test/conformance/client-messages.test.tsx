// Covers: CONF-18. What the host sends back to the agent is valid A2UI v0.9 client-to-server JSON:
// toClientError for every error code, and one captured action for every kind of event.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import type { ActionPayload } from '@a2ui/web_core/v0_9';
import { newAjv, readJson, SCHEMAS_V0_9 } from './helpers';
import { URL_A, loaderUrl, fakeWorkspaceModule, type MountedVisual } from '../lifecycle/harness';
import { recorderRemote, type RecorderRemote } from '../helpers/recorder-remote';
import { avatarRemote, LOADER_URL as AVATAR_LOADER_URL } from '../helpers/avatar-remote';
import type { KalturaErrorCode } from '../../src/core/host-hooks';

const validate = newAjv(false).compile(readJson(`${SCHEMAS_V0_9}/client_to_server.json`));
const ACTION = { event: { name: 'kalturaFeedback', context: { note: 'from the agent' } } };

// Typed as a record, so a new code in `KalturaErrorCode` fails the compile here until it is listed.
const CODES: Record<KalturaErrorCode, true> = {
  'invalid-props': true,
  'invalid-ks': true,
  'origin-not-allowed': true,
  'load-failed': true,
  'url-rejected': true,
  'render-failed': true,
};

describe('CONF-18: toClientError output matches the client_to_server schema', () => {
  it.each(Object.keys(CODES) as KalturaErrorCode[])('CONF-18: code %s', async code => {
    const { toClientError } = await import('../../src/core/host-hooks');
    const message = toClientError({ code, widget: 'player', message: 'text', surfaceId: 's' });
    expect([validate(message), validate.errors]).toEqual([true, null]);
  });

  it('CONF-18: a message with invalidProps', async () => {
    const { toClientError } = await import('../../src/core/host-hooks');
    const message = toClientError({ code: 'invalid-props', widget: 'chart', message: 'text', invalidProps: ['chartType', 'data'] }, 's');
    expect([validate(message), message.error.message]).toEqual([true, 'Kaltura chart error: invalid-props (chartType, data)']);
  });

  it('CONF-18: the schema rejects a message with no surfaceId, so the check can fail', async () => {
    const { toClientError } = await import('../../src/core/host-hooks');
    const { surfaceId: _surfaceId, ...error } = toClientError({ code: 'invalid-props', widget: 'player', message: '' }, 's').error;
    expect(validate({ version: 'v0.9', error })).toBe(false);
  });
});

describe('CONF-18: a captured action matches the client_to_server schema', () => {
  let actions: ActionPayload[];
  let remote: RecorderRemote & { restore: () => void };

  beforeEach(() => {
    vi.resetModules();
    actions = [];
    remote = recorderRemote();
  });
  afterEach(() => {
    remote.restore();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function surface(components: Array<Record<string, unknown>>) {
    const adapter = await import('../../src/adapters/react/index');
    const { renderSurface } = await import('../security/surface-helper');
    adapter.setKsProvider(() => 'host-ks');
    await renderSurface(adapter.buildKalturaCatalog(), components, undefined, { onAction: action => void actions.push(action) });
  }

  const check = () => expect(actions.map(action => [validate({ version: 'v0.9', action }), validate.errors])).toEqual([[true, null]]);

  it('CONF-18: error', async () => {
    await surface([{ id: 'root', component: 'KalturaPlayer', partnerId: 1, uiconfId: 2, entryId: 'bad id', action: ACTION }]);
    check();
  });

  it('CONF-18: recorder-upload-ended', async () => {
    await surface([{ id: 'root', component: 'KalturaRecorder', partnerId: 1, uiconfId: 2, action: ACTION }]);
    await remote.ready();
    act(() => remote.emit('mediaUploadEnded', { entryId: '0_abc123' }));
    check();
  });

  it('CONF-18: entry-selected', async () => {
    const visuals: MountedVisual[] = [];
    vi.doMock(loaderUrl(URL_A), () => fakeWorkspaceModule({ log: [], configs: [], visuals }));
    await surface([{ id: 'root', component: 'KalturaMediaManager', partnerId: 1, serverUrl: URL_A, action: ACTION }]);
    await vi.waitFor(() => expect(visuals).toHaveLength(1));
    const { buttons } = (visuals[0].settings.context as { rowActions: { buttons: { onClick(r: unknown): void }[] } }).rowActions;
    act(() => buttons[0].onClick({ id: '0_abc123', name: 'Intro' }));
    check();
  });

  it('CONF-18: avatar-disconnected', async () => {
    const avatar = avatarRemote();
    vi.doMock(AVATAR_LOADER_URL, () => avatar.module);
    await surface([{ id: 'root', component: 'KalturaAvatar', partnerId: 1, action: ACTION }]);
    await avatar.mounted();
    act(() => avatar.disconnect({ reason: 'ConversationEnded' }));
    check();
  });
});
