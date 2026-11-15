import { createElement, useContext, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { z } from 'zod';
import { createEmbedsWorkspace, destroyEmbedsWorkspace, teardownSteps } from './embeds';
import { readColorMode } from './color-mode';
import { renderLoadError } from './render-load-error';
import { KalturaFailure, emitEvent, ReporterContext } from './host-hooks';
import { unisphereUrl } from './region';
import { KalturaAvatarApi } from '../schemas/avatar';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';

export interface AvatarCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
  serverUrl?: string;
  /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
  region?: string;
  /** Start the session on load. Default: false, the user clicks to start. */
  autoConnect?: boolean;
  /** What the avatar says first. Plain text. */
  openingPhrase?: string;
  /** Show captions of what the avatar says. */
  captions?: boolean;
  /** Default: the page theme (`data-theme`, an `a2ui-dark` or `a2ui-light` class, then the system setting). */
  theme?: 'light' | 'dark' | 'studio';
}

const LABEL = 'Kaltura Avatar';

// The parts of the Unisphere embeds API the avatar uses. Remote code: check every call.
interface GenieAvatarApi {
  contained?: (params: { elementId: string; autoConnect: boolean }) => { remove?: () => void } | undefined;
  disconnectData?: { onChanges?: (listener: (data: { reason?: unknown } | null) => void) => unknown };
}
/** Disconnect reasons are PascalCase names. Anything else is not passed on. */
const safeReason = (reason: unknown) => (typeof reason === 'string' && /^[A-Za-z]{1,64}$/.test(reason) ? reason : 'UnknownReason');

const AvatarView: FC<AvatarCoreProps & { ks: string }> = props => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { partnerId, ks, region, serverUrl: serverUrlProp, autoConnect, openingPhrase, captions, theme } = props;
  const reporter = useContext(ReporterContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    const teardown = teardownSteps();
    container.replaceChildren();
    let serverUrl: string;
    try {
      serverUrl = unisphereUrl(region, serverUrlProp);
    } catch (error) {
      renderLoadError(container, LABEL, error, 'avatar', reporter);
      return;
    }
    const id = `kaltura-avatar-${crypto.randomUUID()}`;
    container.id = id;
    const settings = {
      ...(openingPhrase ? { openingPhrase } : {}),
      ...(captions === undefined ? {} : { captions: { enable: captions } }),
      theme: { type: theme ?? readColorMode('dark') },
    };

    createEmbedsWorkspace(serverUrl, () => cancelled, { session: { ks, partnerId }, apis: [{ name: 'genieAvatar', settings }] })
      .then(workspace => {
        if (!workspace) return;
        teardown.add(() => destroyEmbedsWorkspace(workspace));
        // The effect was cleaned up while the workspace loaded: nobody else will destroy it.
        if (cancelled) return teardown.run();
        const avatar = workspace.apis?.genieAvatar as GenieAvatarApi | undefined;
        if (typeof avatar?.contained !== 'function') throw new KalturaFailure('load-failed', 'Avatar embed is missing');
        const embed = avatar.contained({ elementId: id, autoConnect: autoConnect === true });
        teardown.add(() => embed?.remove?.());
        const off = avatar.disconnectData?.onChanges?.(data => {
          if (data && !cancelled) emitEvent({ type: 'avatar-disconnected', widget: 'avatar', detail: { reason: safeReason(data.reason), instanceId: id } }, reporter);
        });
        teardown.add(() => (typeof off === 'function' ? off() : (off as { unsubscribe?: () => void } | undefined)?.unsubscribe?.()));
      })
      .catch(err => {
        teardown.run();
        if (cancelled) return;
        // Remote error text can hold the KS or markup. Show fixed text only.
        renderLoadError(container, LABEL, err instanceof KalturaFailure ? err : new KalturaFailure('load-failed', 'Avatar could not start'), 'avatar', reporter);
      });

    return () => {
      cancelled = true;
      teardown.run();
      container.replaceChildren();
    };
  }, [partnerId, ks, region, serverUrlProp, autoConnect, openingPhrase, captions, theme, reporter]);

  return <div ref={containerRef} className="kaltura-avatar-container" style={{ width: '100%', aspectRatio: '16/9' }} />;
};

const Validated = withKs('avatar', withValidatedProps(KalturaAvatarApi.schema.extend({ ks: z.string() }), LABEL, AvatarView, 'avatar'), {
  schema: KalturaAvatarApi.schema,
  label: LABEL,
});

/** The avatar takes its KS from `setKsProvider` only. A `ks` prop is dropped, because the KS picks the agent. */
export const AvatarCore: FC<AvatarCoreProps> = props => createElement(Validated, { ...props, ks: undefined });
