import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaAgentsWidgetApi = {
  name: 'KalturaAgentsWidget',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    serverUrl: CommonSchemas.DynamicString.optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
