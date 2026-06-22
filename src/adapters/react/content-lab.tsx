import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaContentLabApi } from '../../schemas/content-lab';
import { ContentLabCore } from '../../core/content-lab';

export const contentLabReactImpl = createComponentImplementation(
  KalturaContentLabApi,
  ({ props }) => <ContentLabCore {...props} />,
);
