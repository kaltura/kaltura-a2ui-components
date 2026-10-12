import { MediaManagerCore } from '../../core/media-manager';
import { defineKalturaElement } from './define';

export const MEDIA_MANAGER_TAG = 'kaltura-media-manager';

export function defineMediaManagerWebComponent(): void {
  defineKalturaElement(MEDIA_MANAGER_TAG, MediaManagerCore, null);
}
