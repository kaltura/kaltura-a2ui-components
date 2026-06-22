import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaGenieApi = {
  name: 'KalturaGenie',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    serverUrl: CommonSchemas.DynamicString,
    categoryId: CommonSchemas.DynamicString.optional(),
    language: CommonSchemas.DynamicString.optional(),
  }),
};
