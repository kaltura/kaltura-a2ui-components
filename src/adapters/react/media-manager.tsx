import { createComponentImplementation } from '@a2ui/react/v0_9';
import { AgentAction } from './agent-action';
import { KalturaMediaManagerApi } from '../../schemas/media-manager';
import { MediaManagerCore } from '../../core/media-manager';

export const mediaManagerReactImpl = createComponentImplementation(
  KalturaMediaManagerApi,
  // `legacyDocumentEvents` is a host option: an agent must not be able to set it.
  ({ props: { action, ...props }, context }) => (
    <AgentAction context={context} action={action}>
      <MediaManagerCore {...props} legacyDocumentEvents />
    </AgentAction>
  ),
);
