import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { VodAvatarCoreProps } from '../../core/vod-avatar';
import { VodAvatarCore } from '../../core/vod-avatar';

export const VOD_AVATAR_TAG = 'kaltura-vod-avatar-wc';

export function defineVodAvatarWebComponent(): void {
  if (customElements.get(VOD_AVATAR_TAG)) return;

  customElements.define(
    VOD_AVATAR_TAG,
    class extends HTMLElement {
      config: VodAvatarCoreProps | null = null;

      connectedCallback(): void {
        if (!this.config) return;
        const root = createRoot(this);
        root.render(createElement(VodAvatarCore, this.config));
      }
    },
  );
}
