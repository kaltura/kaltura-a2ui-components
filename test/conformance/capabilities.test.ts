// Covers: T13, T25. The renderer offers the v3 catalog under the key "1.0".
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { buildKalturaCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';
import { loadCatalog } from './helpers';

const processor = () => new MessageProcessor([buildKalturaCatalog()] as never);

describe('T13: getRendererCapabilities', () => {
  it('T13: for "1.0" it lists the v3 catalog id', () => {
    expect(processor().getRendererCapabilities({ versions: ['1.0'] })).toEqual({ '1.0': { supportedCatalogIds: ['https://kaltura.github.io/a2ui/v3/catalog.json'] } });
  });

  it('T13: the id is the catalog JSON id and the exported constant', () => {
    expect([KALTURA_CATALOG_ID, loadCatalog().catalogId]).toEqual(['https://kaltura.github.io/a2ui/v3/catalog.json', KALTURA_CATALOG_ID]);
  });
});

describe('T25: the key is the version the host asks for', () => {
  // The processor does not check the version. The docs tell hosts to ask for "1.0" only.
  it('T25: only the asked versions appear as keys', () => {
    expect(Object.keys(processor().getRendererCapabilities({ versions: ['1.0'] }))).toEqual(['1.0']);
  });

  it('T25: the docs tell hosts to ask for "1.0"', () => {
    expect(readFileSync('docs/host-api.md', 'utf8')).toContain("getRendererCapabilities({ versions: ['1.0'] })");
  });
});
