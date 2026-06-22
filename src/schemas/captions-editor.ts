import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaCaptionsEditorApi = {
  name: 'KalturaCaptionsEditor',
  schema: z.object({
    partnerId: z.number(),
    ks: CommonSchemas.DynamicString,
    entryId: CommonSchemas.DynamicString,
    uiconfId: z.number().optional(),
  }),
};
