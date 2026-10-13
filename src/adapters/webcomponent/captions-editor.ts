import { CaptionsEditorCore } from '../../core/captions-editor';
import { defineKalturaElement } from './define';

export const CAPTIONS_EDITOR_TAG = 'kaltura-captions-editor';

export function defineCaptionsEditorWebComponent(): void {
  defineKalturaElement(CAPTIONS_EDITOR_TAG, CaptionsEditorCore);
}
