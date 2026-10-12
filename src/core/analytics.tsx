import type { FC } from 'react';
import { isEntryId, isPositiveInt } from './ids';
import { KalturaAnalyticsApi } from '../schemas/analytics';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';

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
  let src =
    `https://kmc.kaltura.com/index.php/kmcng/analytics` +
    `?ks=${encodeURIComponent(p.ks)}&partnerId=${p.partnerId}`;
  if (p.entryId) src += `&entryId=${encodeURIComponent(p.entryId)}`;
  if (p.reportType) src += `&reportType=${encodeURIComponent(p.reportType)}`;
  if (p.fromDate) src += `&fromDate=${encodeURIComponent(p.fromDate)}`;
  if (p.toDate) src += `&toDate=${encodeURIComponent(p.toDate)}`;
  return src;
}

const AnalyticsView: FC<AnalyticsCoreProps> = (props) => {
  let src: string;
  try {
    src = buildAnalyticsUrl(props);
  } catch (e) {
    return <LoadError>Failed to load analytics: {(e as Error).message}</LoadError>;
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

export const AnalyticsCore = withKs(
  'analytics',
  withValidatedProps(KalturaAnalyticsApi.schema.required({ ks: true }), 'analytics', AnalyticsView),
);
