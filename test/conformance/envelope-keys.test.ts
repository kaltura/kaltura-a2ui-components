// Covers: T8. Pins how the installed @a2ui/web_core reads the `accessibility` key on a component.
// This version takes the bare key and rejects `@accessibility`. When a bump changes that, this test
// fails. Then move the catalog, fixtures and docs to the new key (plan follow-up F1).
import { describe, it, expect } from 'vitest';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { buildKalturaCatalog } from '../../src/adapters/react/index';

const send = (key: string) => {
  const catalog = buildKalturaCatalog();
  const processor = new MessageProcessor([catalog] as never);
  const messages = [
    { version: '1.0', createSurface: { surfaceId: 's', catalogId: catalog.id } },
    { version: '1.0', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Text', text: 'x', [key]: { label: 'L' } }] } },
  ];
  return () => processor.processMessages(messages as never);
};

describe('T8: the accessibility key on a component', () => {
  it('T8: the bare key is accepted', () => {
    expect(send('accessibility')).not.toThrow();
  });

  it('T8: the "@accessibility" key is rejected as an unknown key', () => {
    expect(send('@accessibility')).toThrow(/Unrecognized key\(s\) in object: '@accessibility'/);
  });
});
