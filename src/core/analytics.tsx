import type { FC } from 'react';

export interface AnalyticsCoreProps {
  partnerId: number;
  ks: string;
  entryId?: string;
  reportType?: string;
  fromDate?: string;
  toDate?: string;
}

export function buildAnalyticsUrl(p: AnalyticsCoreProps): string {
  let src =
    `https://kmc.kaltura.com/index.php/kmcng/analytics` +
    `?ks=${encodeURIComponent(p.ks)}&partnerId=${p.partnerId}`;
  if (p.entryId) src += `&entryId=${encodeURIComponent(p.entryId)}`;
  if (p.reportType) src += `&reportType=${encodeURIComponent(p.reportType)}`;
  if (p.fromDate) src += `&fromDate=${encodeURIComponent(p.fromDate)}`;
  if (p.toDate) src += `&toDate=${encodeURIComponent(p.toDate)}`;
  return src;
}

export const AnalyticsCore: FC<AnalyticsCoreProps> = (props) => {
  const src = buildAnalyticsUrl(props);
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
