import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v1_0';

export const KalturaRecorderApi = {
  name: 'KalturaRecorder',
  schema: z.object({
    partnerId: z.number().int().positive(),
    region: z.string().optional(),
    // A player uiConf. The recorder uses it to play the recording back.
    uiconfId: z.number().int().positive(),
    // Default name of the entry the recorder creates.
    entryName: z.string().max(256).optional(),
    allowVideo: z.boolean().optional(),
    allowAudio: z.boolean().optional(),
    allowScreenShare: z.boolean().optional(),
    // Seconds. The recording stops by itself at this limit.
    maxRecordingTime: z.number().int().positive().max(86400).optional(),
    // Fixes the capture orientation and hides the user's control. Use portrait for vertical video.
    orientation: z.enum(['portrait', 'landscape']).optional(),
    // A script that opens in the teleprompter. The user can edit it. Never invent one.
    prompterText: z.string().max(27000).optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
