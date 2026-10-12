// Renders A2UI components through a real surface, with an optional data model.
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageProcessor, type Catalog } from '@a2ui/web_core/v0_9';
import { A2uiSurface, MarkdownContext, type ReactComponentImplementation } from '@a2ui/react/v0_9';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface SurfaceOptions {
  /** Catalogs the host registers. Defaults to `[catalog]`. */
  registered?: Catalog<ReactComponentImplementation>[];
  /** The renderer the host puts in MarkdownContext. */
  markdown?: (text: string) => Promise<string>;
}

/** Renders a surface whose createSurface names `catalog.id`. */
export async function renderSurface(
  catalog: Catalog<ReactComponentImplementation>,
  components: Array<Record<string, unknown>>,
  dataModel?: Record<string, unknown>,
  { registered = [catalog], markdown }: SurfaceOptions = {},
) {
  const processor = new MessageProcessor(registered);
  processor.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: catalog.id } },
    ...(dataModel ? [{ version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: dataModel } }] : []),
    { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
  ] as never);
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  const surface = createElement(A2uiSurface, { surface: processor.model.getSurface('s')! });
  await act(async () => root.render(createElement(MarkdownContext.Provider, { value: markdown }, surface)));
  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });
  return {
    host,
    root,
    /** Sets one data model value, as an agent or host update would. */
    update: async (path: string, value: unknown) => {
      await act(async () => {
        processor.processMessages([{ version: 'v0.9', updateDataModel: { surfaceId: 's', path, value } }] as never);
      });
    },
  };
}
