import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaRecorderApi } from '../../schemas/recorder';
import { RecorderCore } from '../../core/recorder';

export const recorderReactImpl = createComponentImplementation(
  KalturaRecorderApi,
  ({ props }) => <RecorderCore {...props} />,
);
