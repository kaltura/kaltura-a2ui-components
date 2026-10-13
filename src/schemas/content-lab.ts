import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaContentLabApi = {
  name: 'KalturaContentLab',
  schema: z.object({
    partnerId: z.number().int().positive(),
    ks: CommonSchemas.DynamicString.optional(),
    serverUrl: CommonSchemas.DynamicString,
    uiconfId: z.number().int().positive(),
    entryId: CommonSchemas.DynamicString,
  }),
};
