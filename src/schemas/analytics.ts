import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaAnalyticsApi = {
  name: 'KalturaAnalytics',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    entryId: CommonSchemas.DynamicString.optional(),
    reportType: CommonSchemas.DynamicString.optional(),
    fromDate: CommonSchemas.DynamicString.optional(),
    toDate: CommonSchemas.DynamicString.optional(),
  }),
};
