import { AvatarCore } from '../../core/avatar';
import { defineKalturaElement } from './define';

export const AVATAR_TAG = 'kaltura-avatar';

export function defineAvatarWebComponent(): void {
  defineKalturaElement(AVATAR_TAG, AvatarCore, null);
}
