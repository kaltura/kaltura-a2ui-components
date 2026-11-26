// Covers: T8. Pins how the installed @a2ui/web_core reads the `accessibility` key on a component.
// From 0.16 the key is `@accessibility` (catalog v4, ADR 0012) and the bare key is still read. When a
// bump stops reading the bare key, the second test fails: tell hosts that v3 streams no longer render.
import { describe, it, expect } from 'vitest';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { buildKalturaCatalog } from '../../src/adapters/react/index';

const V3_ID = 'https://kaltura.github.io/a2ui/v3/catalog.json';

const send = (key: string, catalogId?: string) => {
  const catalog = buildKalturaCatalog(catalogId);
  const processor = new MessageProcessor([catalog] as never);
  const messages = [
    { version: '1.0', createSurface: { surfaceId: 's', catalogId: catalog.id } },
    { version: '1.0', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Text', text: 'x', [key]: { label: 'L' } }] } },
  ];
  return () => processor.processMessages(messages as never);
};

describe('T8: the accessibility key on a component', () => {
  it('T8: the "@accessibility" key is accepted', () => {
    expect(send('@accessibility')).not.toThrow();
  });

  it('T8: the bare key is still read, so a v3 stream renders in a catalog that carries the v3 id', () => {
    expect(send('accessibility', V3_ID)).not.toThrow();
  });
});
