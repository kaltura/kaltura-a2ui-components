import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaMediaManagerApi } from '../../schemas/media-manager';
import { MediaManagerCore } from '../../core/media-manager';

export const mediaManagerReactImpl = createComponentImplementation(
  KalturaMediaManagerApi,
  ({ props }) => <MediaManagerCore {...props} />,
);
