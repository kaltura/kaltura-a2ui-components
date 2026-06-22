import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaChartApi } from '../../schemas/chart';
import { ChartCore } from '../../core/chart';

export const chartReactImpl = createComponentImplementation(
  KalturaChartApi,
  ({ props }) => <ChartCore {...props} />,
);
