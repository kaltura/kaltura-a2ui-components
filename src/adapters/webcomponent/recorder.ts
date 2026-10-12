import { RecorderCore } from '../../core/recorder';
import { defineKalturaElement } from './define';

export const RECORDER_TAG = 'kaltura-recorder';

export function defineRecorderWebComponent(): void {
  defineKalturaElement(RECORDER_TAG, RecorderCore);
}
