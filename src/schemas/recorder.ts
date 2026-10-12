import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaRecorderApi = {
  name: 'KalturaRecorder',
  schema: z.object({
    partnerId: z.number().int().positive(),
    ks: CommonSchemas.DynamicString,
    // 0 means the default recorder uiConf.
    uiconfId: z.number().int().nonnegative().optional(),
    category: CommonSchemas.DynamicString.optional(),
    entryName: CommonSchemas.DynamicString.optional(),
    allowScreen: z.boolean().optional(),
    allowCamera: z.boolean().optional(),
  }),
};
