import { useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { renderMarkdown } from '@a2ui/markdown-it';

const CDN_EMBED = 'https://cdnapisec.kaltura.com';

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
 * Pure helper: builds the clip iframe embed URL.
 * Returns an empty string when partnerId or uiconfId is missing.
 */
export function buildClipUrl(
  clip: Clip,
  partnerId?: number,
  uiconfId?: number,
  ks?: string,
): string {
  if (!partnerId || !uiconfId) return '';
  const base = `${CDN_EMBED}/p/${partnerId}/embedPlaykitJs/partner_id/${partnerId}/uiconf_id/${uiconfId}`;
  const params = new URLSearchParams({
    iframeembed: 'true',
    entry_id: clip.entryId,
    kalturaSeekFrom: String(Math.round(clip.startTime)),
    kalturaClipTo: String(Math.round(clip.endTime)),
  });
  if (ks) params.set('ks', ks);
  return `${base}?${params}`;
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
  const [html, setHtml] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const [showMask, setShowMask] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderMarkdown(content).then(result => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setShowMask(el.scrollHeight > el.clientHeight);
  }, [html]);

  return (
    <div
      ref={contentRef}
      className="flashcard-content"
      style={{
        maskImage: showMask
          ? 'linear-gradient(to bottom, black 50%, transparent 100%)'
          : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: html || content }}
    />
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
  const url = useMemo(
    () => buildClipUrl(clip, partnerId, uiconfId, ks),
    [clip, partnerId, uiconfId, ks],
  );

  if (!url || !active) return null;

  return (
    <iframe
      src={url}
      className="flashcard-clip-player"
      allow="autoplay *; fullscreen *; encrypted-media *; camera *; microphone *; display-capture *"
      allowFullScreen
      title={clip.title ?? 'Video clip'}
    />
  );
}

export const FlashcardsCore: FC<FlashcardsCoreProps> = ({
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

          return (
            <div
              key={i}
              className={`flashcard-slide ${isActive ? 'active' : ''}`}
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
                {card.clips && card.clips.length > 0 && (
                  <div className="flashcard-clips">
                    <ClipPlayer
                      clip={card.clips[0]}
                      partnerId={partnerId}
                      uiconfId={uiconfId}
                      ks={ks}
                      active={isActive}
                    />
                    {card.clips.length > 1 && (
                      <div className="flashcard-clip-dots">
                        {card.clips.map((_, ci) => (
                          <span key={ci} className={`clip-dot ${ci === 0 ? 'active' : ''}`} />
                        ))}
                      </div>
                    )}
                  </div>
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
