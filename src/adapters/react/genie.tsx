import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaGenieApi } from '../../schemas/genie';
import { GenieCore } from '../../core/genie';

export const genieReactImpl = createComponentImplementation(
  KalturaGenieApi,
  ({ props }) => <GenieCore {...props} />,
);
