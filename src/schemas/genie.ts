import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaGenieApi = {
  name: 'KalturaGenie',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    serverUrl: CommonSchemas.DynamicString.optional(),
    uiconfId: z.number().int().positive(),
    categoryId: CommonSchemas.DynamicString.optional(),
    language: CommonSchemas.DynamicString.optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
