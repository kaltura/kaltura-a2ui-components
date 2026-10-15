import { useContext, useEffect, useRef } from 'react';
import type { CSSProperties, FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaPlayerApi } from '../schemas/player';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { KalturaFailure, reportError, ReporterContext } from './host-hooks';
import { renderLoadError } from './render-load-error';
import { loadPlayerScript, type PlayerHandle } from './player-script';
import { refusedIdProp } from './allowed-ids';

export interface PlayerCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Player (uiConf) ID. */
  uiconfId: number;
  /** Entry to play, such as `0_abc123`. */
  entryId: string;
  /** Only for protected entries. The host KS provider is used first. */
  ks?: string;
  /** Start playback on load. Browsers need `muted` too. */
  autoplay?: boolean;
  /** Start muted. */
  muted?: boolean;
  /** Seek to this second on load. */
  startTime?: number;
  /** Stop playback at this second. */
  clipTo?: number;
  /** Container ratio such as `16/9` (default) or `4/3`. */
  aspectRatio?: string;
  /** Title shown above the player. */
  entryName?: string;
  /** Text shown under the player. HTML tags are stripped. */
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
  const refused = invalid ? undefined : refusedIdProp(props);
  const reporter = useContext(ReporterContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || invalid || refused) return;

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
          if (!cancelled) reportError('render-failed', widget, 'Player error', reporter);
        });
        return player.loadMedia(
          { entryId },
          {
            ...(seekFrom !== undefined ? { seekFrom: Math.round(seekFrom) } : {}),
            ...(clipTo !== undefined ? { clipTo: Math.round(clipTo) } : {}),
          },
        );
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
          reporter,
        );
      });

    return () => {
      cancelled = true;
      destroy();
      container.replaceChildren();
    };
  }, [partnerId, uiconfId, entryId, ks, autoplay, muted, seekFrom, clipTo, widget, invalid, refused, reporter]);

  if (invalid) return <LoadError widget={widget}>{`Failed to load player: Invalid ${invalid}`}</LoadError>;
  if (refused) return <LoadError widget={widget} code="origin-not-allowed">{`Failed to load player: ${refused} is not allowed`}</LoadError>;
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

export const PlayerCore = withKs('player', withValidatedProps(withKsProp(KalturaPlayerApi.schema, false), 'player', PlayerView, 'player'), {
  schema: KalturaPlayerApi.schema,
  label: 'player',
});
