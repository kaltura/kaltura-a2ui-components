import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { PlayerCoreProps } from '../../core/player';
import { PlayerCore } from '../../core/player';

export const PLAYER_TAG = 'kaltura-player';

export function definePlayerWebComponent(): void {
  if (customElements.get(PLAYER_TAG)) return;

  class KalturaPlayerElement extends HTMLElement {
    config: Partial<PlayerCoreProps> = {};

    connectedCallback(): void {
      const root = createRoot(this);
      root.render(createElement(PlayerCore, this.config as PlayerCoreProps));
    }
  }

  customElements.define(PLAYER_TAG, KalturaPlayerElement);
}
