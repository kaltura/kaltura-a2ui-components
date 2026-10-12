import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { RecorderCoreProps } from '../../core/recorder';
import { RecorderCore } from '../../core/recorder';
import { StrictPendingContext } from '../../core/validate-props';

export const RECORDER_TAG = 'kaltura-recorder';

export function defineRecorderWebComponent(): void {
  if (customElements.get(RECORDER_TAG)) return;

  class KalturaRecorderElement extends HTMLElement {
    config: Partial<RecorderCoreProps> = {};

    connectedCallback(): void {
      const root = createRoot(this);
      root.render(createElement(StrictPendingContext.Provider, { value: true }, createElement(RecorderCore, this.config as RecorderCoreProps)));
    }
  }

  customElements.define(RECORDER_TAG, KalturaRecorderElement);
}
