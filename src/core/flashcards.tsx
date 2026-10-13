import { useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { renderSafeMarkdown } from './safe-markdown';
import { toKalturaCdnUrl } from './media-url';
import { KalturaFlashcardsApi } from '../schemas/flashcards';
import { LoadError, withValidatedProps } from './validate-props';
import { kalturaHosts } from './region';
import { PlayerEmbed } from './player';
import { withKs } from './ks';

const GRADIENTS = [
  'radial-gradient(315% 315% at 50% 214%, rgba(0,110,250,0) 0%, rgba(0,110,250,0.5) 100%), #000',
  'radial-gradient(335% 141% at 100% 100%, rgba(91,198,134,0.25) 0%, rgba(91,198,134,0.4) 100%), #000',
  'radial-gradient(335% 141% at 100% 100%, rgba(255,61,35,0.25) 0%, rgba(255,61,35,0.4) 100%), #000',
  'radial-gradient(335% 141% at 100% 100%, rgba(255,157,255,0.25) 0%, rgba(255,157,255,0.4) 100%), #000',
];

export interface Clip {
  entryId: string;
  startTime: number;
  endTime: number;
  title?: string;
  thumbnail?: string;
}

export interface FlashCard {
  title: string;
  subtitle?: string;
  content: string;
  clips?: Clip[];
}

export interface FlashcardWithCover extends FlashCard {
  isCover: boolean;
}

export interface FlashcardsCoreProps {
  title: string;
  summary?: string;
  cards: FlashCard[];
  partnerId?: number;
  uiconfId?: number;
  ks?: string;
}

/**
 * CDN thumbnail URL for a clip — seeks to startTime+1s for a meaningful frame.
 * Uses the clip's own thumbnail field only when it is an https Kaltura CDN URL
 * (see toKalturaCdnUrl). Otherwise builds the CDN URL, or returns an empty string.
 */
export function buildThumbnailUrl(clip: Clip, partnerId?: number): string {
  const own = toKalturaCdnUrl(clip.thumbnail);
  if (own) return own;
  if (!isPositiveInt(partnerId) || !isEntryId(clip.entryId)) return '';
  const sec = Math.round(clip.startTime) + 1;
  return `${kalturaHosts().vod}/p/${encodeURIComponent(partnerId)}/thumbnail/entry_id/${encodeURIComponent(clip.entryId)}/width/200/vid_sec/${sec}`;
}

/**
 * Pure helper: prepend the cover card to the cards array.
 * Exported so tests can assert on the count without rendering.
 */
export function buildAllCards(
  title: string,
  summary: string | undefined,
  cards: FlashCard[],
): FlashcardWithCover[] {
  const coverCard: FlashcardWithCover = {
    title,
    subtitle: 'Introduction',
    content: summary ?? '',
    clips: undefined,
    isCover: true,
  };
  return [coverCard, ...cards.map(c => ({ ...c, isCover: false }))];
}

function CardContentInner({ content }: { content: string }) {
  // The text shows as a React child while markdown renders. Only sanitised HTML
  // ever reaches dangerouslySetInnerHTML. Failed or empty output keeps the text.
  const [rendered, setRendered] = useState<{ source: string; html: string }>();
  const contentRef = useRef<HTMLDivElement>(null);
  const [showMask, setShowMask] = useState(false);
  const html = rendered?.source === content ? rendered.html : '';

  useEffect(() => {
    let cancelled = false;
    renderSafeMarkdown(content)
      .then(result => {
        if (!cancelled) setRendered({ source: content, html: result });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setShowMask(el.scrollHeight > el.clientHeight);
  }, [html, content]);

  const shared = {
    ref: contentRef,
    className: 'flashcard-content',
    style: {
      maskImage: showMask ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : undefined,
    },
  };
  return html ? (
    <div {...shared} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div {...shared}>{content}</div>
  );
}

function ClipPlayer({
  clip,
  partnerId,
  uiconfId,
  ks,
  active,
}: {
  clip: Clip;
  partnerId?: number;
  uiconfId?: number;
  ks?: string;
  active: boolean;
}) {
  if (!active) return null;
  const invalid =
    !isEntryId(clip.entryId) ||
    (partnerId !== undefined && !isPositiveInt(partnerId)) ||
    (uiconfId !== undefined && !isPositiveInt(uiconfId));
  if (invalid) return <LoadError widget="flashcards">This clip cannot be shown.</LoadError>;
  // Without partnerId and uiconfId there is nothing to play.
  if (partnerId === undefined || uiconfId === undefined) return null;

  return (
    <PlayerEmbed
      partnerId={partnerId}
      uiconfId={uiconfId}
      entryId={clip.entryId}
      ks={ks}
      seekFrom={clip.startTime}
      clipTo={clip.endTime}
      title={clip.title ?? 'Video clip'}
      widget="flashcards"
      className="flashcard-clip-player"
    />
  );
}

/** Thumbnail strip + player for multi-clip cards. */
function ClipGallery({
  clips,
  partnerId,
  uiconfId,
  ks,
  cardActive,
}: {
  clips: Clip[];
  partnerId?: number;
  uiconfId?: number;
  ks?: string;
  cardActive: boolean;
}) {
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const activeClip = clips[activeClipIdx] ?? clips[0];

  return (
    <div className="flashcard-clips">
      <ClipPlayer
        clip={activeClip}
        partnerId={partnerId}
        uiconfId={uiconfId}
        ks={ks}
        active={cardActive}
      />
      {clips.length > 1 && (
        <div className="flashcard-clip-thumbs">
          {clips.map((clip, ci) => {
            const thumbUrl = buildThumbnailUrl(clip, partnerId);
            return (
              <button
                key={ci}
                className={`clip-thumb-btn ${ci === activeClipIdx ? 'active' : ''}`}
                onClick={() => setActiveClipIdx(ci)}
                aria-label={clip.title ?? `Clip ${ci + 1}`}
                title={clip.title ?? `Clip ${ci + 1}`}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={clip.title ?? `Clip ${ci + 1}`}
                    className="clip-thumb-img"
                  />
                ) : (
                  <span className="clip-thumb-fallback" />
                )}
                {ci === activeClipIdx && <span className="clip-thumb-active-bar" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FlashcardsView: FC<FlashcardsCoreProps> = ({
  title,
  summary,
  cards,
  partnerId,
  uiconfId,
  ks,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const allCards = useMemo(
    () => buildAllCards(title, summary, cards),
    [title, summary, cards],
  );

  const total = allCards.length;

  const navigate = useCallback(
    (dir: number) => {
      if (animating) return;
      const next = currentIndex + dir;
      if (next < 0 || next >= total) return;
      setAnimating(true);
      setCurrentIndex(next);
      setTimeout(() => setAnimating(false), 320);
    },
    [currentIndex, total, animating],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
    },
    [navigate],
  );

  const getGradient = (index: number) => GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      className="flashcard-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={title}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flashcard-track" ref={trackRef}>
        {allCards.map((card, i) => {
          const isActive = i === currentIndex;
          const offset = (i - currentIndex) * 100;
          const gap = (i - currentIndex) * 1.5;
          const hasClips = card.clips && card.clips.length > 0;

          return (
            <div
              key={i}
              className={`flashcard-slide ${isActive ? 'active' : ''} ${hasClips ? 'has-clips' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Card ${i + 1} of ${total}`}
              aria-hidden={!isActive}
              style={{
                transform: `translateX(${offset}%) translateX(${gap}rem)`,
                background: getGradient(i),
                opacity: isActive ? 1 : 0.6,
              }}
              onClick={() => !isActive && setCurrentIndex(i)}
            >
              <div className="flashcard-slide-inner">
                {card.subtitle && (
                  <span className="flashcard-subtitle">{String(card.subtitle)}</span>
                )}
                <h3 className={`flashcard-title ${card.isCover ? 'cover' : ''}`}>
                  {String(card.title)}
                </h3>
                {card.content && <CardContentInner content={String(card.content)} />}
                {hasClips && card.clips && (
                  <ClipGallery
                    clips={card.clips}
                    partnerId={partnerId}
                    uiconfId={uiconfId}
                    ks={ks}
                    cardActive={isActive}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flashcard-controls">
        {currentIndex > 0 && (
          <button
            className="flashcard-nav-btn"
            onClick={() => navigate(-1)}
            aria-label="Previous card"
            disabled={animating}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <span className="flashcard-counter">
          {currentIndex + 1} / {total}
        </span>
        {currentIndex < total - 1 && (
          <button
            className="flashcard-nav-btn"
            onClick={() => navigate(1)}
            aria-label="Next card"
            disabled={animating}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {currentIndex < total - 1 && (
          <button className="flashcard-action-btn" onClick={() => navigate(1)}>
            {currentIndex === 0 ? 'Start' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
};

// Bad partnerId or uiconfId only disables the clips (SEC-11), so they are not checked here.
export const FlashcardsCore = withKs(
  'flashcards',
  withValidatedProps(KalturaFlashcardsApi.schema.omit({ partnerId: true, uiconfId: true }), 'flashcards', FlashcardsView, 'flashcards'),
);
