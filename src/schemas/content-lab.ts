import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaContentLabApi = {
  name: 'KalturaContentLab',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    serverUrl: CommonSchemas.DynamicString,
    entryId: CommonSchemas.DynamicString.optional(),
  }),
};
