import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { CaptionsEditorCoreProps } from '../../core/captions-editor';
import { CaptionsEditorCore } from '../../core/captions-editor';

export const CAPTIONS_EDITOR_TAG = 'kaltura-captions-editor';

export function defineCaptionsEditorWebComponent(): void {
  if (customElements.get(CAPTIONS_EDITOR_TAG)) return;

  class KalturaCaptionsEditorElement extends HTMLElement {
    config: Partial<CaptionsEditorCoreProps> = {};

    connectedCallback(): void {
      const root = createRoot(this);
      root.render(createElement(CaptionsEditorCore, this.config as CaptionsEditorCoreProps));
    }
  }

  customElements.define(CAPTIONS_EDITOR_TAG, KalturaCaptionsEditorElement);
}
