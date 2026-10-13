import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  KALTURA_CATALOG_ID,
  kalturaReactCatalog,
  buildKalturaCatalog,
  loadKalturaCatalog,
  kalturaComponentImpls,
  kalturaClientFunctions,
} from '../src/adapters/react/index';
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog';

const ALL_COMPONENTS = [
  'KalturaPlayer',
  'KalturaFlashcards',
  'KalturaMediaManager',
  'KalturaAnalytics',
  'KalturaCaptionsEditor',
  'KalturaRecorder',
  'KalturaAvatar',
  'KalturaGenie',
  'KalturaContentLab',
  'KalturaAgentsWidget',
  'KalturaVodAvatar',
  'KalturaChart',
] as const;

describe('kalturaReactCatalog', () => {
  it('is keyed by the canonical Kaltura catalog id', () => {
    expect(kalturaReactCatalog.id).toBe(KALTURA_CATALOG_ID);
  });

  it('registers all 12 Kaltura Experience Components', () => {
    for (const name of ALL_COMPONENTS) {
      expect(kalturaReactCatalog.components.has(name)).toBe(true);
    }
  });

  it('includes every basic-catalog component (merged, not replaced)', () => {
    for (const name of basicCatalog.components.keys()) {
      expect(kalturaReactCatalog.components.has(name)).toBe(true);
    }
  });

  it('merges the copyToClipboard client function on top of the basic functions', () => {
    expect(kalturaReactCatalog.functions.has('copyToClipboard')).toBe(true);
    for (const name of basicCatalog.functions.keys()) {
      expect(kalturaReactCatalog.functions.has(name)).toBe(true);
    }
  });

  it('exposes exactly 12 component implementations and one client function', () => {
    expect(kalturaComponentImpls).toHaveLength(12);
    expect(kalturaClientFunctions).toHaveLength(1);
  });
});

describe('buildKalturaCatalog', () => {
  it('honours an explicit catalog id override', () => {
    const custom = buildKalturaCatalog('https://example.com/catalog.json');
    expect(custom.id).toBe('https://example.com/catalog.json');
    expect(custom.components.has('KalturaPlayer')).toBe(true);
  });
});

describe('kaltura_catalog.json matches what the renderer serves (F9)', () => {
  const json = JSON.parse(readFileSync('src/catalog/kaltura_catalog.json', 'utf8')) as {
    catalogId: string;
    components: Record<string, unknown>;
    functions: Record<string, unknown>;
  };

  it('F9: the component names are the same', () => {
    expect([...kalturaReactCatalog.components.keys()].sort()).toEqual(Object.keys(json.components).sort());
  });

  it('F9: the function names are the same', () => {
    expect([...kalturaReactCatalog.functions.keys()].sort()).toEqual(Object.keys(json.functions).sort());
  });

  it('F9: the catalog id is the same', () => {
    expect(kalturaReactCatalog.id).toBe(json.catalogId);
  });

  it('F30: the theme schema is the basic one, as in the JSON', () => {
    expect(kalturaReactCatalog.themeSchema).toBe(basicCatalog.themeSchema);
  });
});

describe('loadKalturaCatalog', () => {
  it('builds a catalog keyed by the fetched descriptor catalogId', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ catalogId: 'https://fetched.example/catalog.json' }), {
        status: 200,
      })) as typeof fetch;
    try {
      const catalog = await loadKalturaCatalog('https://fetched.example/catalog.json');
      expect(catalog.id).toBe('https://fetched.example/catalog.json');
      expect(catalog.components.has('KalturaPlayer')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on a non-ok response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('not found', { status: 404, statusText: 'Not Found' })) as typeof fetch;
    try {
      await expect(loadKalturaCatalog('https://missing.example/catalog.json')).rejects.toThrow(
        /404/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('setExtraAllowedOrigins export', () => {
  it('SEC-01: the React adapter exports the host-only origin setters', async () => {
    const react = await import('../src/adapters/react/index');
    const loader = await import('../src/core/unisphere-loader');
    expect([react.setExtraAllowedOrigins, react.getExtraAllowedOrigins]).toEqual([
      loader.setExtraAllowedOrigins,
      loader.getExtraAllowedOrigins,
    ]);
  });

  it('SEC-01: the web component adapter exports the host-only origin setters', async () => {
    const wc = await import('../src/adapters/webcomponent/index');
    const loader = await import('../src/core/unisphere-loader');
    expect([wc.setExtraAllowedOrigins, wc.getExtraAllowedOrigins]).toEqual([
      loader.setExtraAllowedOrigins,
      loader.getExtraAllowedOrigins,
    ]);
  });

  it('SEC-01: an added origin is stored and can be cleared', async () => {
    const { setExtraAllowedOrigins, getExtraAllowedOrigins } = await import('../src/adapters/react/index');
    try {
      setExtraAllowedOrigins(['https://unisphere.example.com']);
      expect(getExtraAllowedOrigins()).toEqual(['https://unisphere.example.com']);
    } finally {
      setExtraAllowedOrigins([]);
    }
  });
});
