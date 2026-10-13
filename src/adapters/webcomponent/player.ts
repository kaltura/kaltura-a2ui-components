import { PlayerCore } from '../../core/player';
import { defineKalturaElement } from './define';

export const PLAYER_TAG = 'kaltura-player';

export function definePlayerWebComponent(): void {
  defineKalturaElement(PLAYER_TAG, PlayerCore);
}
