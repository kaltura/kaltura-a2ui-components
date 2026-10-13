import { useMemo, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import { getPlayerSandbox } from './host-hooks';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaPlayerApi } from '../schemas/player';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { kalturaHosts } from './region';

const PLAYER_PLUGINS = 'uiManagers,youtube,dualscreen,timeline,kalturaCuepoints,ivq,kava';

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

export function buildPlayerUrl(p: PlayerCoreProps): string {
  if (!isPositiveInt(p.partnerId)) throw new Error('Invalid partnerId');
  if (!isPositiveInt(p.uiconfId)) throw new Error('Invalid uiconfId');
  if (!isEntryId(p.entryId)) throw new Error('Invalid entryId');
  const base =
    `${kalturaHosts().cdn}/p/${p.partnerId}/embedPlaykitJs` +
    `/partner_id/${p.partnerId}/uiconf_id/${p.uiconfId}`;
  const params = new URLSearchParams({
    iframeembed: 'true',
    entry_id: p.entryId,
    plugins: PLAYER_PLUGINS,
  });
  if (p.ks) params.set('ks', p.ks);
  if (p.startTime != null) params.set('kalturaSeekFrom', String(Math.round(p.startTime)));
  if (p.clipTo != null) params.set('kalturaClipTo', String(Math.round(p.clipTo)));
  if (p.autoplay) params.set('autoplay', 'true');
  if (p.muted) params.set('mute', 'true');
  return `${base}?${params}`;
}

/** Iframe for a Kaltura player page. The host sandbox is read once, when it mounts. */
export function PlayerFrame(props: { src: string; title: string; className?: string; style?: CSSProperties }) {
  const [sandbox] = useState(getPlayerSandbox);
  return <iframe {...props} allow="autoplay *; fullscreen *; encrypted-media *" allowFullScreen sandbox={sandbox} />;
}

const PlayerView: FC<PlayerCoreProps> = (props) => {
  const aspectRatio = props.aspectRatio || '16/9';

  const playerUrl = useMemo(
    () => {
      try {
        return buildPlayerUrl(props);
      } catch (e) {
        return e as Error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.partnerId,
      props.uiconfId,
      props.entryId,
      props.ks,
      props.startTime,
      props.clipTo,
      props.autoplay,
      props.muted,
    ],
  );

  const title = props.entryName
    ? `${props.entryId} — ${props.entryName}`
    : props.entryId;

  const description = useMemo(() => {
    if (!props.entryDescription) return '';
    return props.entryDescription.replace(/<[^>]*>/g, '').trim();
  }, [props.entryDescription]);

  if (playerUrl instanceof Error) {
    return <LoadError widget="player">{`Failed to load player: ${playerUrl.message}`}</LoadError>;
  }

  return (
    <div className="kaltura-player-container">
      <PlayerFrame
        src={playerUrl}
        style={{ width: '100%', aspectRatio, border: 0, display: 'block', minHeight: 280 }}
        title="Kaltura Player v7"
      />
      <div className="kaltura-player-label">
        <span className="player-title">{title}</span>
        {description && <span className="player-desc">{description}</span>}
      </div>
    </div>
  );
};

export const PlayerCore = withKs('player', withValidatedProps(KalturaPlayerApi.schema, 'player', PlayerView, 'player'));
