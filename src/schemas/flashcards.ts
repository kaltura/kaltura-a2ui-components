import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

const ClipSchema = z.object({
  // Same rule as isEntryId in core/ids.ts. A test keeps both in step.
  entryId: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
  startTime: z.number(),
  endTime: z.number(),
  title: z.string().optional(),
  thumbnail: z.string().optional(),
});

const CardSchema = z.object({
  title: CommonSchemas.DynamicString,
  subtitle: CommonSchemas.DynamicString.optional(),
  content: CommonSchemas.DynamicString,
  clips: z.array(ClipSchema).optional(),
});

export const KalturaFlashcardsApi = {
  name: 'KalturaFlashcards',
  schema: z.object({
    title: CommonSchemas.DynamicString,
    summary: CommonSchemas.DynamicString.optional(),
    cards: z.array(CardSchema),
    partnerId: z.number().int().positive().optional(),
    uiconfId: z.number().int().positive().optional(),
    ks: CommonSchemas.DynamicString.optional(),
  }),
};
