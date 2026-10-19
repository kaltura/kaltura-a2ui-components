// Fake Unisphere loader for the avatar: `embeds.workspace` and `apis.genieAvatar`.
// Used by test/security/avatar.test.tsx and test/regression/avatar.test.tsx.
import { vi, expect } from 'vitest';

export const SERVER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
export const LOADER_URL = `${SERVER_URL}/loader/index.esm.js`;

export interface AvatarRemote {
  /** Calls in order: workspace, contained, unsubscribe, remove, destroy. */
  log: string[];
  /** Configs given to `embeds.workspace`. */
  configs: Array<{ env?: string; session: Record<string, unknown>; apis: Array<{ name: string; settings: Record<string, unknown> }> }>;
  /** Params given to `contained`. */
  params: Array<{ elementId: string; autoConnect: boolean }>;
  /** Calls the disconnect listeners, as the runtime does when a session ends. */
  disconnect: (data: unknown) => void;
  /** The module the fake loader URL serves. */
  module: Record<string, unknown>;
  /** Waits until `contained` ran. The load chain can outlast the DOM wait in `mount`. */
  mounted: () => Promise<void>;
}

export interface RemoteOptions {
  /** `pending` never settles. A string rejects with that message. */
  workspace?: 'pending' | string;
  /** `missing` leaves `contained` out. A string makes it throw with that message. */
  contained?: 'missing' | string;
  /** The live loader names it `destory`. */
  destroyName?: 'destroy' | 'destory';
  /** Lets a test hold the workspace until it calls the returned function. */
  gate?: Promise<void>;
}

export function avatarRemote(options: RemoteOptions = {}): AvatarRemote {
  const listeners: Array<(data: unknown) => void> = [];
  const remote: AvatarRemote = {
    log: [],
    configs: [],
    params: [],
    disconnect: data => listeners.forEach(listener => listener(data)),
    module: {},
    mounted: () => vi.waitFor(() => expect(remote.log).toContain('contained')),
  };
  const genieAvatar = {
    ...(options.contained === 'missing'
      ? {}
      : {
          contained: (params: AvatarRemote['params'][number]) => {
            if (options.contained !== undefined) throw new Error(options.contained);
            remote.log.push('contained');
            remote.params.push(params);
            return { remove: () => remote.log.push('remove'), setChatPanelOpen() {} };
          },
        }),
    disconnectData: {
      onChanges: (listener: (data: unknown) => void) => {
        listeners.push(listener);
        return () => remote.log.push('unsubscribe');
      },
    },
  };
  remote.module = {
    embeds: {
      workspace: async (config: AvatarRemote['configs'][number]) => {
        remote.log.push('workspace');
        remote.configs.push(config);
        if (options.workspace === 'pending') return new Promise(() => {});
        if (options.workspace !== undefined) throw new Error(options.workspace);
        await options.gate;
        return { apis: { genieAvatar }, [options.destroyName ?? 'destroy']: () => remote.log.push('destroy') };
      },
    },
  };
  return remote;
}

/**
 * Serves `module` at the loader URL and imports a fresh avatar core. The host
 * functions come from the same fresh module graph, so they reach that core.
 */
export async function loadAvatar(module: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock(LOADER_URL, () => module);
  // One at a time: vitest can miss a mock when two imports of it run at once.
  const loader = await import('../../src/core/unisphere-loader');
  const ks = await import('../../src/core/ks');
  const hooks = await import('../../src/core/host-hooks');
  const { AvatarCore } = await import('../../src/core/avatar');
  return {
    AvatarCore,
    setKsProvider: ks.setKsProvider,
    setEventHandler: hooks.setEventHandler,
    setErrorHandler: hooks.setErrorHandler,
    setExtraAllowedOrigins: loader.setExtraAllowedOrigins,
  };
}
