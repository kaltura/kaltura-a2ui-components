import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaMediaManagerApi = {
  name: 'KalturaMediaManager',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    serverUrl: CommonSchemas.DynamicString,
    theme: z.enum(['dark', 'light']).optional(),
    mode: z.enum(['select', 'manage']).optional(),
    multiSelect: z.boolean().optional(),
    contextType: CommonSchemas.DynamicString.optional(),
    contextId: CommonSchemas.DynamicString.optional(),
    userId: CommonSchemas.DynamicString.optional(),
  }),
};
