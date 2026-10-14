import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

const ClipSchema = z.object({
  // Not checked here, so one bad clip cannot fail the deck. ClipPlayer checks
  // each clip with isEntryId (core/ids.ts) and shows "This clip cannot be shown."
  entryId: z.unknown(),
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
    action: CommonSchemas.Action.optional(),
  }),
};
