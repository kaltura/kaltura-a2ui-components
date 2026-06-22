import { useEffect, useRef } from 'react';
import type { FC } from 'react';

export interface AvatarCoreProps {
  avatarId: string;
  projectId?: string;
  language?: string;
  autoStart?: boolean;
  allowInterrupt?: boolean;
}

const SDK_SRC = 'https://static.avatar.us.kaltura.ai/web-sdk/latest/index.js';

export const AvatarCore: FC<AvatarCoreProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let killed = false;

    const scriptId = `kaltura-avatar-sdk-${props.avatarId}`;

    const initAvatar = () => {
      if (killed || !container) return;
      try {
        const win = window as unknown as {
          KalturaAvatar?: { create: (cfg: unknown) => unknown };
        };
        if (win.KalturaAvatar) {
          win.KalturaAvatar.create({
            containerId: container.id,
            avatarId: props.avatarId,
            projectId: props.projectId,
            language: props.language || 'en',
            autoStart: props.autoStart || false,
            allowInterrupt: props.allowInterrupt !== false,
          });
        }
      } catch (err) {
        console.error('[KalturaAvatar] init failed:', err);
      }
    };

    const uid = `kaltura-avatar-${Math.random().toString(36).slice(2, 9)}`;
    container.id = uid;

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = SDK_SRC;
      script.onload = initAvatar;
      script.onerror = () => {
        if (!killed && container) {
          container.innerHTML =
            '<div style="padding:20px;color:#ff6b6b;text-align:center">Avatar SDK unavailable</div>';
        }
      };
      document.head.appendChild(script);
    } else {
      initAvatar();
    }

    return () => {
      killed = true;
    };
  }, [props.avatarId, props.projectId]);

  return (
    <div
      ref={containerRef}
      className="kaltura-avatar-container"
      style={{ width: '100%', aspectRatio: '16/9' }}
    />
  );
};
