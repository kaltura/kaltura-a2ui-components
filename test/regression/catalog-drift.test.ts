// Covers: E2E-02 / QA-05 (the catalog and the zod schemas agree, the catalog
// serverUrl example ends in /v1) and QA-10 (loadKalturaCatalog always returns the default id).
import { describe, it, expect, afterEach, vi } from 'vitest';
import catalog from '../../src/catalog/kaltura_catalog.json';
import { KalturaPlayerApi } from '../../src/schemas/player';
import { KalturaFlashcardsApi } from '../../src/schemas/flashcards';
import { KalturaMediaManagerApi } from '../../src/schemas/media-manager';
import { KalturaAnalyticsApi } from '../../src/schemas/analytics';
import { KalturaCaptionsEditorApi } from '../../src/schemas/captions-editor';
import { KalturaRecorderApi } from '../../src/schemas/recorder';
import { KalturaAvatarApi } from '../../src/schemas/avatar';
import { KalturaGenieApi } from '../../src/schemas/genie';
import { KalturaContentLabApi } from '../../src/schemas/content-lab';
import { KalturaAgentsWidgetApi } from '../../src/schemas/agents-widget';
import { KalturaVodAvatarApi } from '../../src/schemas/vod-avatar';
import { KalturaChartApi } from '../../src/schemas/chart';

const APIS = [
  KalturaPlayerApi,
  KalturaFlashcardsApi,
  KalturaMediaManagerApi,
  KalturaAnalyticsApi,
  KalturaCaptionsEditorApi,
  KalturaRecorderApi,
  KalturaAvatarApi,
  KalturaGenieApi,
  KalturaContentLabApi,
  KalturaAgentsWidgetApi,
  KalturaVodAvatarApi,
  KalturaChartApi,
];

type CatalogComponent = { allOf: { properties?: Record<string, unknown> }[] };
const catalogKeys = (name: string): string[] => {
  const component = (catalog.components as unknown as Record<string, CatalogComponent>)[name];
  const own = component.allOf.find(part => part.properties?.component);
  return Object.keys(own?.properties ?? {}).filter(k => k !== 'component');
};

describe('QA-05: zod schema and catalog list the same props', () => {
  it.each(APIS.map(api => [api.name, api] as const))('QA-05: %s', (name, api) => {
    expect(Object.keys(api.schema.shape).sort()).toEqual(catalogKeys(name).sort());
  });

  it('QA-05: the Media Manager mode default matches the core default (select)', () => {
    const component = (catalog.components as unknown as Record<string, CatalogComponent>).KalturaMediaManager;
    const props = Object.assign({}, ...component.allOf.map(part => part.properties ?? {})) as Record<string, { default?: string }>;
    expect(props.mode.default).toBe('select');
  });

  it('QA-05: every serverUrl example in the catalog ends with /v1', () => {
    const examples = JSON.stringify(catalog).match(/e\.g\. '(https:\/\/[^']+)'/g) ?? [];
    expect(examples.filter(e => !/\/v1'$/.test(e))).toEqual([]);
  });
});

describe('QA-10: loadKalturaCatalog', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });
  const serve = (body: unknown) => {
    globalThis.fetch = (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
  };

  it('QA-10: uses catalogId from the fetched descriptor', async () => {
    const { loadKalturaCatalog } = await import('../../src/adapters/react/index');
    serve({ ...catalog, catalogId: 'https://example.test/other/catalog.json' });
    expect((await loadKalturaCatalog('https://x/c.json')).id).toBe('https://example.test/other/catalog.json');
  });

  it('QA-10: falls back to $id when the descriptor has no catalogId', async () => {
    const { loadKalturaCatalog } = await import('../../src/adapters/react/index');
    serve({ $id: 'https://example.test/other/catalog.json' });
    expect((await loadKalturaCatalog('https://x/c.json')).id).toBe('https://example.test/other/catalog.json');
  });

  it('QA-10: the real catalog JSON yields the canonical id (control)', async () => {
    const { loadKalturaCatalog, KALTURA_CATALOG_ID } = await import('../../src/adapters/react/index');
    serve(catalog);
    expect((await loadKalturaCatalog('https://x/c.json')).id).toBe(KALTURA_CATALOG_ID);
  });
});
