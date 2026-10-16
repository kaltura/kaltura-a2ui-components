import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

// No `ks` prop: the avatar takes its KS from the host provider only, because
// the KS picks the agent. Except serverUrl, props are plain values, no data bindings.
export const KalturaAvatarApi = {
  name: 'KalturaAvatar',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    serverUrl: CommonSchemas.DynamicString.optional(),
    autoConnect: z.boolean().optional(),
    openingPhrase: z.string().max(500).optional(),
    captions: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'studio']).optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
