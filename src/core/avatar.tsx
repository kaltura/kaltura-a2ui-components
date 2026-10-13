import { createElement, useContext, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { z } from 'zod';
import { loadUnisphereModule } from './unisphere-loader';
import { renderLoadError } from './render-load-error';
import { KalturaFailure, emitEvent, ReporterContext } from './host-hooks';
import { regionOf } from './region';
import { KalturaAvatarApi } from '../schemas/avatar';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';

export interface AvatarCoreProps {
  partnerId: number;
  serverUrl: string;
  autoConnect?: boolean;
  openingPhrase?: string;
  captions?: boolean;
  theme?: 'light' | 'dark' | 'studio';
}

const LABEL = 'Kaltura Avatar';

// The parts of the Unisphere embeds API the avatar uses. Remote code: check every call.
interface GenieAvatarApi {
  contained?: (params: { elementId: string; autoConnect: boolean }) => { remove?: () => void } | undefined;
  disconnectData?: { onChanges?: (listener: (data: { reason?: unknown } | null) => void) => unknown };
}
interface EmbedsWorkspace {
  apis?: { genieAvatar?: GenieAvatarApi };
  destroy?: () => void;
  // The live loader spells it this way.
  destory?: () => void;
}
interface EmbedsModule {
  embeds?: { workspace?: (config: unknown) => Promise<EmbedsWorkspace> };
}

/** Disconnect reasons are PascalCase names. Anything else is not passed on. */
const safeReason = (reason: unknown) => (typeof reason === 'string' && /^[A-Za-z]{1,64}$/.test(reason) ? reason : 'UnknownReason');

const AvatarView: FC<AvatarCoreProps & { ks: string }> = props => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { partnerId, ks, serverUrl, autoConnect, openingPhrase, captions, theme } = props;
  const reporter = useContext(ReporterContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    // Teardown steps of the remote embed, run newest first. A throwing remote must not break React's unmount.
    const teardown: Array<() => void> = [];
    const stop = () =>
      teardown.splice(0).reverse().forEach(step => {
        try {
          step();
        } catch {
          // The embed is gone either way.
        }
      });
    container.replaceChildren();
    const id = `kaltura-avatar-${crypto.randomUUID()}`;
    container.id = id;
    const settings = {
      ...(openingPhrase ? { openingPhrase } : {}),
      ...(captions === undefined ? {} : { captions: { enable: captions } }),
      theme: { type: theme ?? (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark') },
    };

    loadUnisphereModule<EmbedsModule>(serverUrl)
      .then(async ({ embeds }) => {
        if (cancelled) return;
        if (typeof embeds?.workspace !== 'function') throw new KalturaFailure('load-failed', 'Unisphere embeds API is missing');
        const region = regionOf(serverUrl);
        const workspace = await embeds.workspace({
          ...(region ? { env: region } : {}),
          session: { ks, partnerId },
          apis: [{ name: 'genieAvatar', settings }],
        });
        teardown.push(() => (workspace.destroy ?? workspace.destory)?.call(workspace));
        // The effect was cleaned up while the workspace loaded: nobody else will destroy it.
        if (cancelled) return stop();
        const avatar = workspace.apis?.genieAvatar;
        if (typeof avatar?.contained !== 'function') throw new KalturaFailure('load-failed', 'Avatar embed is missing');
        const embed = avatar.contained({ elementId: id, autoConnect: autoConnect === true });
        teardown.push(() => embed?.remove?.());
        const off = avatar.disconnectData?.onChanges?.(data => {
          if (data && !cancelled) emitEvent({ type: 'avatar-disconnected', widget: 'avatar', detail: { reason: safeReason(data.reason), instanceId: id } }, reporter);
        });
        teardown.push(() => (typeof off === 'function' ? off() : (off as { unsubscribe?: () => void } | undefined)?.unsubscribe?.()));
      })
      .catch(err => {
        stop();
        if (cancelled) return;
        // Remote error text can hold the KS or markup. Show fixed text only.
        renderLoadError(container, LABEL, err instanceof KalturaFailure ? err : new KalturaFailure('load-failed', 'Avatar could not start'), 'avatar', reporter);
      });

    return () => {
      cancelled = true;
      stop();
      container.replaceChildren();
    };
  }, [partnerId, ks, serverUrl, autoConnect, openingPhrase, captions, theme, reporter]);

  return <div ref={containerRef} className="kaltura-avatar-container" style={{ width: '100%', aspectRatio: '16/9' }} />;
};

const Validated = withKs('avatar', withValidatedProps(KalturaAvatarApi.schema.extend({ ks: z.string() }), LABEL, AvatarView, 'avatar'));

/** The avatar takes its KS from `setKsProvider` only. A `ks` prop is dropped, because the KS picks the agent. */
export const AvatarCore: FC<AvatarCoreProps> = props => createElement(Validated, { ...props, ks: undefined });
