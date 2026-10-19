import { createElement, useLayoutEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { z } from 'zod';
import { ANALYTICS_REPORT_TYPES, KalturaAnalyticsApi } from '../schemas/analytics';
import { LoadError, withValidatedProps } from './validate-props';
import { withKs } from './ks';
import { resolveRegion } from './region';

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
  navigate: { url: string; queryParams?: { id: string } };
  filters: Record<string, string>;
}

const MIN_HEIGHT = 400;
const MAX_HEIGHT = 10000;

/** The Analytics app of a region. It holds no KS and no ids: those travel by `postMessage`. */
export function buildAnalyticsUrl(region?: string): string {
  return `${resolveRegion(region).hosts.kmc}/apps/kmc-analytics/latest/index.html`;
}

/** The prop that names the subject, with its route in the Analytics app. */
const SUBJECTS = [
  ['entryId', 'entry'],
  ['categoryId', 'category'],
  ['playlistId', 'playlist'],
  ['virtualEventId', 'virtual-event'],
] as const;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * Maps the props to the `navigate` and `updateFilters` messages. A subject (an
 * entry, category, playlist or virtual event) wins over a report type. Both dates
 * are needed for a range, else the last 30 days.
 * Throws a plain `Invalid <prop>` error for a bad value.
 */
export function analyticsNavigation(props: Omit<AnalyticsCoreProps, 'partnerId'>): AnalyticsNavigation {
  const bad = invalidNavigationProp(props);
  if (bad) throw new Error(`Invalid ${bad}`);
  const { reportType, fromDate, toDate } = props;
  const ranged = Boolean(fromDate || toDate);
  const subject = SUBJECTS.find(([prop]) => props[prop]);
  return {
    navigate: subject ? { url: `/analytics/${subject[1]}`, queryParams: { id: props[subject[0]] as string } } : { url: `/analytics/${reportType || 'engagement'}` },
    filters: ranged ? { dateFrom: fromDate as string, dateTo: toDate as string } : { dateBy: 'last30days' },
  };
}

/** The first of the subjects, `reportType`, `fromDate` and `toDate` that `analyticsNavigation` refuses. A second subject is refused. */
function invalidNavigationProp(props: Omit<AnalyticsCoreProps, 'partnerId'>) {
  const { reportType, fromDate, toDate } = props;
  const second = SUBJECTS.filter(([prop]) => props[prop])[1];
  if (second) return second[0];
  if (reportType && !(ANALYTICS_REPORT_TYPES as readonly string[]).includes(reportType)) return 'reportType';
  if ((fromDate || toDate) && !isIsoDate(fromDate)) return 'fromDate';
  if ((fromDate || toDate) && !isIsoDate(toDate)) return 'toDate';
  if (fromDate && toDate && fromDate > toDate) return 'toDate';
  return undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The iframe and its `postMessage` handshake. The KS goes only into the `init`
 * and `updateConfig` messages, sent to the Analytics origin and nowhere else.
 * A new `ks` prop renews the session in place, with no reload.
 */
export const AnalyticsFrame: FC<{ partnerId: number; region?: string; ks: string; nav: AnalyticsNavigation }> = ({ partnerId, region, ks, nav }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>();
  const hosts = resolveRegion(region).hosts;
  const src = buildAnalyticsUrl(region);
  const origin = new URL(src).origin;
  const latest = useRef({ partnerId, ks, nav });
  const session = useRef({ ready: false, sentKs: '' });
  const navKey = JSON.stringify(nav);

  const post = (messageType: string, payload?: unknown) => frameRef.current?.contentWindow?.postMessage({ messageType, payload }, origin);
  const sendNav = () => {
    post('navigate', latest.current.nav.navigate);
    post('updateFilters', { queryParams: latest.current.nav.filters });
  };
  const sendKs = () => {
    session.current.sentKs = latest.current.ks;
    post('updateConfig', { ks: latest.current.ks });
  };

  latest.current = { partnerId, ks, nav };

  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.origin !== origin || event.source !== frame.contentWindow || !isRecord(event.data)) return;
      const { messageType, payload } = event.data;
      if (messageType === 'analyticsInit') {
        const viewsConfig = isRecord(payload) && isRecord(payload.viewsConfig) ? payload.viewsConfig : undefined;
        session.current = { ready: false, sentKs: latest.current.ks };
        post('init', {
          kalturaServer: { uri: hosts.serviceUrl },
          cdnServers: { serverUri: hosts.cdn, securedServerUri: hosts.cdn },
          ks: latest.current.ks,
          pid: latest.current.partnerId,
          locale: 'en',
          live: { pollInterval: 30, healthNotificationsCount: 50 },
          menuConfig: { showMenu: false },
          ...(viewsConfig ? { viewsConfig } : {}),
        });
      } else if (messageType === 'analyticsInitComplete') {
        session.current.ready = true;
        sendNav();
        if (session.current.sentKs !== latest.current.ks) sendKs();
      } else if (messageType === 'updateLayout' && isRecord(payload) && typeof payload.height === 'number' && Number.isFinite(payload.height)) {
        setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, payload.height)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      session.current.ready = false;
    };
    // post, sendNav and sendKs only read refs and the origin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, hosts.serviceUrl, hosts.cdn]);

  useLayoutEffect(() => {
    if (session.current.ready && session.current.sentKs !== ks) sendKs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ks]);

  useLayoutEffect(() => {
    if (session.current.ready) sendNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  return (
    <div className="kaltura-analytics-container" style={height ? { width: '100%', height } : { width: '100%', aspectRatio: '16/9' }}>
      <iframe
        ref={frameRef}
        key={`${src}|${hosts.serviceUrl}|${hosts.cdn}`}
        src={src}
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="fullscreen *"
        title="Kaltura Analytics Dashboard"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

const AnalyticsView: FC<AnalyticsCoreProps & { ks: string }> = ({ partnerId, region, ks, ...filters }) => {
  let nav: AnalyticsNavigation;
  try {
    resolveRegion(region);
    nav = analyticsNavigation(filters);
  } catch (e) {
    return <LoadError widget="analytics">{`Failed to load analytics: ${(e as Error).message}`}</LoadError>;
  }
  return <AnalyticsFrame partnerId={partnerId} region={region} ks={ks} nav={nav} />;
};

const Validated = withKs('analytics', withValidatedProps(KalturaAnalyticsApi.schema.extend({ ks: z.string() }), 'analytics', AnalyticsView, 'analytics'), {
  schema: KalturaAnalyticsApi.schema,
  label: 'analytics',
  check: props => [invalidNavigationProp(props)].filter(name => name !== undefined),
});

/** The analytics app takes its KS from `setKsProvider` only. A `ks` prop is dropped: it is an ADMIN KS. */
export const AnalyticsCore: FC<AnalyticsCoreProps> = props => createElement(Validated, { ...props, ks: undefined });
