import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaRecorderApi = {
  name: 'KalturaRecorder',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    uiconfId: z.number().optional(),
    category: CommonSchemas.DynamicString.optional(),
    entryName: CommonSchemas.DynamicString.optional(),
    allowScreen: z.boolean().optional(),
    allowCamera: z.boolean().optional(),
  }),
};
