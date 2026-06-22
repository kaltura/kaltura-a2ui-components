import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaAnalyticsApi } from '../../schemas/analytics';
import { AnalyticsCore } from '../../core/analytics';

export const analyticsReactImpl = createComponentImplementation(
  KalturaAnalyticsApi,
  ({ props }) => <AnalyticsCore {...props} />,
);
