import { loadUnisphereModule } from './unisphere-loader';
import { KalturaFailure } from './host-hooks';

/** The Unisphere embeds workspace. Remote code: check every call. */
export interface EmbedsWorkspace {
  apis?: Record<string, unknown>;
  destroy?: () => void;
  // The live loader spells it this way.
  destory?: () => void;
}

interface EmbedsModule {
  embeds?: { workspace?: (config: unknown) => Promise<EmbedsWorkspace> };
}

/** Each call makes a workspace of its own, so several embeds can share a page. Returns null when `isCancelled` turns true before the module arrives. */
export async function createEmbedsWorkspace(
  serverUrl: string,
  isCancelled: () => boolean,
  config: { apis: { name: string; settings: unknown }[]; session: { ks: string; partnerId: number } },
): Promise<EmbedsWorkspace | null> {
  const { embeds } = await loadUnisphereModule<EmbedsModule>(serverUrl);
  if (isCancelled()) return null;
  if (typeof embeds?.workspace !== 'function') throw new KalturaFailure('load-failed', 'Unisphere embeds API is missing');
  // The embeds API takes the account's environment from `env`, not from the host it loaded from. Without it the embed fails on any other stack than nvp1.
  const env = /^https:\/\/unisphere\.([a-z0-9]+)\.ovp\.kaltura\.com(?:\/|$)/.exec(serverUrl)?.[1];
  return embeds.workspace({ ...(env ? { env } : {}), ...config });
}

/** Teardown steps, run newest first. A throwing remote must not break React's unmount. */
export function teardownSteps(): { add: (step: () => void) => void; run: () => void } {
  const steps: Array<() => void> = [];
  return {
    add: step => void steps.push(step),
    run: () =>
      steps.splice(0).reverse().forEach(step => {
        try {
          step();
        } catch {
          // The embed is gone either way.
        }
      }),
  };
}

export const destroyEmbedsWorkspace = (workspace: EmbedsWorkspace): void => void (workspace.destroy ?? workspace.destory)?.call(workspace);
