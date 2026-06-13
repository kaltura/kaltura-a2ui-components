import { describe, it, expect } from 'vitest';
import {
  KALTURA_CATALOG_ID,
  kalturaReactCatalog,
  buildKalturaCatalog,
  loadKalturaCatalog,
  kalturaComponentImpls,
  kalturaClientFunctions,
} from '../src/adapters/react/index';
import { basicCatalog } from '@a2ui/react/v0_9';

describe('kalturaReactCatalog', () => {
  it('is keyed by the canonical Kaltura catalog id', () => {
    expect(kalturaReactCatalog.id).toBe(KALTURA_CATALOG_ID);
  });

  it('registers all three Kaltura Experience Components', () => {
    expect(kalturaReactCatalog.components.has('KalturaPlayer')).toBe(true);
    expect(kalturaReactCatalog.components.has('KalturaFlashcards')).toBe(true);
    expect(kalturaReactCatalog.components.has('KalturaMediaManager')).toBe(true);
  });

  it('does NOT register KalturaChart (deferred to issue #45)', () => {
    expect(kalturaReactCatalog.components.has('KalturaChart')).toBe(false);
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

  it('exposes exactly three component implementations and one client function', () => {
    expect(kalturaComponentImpls).toHaveLength(3);
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

describe('loadKalturaCatalog', () => {
  it('builds a catalog keyed by the fetched descriptor id', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ id: 'https://fetched.example/catalog.json' }), {
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
