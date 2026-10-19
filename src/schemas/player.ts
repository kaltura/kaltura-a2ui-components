import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaPlayerApi = {
  name: 'KalturaPlayer',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    uiconfId: z.number().int().positive(),
    entryId: CommonSchemas.DynamicString.optional(),
    playlistId: CommonSchemas.DynamicString.optional(),
    autoplay: CommonSchemas.DynamicBoolean.optional(),
    muted: CommonSchemas.DynamicBoolean.optional(),
    startTime: CommonSchemas.DynamicNumber.optional(),
    clipTo: CommonSchemas.DynamicNumber.optional(),
    aspectRatio: CommonSchemas.DynamicString.optional(),
    entryName: CommonSchemas.DynamicString.optional(),
    entryDescription: CommonSchemas.DynamicString.optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
