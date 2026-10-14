import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaCaptionsEditorApi } from '../../schemas/captions-editor';
import { CaptionsEditorCore } from '../../core/captions-editor';

export const captionsEditorReactImpl = createComponentImplementation(
  KalturaCaptionsEditorApi,
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <CaptionsEditorCore {...props} />
    </AgentAction>
  ),
);
