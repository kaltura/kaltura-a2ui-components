import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaRecorderApi = {
  name: 'KalturaRecorder',
  schema: z.object({
    partnerId: z.number().int().positive(),
    ks: CommonSchemas.DynamicString.optional(),
    // A player uiConf. The Express Recorder uses it to preview the recording.
    uiconfId: z.number().int().positive(),
    // Default name of the entry the recorder creates.
    entryName: z.string().max(256).optional(),
    allowVideo: z.boolean().optional(),
    allowAudio: z.boolean().optional(),
    allowScreenShare: z.boolean().optional(),
    // Seconds. The recording stops by itself at this limit.
    maxRecordingTime: z.number().int().positive().max(86400).optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
