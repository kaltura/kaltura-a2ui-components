import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaCaptionsEditorApi = {
  name: 'KalturaCaptionsEditor',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    entryId: CommonSchemas.DynamicString,
    assetId: CommonSchemas.DynamicString.optional(),
    uiconfId: z.number().int().positive().optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
