import { VodAvatarCore } from '../../core/vod-avatar';
import { defineKalturaElement } from './define';

export const VOD_AVATAR_TAG = 'kaltura-vod-avatar-wc';

export function defineVodAvatarWebComponent(): void {
  defineKalturaElement(VOD_AVATAR_TAG, VodAvatarCore, null);
}
