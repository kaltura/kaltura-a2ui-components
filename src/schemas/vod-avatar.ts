import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaVodAvatarApi = {
  name: 'KalturaVodAvatar',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    initialView: z.enum(['videoLibrary', 'editVideo', 'projectBuilder']).optional(),
    additionalEsearchFilters: z.array(z.object({ fieldName: z.string(), itemType: z.number().int(), searchTerm: z.union([z.string(), z.number()]) })).optional(),
    serverUrl: CommonSchemas.DynamicString.optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
