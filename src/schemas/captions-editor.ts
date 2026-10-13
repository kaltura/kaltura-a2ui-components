import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaCaptionsEditorApi = {
  name: 'KalturaCaptionsEditor',
  schema: z.object({
    partnerId: z.number().int().positive(),
    ks: CommonSchemas.DynamicString.optional(),
    entryId: CommonSchemas.DynamicString,
    uiconfId: z.number().int().positive().optional(),
  }),
};
