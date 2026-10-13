import { ContentLabCore } from '../../core/content-lab';
import { defineKalturaElement } from './define';

export const CONTENT_LAB_TAG = 'kaltura-content-lab';

export function defineContentLabWebComponent(): void {
  defineKalturaElement(CONTENT_LAB_TAG, ContentLabCore, null);
}
