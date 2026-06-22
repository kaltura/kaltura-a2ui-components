import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaAvatarApi = {
  name: 'KalturaAvatar',
  schema: z.object({
    avatarId: CommonSchemas.DynamicString,
    projectId: CommonSchemas.DynamicString.optional(),
    language: CommonSchemas.DynamicString.optional(),
    autoStart: z.boolean().optional(),
    allowInterrupt: z.boolean().optional(),
  }),
};
