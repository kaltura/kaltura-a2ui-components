import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { AvatarCoreProps } from '../../core/avatar';
import { AvatarCore } from '../../core/avatar';

export const AVATAR_TAG = 'kaltura-avatar';

export function defineAvatarWebComponent(): void {
  if (customElements.get(AVATAR_TAG)) return;

  class KalturaAvatarElement extends HTMLElement {
    config: Partial<AvatarCoreProps> = {};

    connectedCallback(): void {
      const root = createRoot(this);
      root.render(createElement(AvatarCore, this.config as AvatarCoreProps));
    }
  }

  customElements.define(AVATAR_TAG, KalturaAvatarElement);
}
