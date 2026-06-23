import type { FC } from 'react';
export interface AnalyticsCoreProps {
    partnerId: number;
    ks: string;
    entryId?: string;
    reportType?: string;
    fromDate?: string;
    toDate?: string;
}
export declare function buildAnalyticsUrl(p: AnalyticsCoreProps): string;
export declare const AnalyticsCore: FC<AnalyticsCoreProps>;
//# sourceMappingURL=analytics.d.ts.map