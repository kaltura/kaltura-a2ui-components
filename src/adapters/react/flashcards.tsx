import { createComponentImplementation } from '@a2ui/react/v0_9';
import { KalturaFlashcardsApi } from '../../schemas/flashcards';
import { FlashcardsCore, type FlashcardsCoreProps } from '../../core/flashcards';

export const flashcardsReactImpl = createComponentImplementation(
  KalturaFlashcardsApi,
  // The GenericBinder recursively resolves DynamicString fields nested inside
  // `cards[]`/`clips[]` to scalars at runtime (verified in
  // @a2ui/web_core generic-binder: scrapeSchemaBehavior builds ARRAY/OBJECT
  // nodes and resolveAndBind resolves DYNAMIC values). The SDK's
  // ResolveA2uiProps type only maps top-level keys, so the nested unions
  // survive at the type level — narrow them here.
  ({ props }) => <FlashcardsCore {...(props as unknown as FlashcardsCoreProps)} />,
);
