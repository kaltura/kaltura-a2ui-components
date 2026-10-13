import { z } from 'zod';

// No `ks` prop: the avatar takes its KS from the host provider only, because
// the KS picks the agent. Plain values only, no data bindings.
export const KalturaAvatarApi = {
  name: 'KalturaAvatar',
  schema: z.object({
    partnerId: z.number().int().positive(),
    serverUrl: z.string().max(2048),
    autoConnect: z.boolean().optional(),
    openingPhrase: z.string().max(500).optional(),
    captions: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'studio']).optional(),
  }),
};
