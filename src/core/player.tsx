import { useEffect, useRef } from 'react';
import type { CSSProperties, FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaPlayerApi } from '../schemas/player';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { KalturaFailure, reportError } from './host-hooks';
import { renderLoadError } from './render-load-error';
import { loadPlayerScript, type PlayerHandle } from './player-script';

export interface PlayerCoreProps {
  partnerId: number;
  uiconfId: number;
  entryId: string;
  ks?: string;
  autoplay?: boolean;
  muted?: boolean;
  startTime?: number;
  clipTo?: number;
  aspectRatio?: string;
  entryName?: string;
  entryDescription?: string;
}

export interface PlayerEmbedProps {
  partnerId: number;
  uiconfId: number;
  entryId: string;
  ks?: string;
  autoplay?: boolean;
  muted?: boolean;
  seekFrom?: number;
  clipTo?: number;
  title: string;
  widget: 'player' | 'flashcards';
  className?: string;
  style?: CSSProperties;
}

/** The first prop that cannot be used, or `undefined`. */
const invalidProp = (p: Pick<PlayerEmbedProps, 'partnerId' | 'uiconfId' | 'entryId'>): string | undefined =>
  !isPositiveInt(p.partnerId) ? 'partnerId' : !isPositiveInt(p.uiconfId) ? 'uiconfId' : !isEntryId(p.entryId) ? 'entryId' : undefined;

/**
 * Plays an entry with the Kaltura Player script. The KS goes only into the
 * player config, never into a URL. The script runs in the page origin, so
 * there is no iframe sandbox (docs/adr/0008).
 */
export function PlayerEmbed(props: PlayerEmbedProps) {
  const { partnerId, uiconfId, entryId, ks, autoplay, muted, seekFrom, clipTo, widget } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const invalid = invalidProp(props);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || invalid) return;

    let cancelled = false;
    let player: PlayerHandle | undefined;
    // The script finds its container by id and builds its own UI inside it.
    const id = `kaltura-player-${crypto.randomUUID()}`;
    container.id = id;

    // A throwing remote must not break React's unmount.
    const destroy = () => {
      try {
        player?.destroy?.();
      } catch {
        // The player is gone either way.
      }
      player = undefined;
    };

    loadPlayerScript(partnerId, uiconfId)
      .then(api => {
        if (cancelled) return;
        player = api.setup({
          targetId: id,
          // The header keeps the KS out of manifest and media URLs.
          provider: { partnerId, uiConfId: uiconfId, ...(ks ? { ks } : {}), useHeaderForKs: true },
          playback: {
            ...(autoplay !== undefined ? { autoplay } : {}),
            ...(muted !== undefined ? { muted } : {}),
          },
        });
        if (!player?.loadMedia || !player.addEventListener) throw new Error();
        // Remote error text can hold the KS or markup. Never report it.
        player.addEventListener(player.Event?.ERROR ?? 'error', () => {
          if (!cancelled) reportError('render-failed', widget, 'Player error');
        });
        // The player's own seekFrom and clipTo ask Kaltura for a cut file. Kaltura ignores the start for some
        // entries and serves a corrupt cut for others (docs/adr/0008). So the player gets a plain startTime
        // and we stop it at the clip end here.
        const start = seekFrom !== undefined ? Math.round(seekFrom) : undefined;
        const end = clipTo !== undefined ? Math.round(clipTo) : undefined;
        if (end !== undefined && end > (start ?? 0)) {
          const handle = player;
          handle.addEventListener?.(handle.Event?.TIME_UPDATE ?? 'timeupdate', () => {
            if ((handle.currentTime ?? 0) < end) return;
            // Back to the start, so the next play shows the clip again instead of stopping at once.
            handle.pause?.();
            handle.currentTime = start ?? 0;
          });
        }
        return player.loadMedia({ entryId }, start !== undefined ? { startTime: start } : {});
      })
      .catch(err => {
        if (cancelled) return;
        // The player may have started before the failure. Stop it before the error replaces its UI.
        destroy();
        renderLoadError(
          container,
          'player',
          err instanceof KalturaFailure ? err : new KalturaFailure('render-failed', 'Player could not start'),
          widget,
        );
      });

    return () => {
      cancelled = true;
      destroy();
      container.replaceChildren();
    };
  }, [partnerId, uiconfId, entryId, ks, autoplay, muted, seekFrom, clipTo, widget, invalid]);

  if (invalid) return <LoadError widget={widget}>{`Failed to load player: Invalid ${invalid}`}</LoadError>;
  return <div ref={containerRef} className={props.className} style={props.style} role="region" aria-label={props.title} />;
}

// Both labels are React text children, so React escapes them. The cap bounds the work on huge input.
const MAX_LABEL_LENGTH = 1000;

const PlayerView: FC<PlayerCoreProps> = (props) => {
  const title = props.entryName
    ? `${props.entryId} — ${props.entryName.slice(0, MAX_LABEL_LENGTH)}`
    : props.entryId;

  const description = props.entryDescription?.slice(0, MAX_LABEL_LENGTH).trim() ?? '';

  return (
    <div className="kaltura-player-container">
      <PlayerEmbed
        partnerId={props.partnerId}
        uiconfId={props.uiconfId}
        entryId={props.entryId}
        ks={props.ks}
        autoplay={props.autoplay}
        muted={props.muted}
        seekFrom={props.startTime}
        clipTo={props.clipTo}
        title="Kaltura Player v7"
        widget="player"
        style={{ width: '100%', aspectRatio: props.aspectRatio || '16/9', minHeight: 280 }}
      />
      <div className="kaltura-player-label">
        <span className="player-title">{title}</span>
        {description && <span className="player-desc">{description}</span>}
      </div>
    </div>
  );
};

export const PlayerCore = withKs('player', withValidatedProps(KalturaPlayerApi.schema, 'player', PlayerView, 'player'));
