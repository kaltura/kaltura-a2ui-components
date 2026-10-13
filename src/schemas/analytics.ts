import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

/** Dashboard views `reportType` can name. Each one is `/analytics/<name>` in the Analytics app. */
export const ANALYTICS_REPORT_TYPES = [
  'engagement',
  'content-interactions',
  'technology',
  'geo-location',
  'contributors',
  'overview',
  'publisher',
  'enduser',
  'live',
] as const;

// No `ks` prop: the analytics app gets its KS from the host provider only,
// because it is an ADMIN KS.
export const KalturaAnalyticsApi = {
  name: 'KalturaAnalytics',
  schema: z.object({
    partnerId: z.number().int().positive(),
    entryId: CommonSchemas.DynamicString.optional(),
    reportType: CommonSchemas.DynamicString.optional(),
    fromDate: CommonSchemas.DynamicString.optional(),
    toDate: CommonSchemas.DynamicString.optional(),
  }),
};
