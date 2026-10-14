import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaAgentsWidgetApi = {
  name: 'KalturaAgentsWidget',
  schema: z.object({
    partnerId: z.number().int().positive(),
    serverUrl: CommonSchemas.DynamicString,
    action: CommonSchemas.Action.optional(),
  }),
};
