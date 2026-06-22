import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaCaptionsEditorApi } from '../../schemas/captions-editor';
import { CaptionsEditorCore } from '../../core/captions-editor';

export const captionsEditorReactImpl = createComponentImplementation(
  KalturaCaptionsEditorApi,
  ({ props }) => <CaptionsEditorCore {...props} />,
);
