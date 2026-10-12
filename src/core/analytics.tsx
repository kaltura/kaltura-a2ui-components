import type { FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaAnalyticsApi } from '../schemas/analytics';
import { withValidatedProps } from './validate-props';

export interface AnalyticsCoreProps {
  partnerId: number;
  ks: string;
  entryId?: string;
  reportType?: string;
  fromDate?: string;
  toDate?: string;
}

export function buildAnalyticsUrl(p: AnalyticsCoreProps): string {
  if (!isPositiveInt(p.partnerId)) throw new Error('Invalid partnerId');
  if (p.entryId && !isEntryId(p.entryId)) throw new Error('Invalid entryId');
  const params = new URLSearchParams({ ks: p.ks, partnerId: String(p.partnerId) });
  if (p.entryId) params.set('entryId', p.entryId);
  if (p.reportType) params.set('reportType', p.reportType);
  if (p.fromDate) params.set('fromDate', p.fromDate);
  if (p.toDate) params.set('toDate', p.toDate);
  return `https://kmc.kaltura.com/index.php/kmcng/analytics?${params}`;
}

const AnalyticsView: FC<AnalyticsCoreProps> = (props) => {
  let src: string;
  try {
    src = buildAnalyticsUrl(props);
  } catch (e) {
    return <div className="kaltura-load-error">Failed to load analytics: {(e as Error).message}</div>;
  }
  return (
    <div className="kaltura-analytics-container" style={{ width: '100%', aspectRatio: '16/9' }}>
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="fullscreen *"
        title="Kaltura Analytics Dashboard"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export const AnalyticsCore = withValidatedProps(KalturaAnalyticsApi.schema, 'analytics', AnalyticsView);
