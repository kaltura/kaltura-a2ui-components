import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaPlayerApi = {
  name: 'KalturaPlayer',
  schema: z.object({
    partnerId: CommonSchemas.DynamicNumber,
    uiconfId: CommonSchemas.DynamicNumber,
    entryId: CommonSchemas.DynamicString,
    ks: CommonSchemas.DynamicString.optional(),
    autoplay: CommonSchemas.DynamicBoolean.optional(),
    muted: CommonSchemas.DynamicBoolean.optional(),
    startTime: CommonSchemas.DynamicNumber.optional(),
    clipTo: CommonSchemas.DynamicNumber.optional(),
    aspectRatio: CommonSchemas.DynamicString.optional(),
    entryName: CommonSchemas.DynamicString.optional(),
    entryDescription: CommonSchemas.DynamicString.optional(),
  }),
};
