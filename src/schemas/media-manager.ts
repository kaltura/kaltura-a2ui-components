import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaMediaManagerApi = {
  name: 'KalturaMediaManager',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    serverUrl: CommonSchemas.DynamicString.optional(),
    theme: z.enum(['dark', 'light']).optional(),
    mode: z.enum(['select', 'manage']).optional(),
    multiSelect: z.boolean().optional(),
    contextId: CommonSchemas.DynamicString.optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
