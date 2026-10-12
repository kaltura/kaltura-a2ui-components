import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { renderLoadError } from './render-load-error';
import { KalturaAvatarApi } from '../schemas/avatar';
import { withValidatedProps } from './validate-props';

export interface AvatarCoreProps {
  avatarId: string;
  projectId?: string;
  language?: string;
  autoStart?: boolean;
  allowInterrupt?: boolean;
}

// Not pinned yet: the vendor has not published a versioned URL or a stable hash.
// Set both together when it does. The loader adds `integrity` once it is set.
const SDK_SRC = 'https://static.avatar.us.kaltura.ai/web-sdk/latest/index.js';
const SDK_INTEGRITY: string | undefined = undefined;

const loads = new Map<string, Promise<void>>();

/** Adds one script tag per URL. A failed load removes the tag, so a retry is possible. */
export function loadScriptOnce(src: string, integrity?: string): Promise<void> {
  const cached = loads.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    // crossorigin without an integrity hash only makes the request fail on a host without CORS headers.
    if (integrity) {
      script.crossOrigin = 'anonymous';
      script.setAttribute('integrity', integrity);
    }
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      loads.delete(src);
      reject(new Error('script could not be loaded'));
    };
    document.head.appendChild(script);
  });
  loads.set(src, promise);
  return promise;
}

const AvatarView: FC<AvatarCoreProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { avatarId, projectId, language, autoStart, allowInterrupt } = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let killed = false;

    const uid = `kaltura-avatar-${Math.random().toString(36).slice(2, 9)}`;
    container.id = uid;

    loadScriptOnce(SDK_SRC, SDK_INTEGRITY).then(
      () => {
        if (killed) return;
        try {
          const win = window as unknown as {
            KalturaAvatar?: { create: (cfg: unknown) => unknown };
          };
          if (win.KalturaAvatar) {
            win.KalturaAvatar.create({
              containerId: uid,
              avatarId,
              projectId,
              language: language || 'en',
              autoStart: autoStart || false,
              allowInterrupt: allowInterrupt !== false,
            });
          }
        } catch (err) {
          console.error('[KalturaAvatar] init failed:', err);
        }
      },
      (err) => {
        if (!killed) renderLoadError(container, 'avatar SDK', err, 'avatar');
      },
    );

    return () => {
      killed = true;
      container.replaceChildren();
    };
  }, [avatarId, projectId, language, autoStart, allowInterrupt]);

  return (
    <div
      ref={containerRef}
      className="kaltura-avatar-container"
      style={{ width: '100%', aspectRatio: '16/9' }}
    />
  );
};

export const AvatarCore = withValidatedProps(KalturaAvatarApi.schema, 'avatar', AvatarView, 'avatar');
