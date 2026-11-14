import type { FC } from 'react';
export interface AnalyticsCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Region code or host-registered environment name. Default: the host region. */
    region?: string;
    /** Shows the analytics of this entry. Wins over `reportType`. One of the four subjects at most. */
    entryId?: string;
    /** Shows the analytics of this category. Wins over `reportType`. */
    categoryId?: string;
    /** Shows the analytics of this playlist. Wins over `reportType`. */
    playlistId?: string;
    /** Shows the analytics of this virtual event. Wins over `reportType`. */
    virtualEventId?: string;
    /** Dashboard view when there is no subject. Default: `engagement`. */
    reportType?: string;
    /** Start of the range, `YYYY-MM-DD`. Needs `toDate`. Default: the last 30 days. */
    fromDate?: string;
    /** End of the range, `YYYY-MM-DD`. Needs `fromDate`. */
    toDate?: string;
}
export interface AnalyticsNavigation {
    navigate: {
        url: string;
        queryParams?: {
            id: string;
        };
    };
    filters: Record<string, string>;
}
/** The Analytics app of a region. It holds no KS and no ids: those travel by `postMessage`. */
export declare function buildAnalyticsUrl(region?: string): string;
/**
 * Maps the props to the `navigate` and `updateFilters` messages. A subject (an
 * entry, category, playlist or virtual event) wins over a report type. Both dates
 * are needed for a range, else the last 30 days.
 * Throws a plain `Invalid <prop>` error for a bad value.
 */
export declare function analyticsNavigation(props: Omit<AnalyticsCoreProps, 'partnerId'>): AnalyticsNavigation;
/**
 * The iframe and its `postMessage` handshake. The KS goes only into the `init`
 * and `updateConfig` messages, sent to the Analytics origin and nowhere else.
 * A new `ks` prop renews the session in place, with no reload.
 */
export declare const AnalyticsFrame: FC<{
    partnerId: number;
    region?: string;
    ks: string;
    nav: AnalyticsNavigation;
}>;
/** The analytics app takes its KS from `setKsProvider` only. A `ks` prop is dropped: it is an ADMIN KS. */
export declare const AnalyticsCore: FC<AnalyticsCoreProps>;
//# sourceMappingURL=analytics.d.ts.map