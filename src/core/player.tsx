import { useMemo } from 'react';
import type { FC } from 'react';

const CDN_EMBED = 'https://cdnapisec.kaltura.com';
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
  const base =
    `${CDN_EMBED}/p/${p.partnerId}/embedPlaykitJs` +
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

export const PlayerCore: FC<PlayerCoreProps> = (props) => {
  const aspectRatio = props.aspectRatio || '16/9';

  const playerUrl = useMemo(
    () => buildPlayerUrl(props),
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

  return (
    <div className="kaltura-player-container">
      <iframe
        src={playerUrl}
        style={{ width: '100%', aspectRatio, border: 0, display: 'block', minHeight: 280 }}
        allow="autoplay *; fullscreen *; encrypted-media *; camera *; microphone *; display-capture *"
        allowFullScreen
        title="Kaltura Player v7"
      />
      <div className="kaltura-player-label">
        <span className="player-title">{title}</span>
        {description && <span className="player-desc">{description}</span>}
      </div>
    </div>
  );
};
