// Covers: T18 (D22). The catalog the bundle builds and the catalog JSON agree on id,
// protocol version, component names and function names, return types and callers.
import { describe, it, expect } from 'vitest';
import { kalturaReactCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';
import { loadCatalog } from './helpers';

const json = loadCatalog();
// `@index` is a runtime function of the SDK for list templates. The official basic catalog JSON does not list it either.
const functions = ([...kalturaReactCatalog.functions.values()] as unknown as Array<{ name: string; returnType?: string; allowedCallers?: string }>).filter(fn => fn.name !== '@index');

describe('T18: the built catalog matches kaltura_catalog.json', () => {
  it('T18: id and protocol version', () => {
    expect([kalturaReactCatalog.id, kalturaReactCatalog.protocolVersion, json.$id, json.catalogId, json.protocolVersion, KALTURA_CATALOG_ID]).toEqual([
      KALTURA_CATALOG_ID,
      '1.0',
      KALTURA_CATALOG_ID,
      KALTURA_CATALOG_ID,
      '1.0',
      KALTURA_CATALOG_ID,
    ]);
  });

  it('T18: the same component names', () => {
    expect([...kalturaReactCatalog.components.keys()].sort()).toEqual(Object.keys(json.components).sort());
  });

  it('T18: the same function names', () => {
    expect(functions.map(fn => fn.name).sort()).toEqual(Object.keys(json.functions).sort());
  });

  it.each(Object.keys(json.functions))('T18: %s has the same return type and callers', name => {
    const built = functions.find(fn => fn.name === name);
    const declared = json.functions[name];
    expect([built?.returnType, built?.allowedCallers ?? 'rendererOnly']).toEqual([declared.returnType, declared.allowedCallers ?? 'rendererOnly']);
  });
});
