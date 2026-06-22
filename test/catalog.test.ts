import { describe, it, expect } from 'vitest';
import catalog from '../src/catalog/kaltura_catalog.json';

// The published catalog is the contract tier-1 A2UI clients negotiate against.
// These tests lock the invariants that other agents/clients depend on: the
// canonical id, all 12 shipped components, and the x-kaltura-adapters descriptor
// that tells clients where to load the renderers.

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

describe('kaltura_catalog.json', () => {
  it('is keyed by the canonical catalog id in both $id and catalogId', () => {
    const id = 'https://kaltura.github.io/a2ui/v1/catalog.json';
    expect(catalog.$id).toBe(id);
    expect(catalog.catalogId).toBe(id);
  });

  it('declares all 12 Experience Components', () => {
    expect(Object.keys(catalog.components)).toEqual(
      expect.arrayContaining([...ALL_COMPONENTS]),
    );
    expect(Object.keys(catalog.components)).toHaveLength(ALL_COMPONENTS.length);
  });
});

describe('x-kaltura-adapters', () => {
  const adapters = catalog['x-kaltura-adapters'];

  it('names the package and source repository', () => {
    expect(adapters.package).toBe('@kaltura/a2ui-react');
    expect(adapters.repository).toBe('https://github.com/kaltura/kaltura-a2ui-components');
  });

  it('describes the react ESM adapter (npm + jsDelivr) keyed to the release tag', () => {
    expect(adapters.react.format).toBe('esm');
    expect(adapters.react.npm).toBe('@kaltura/a2ui-react');
    expect(adapters.react.cdn).toContain('cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@');
    expect(adapters.react.cdn).toContain('/dist/kaltura-react.mjs');
    expect(adapters.react.exports).toContain('buildKalturaCatalog');
  });

  it('describes the web-component IIFE adapter with an SRI slot and all custom elements', () => {
    expect(adapters.webcomponent.format).toBe('iife');
    expect(adapters.webcomponent.cdn).toContain('/dist/kaltura-wc.js');
    expect(adapters.webcomponent.customElements).toEqual(
      expect.arrayContaining([
        'kaltura-player',
        'kaltura-flashcards',
        'kaltura-media-manager',
        'kaltura-analytics',
        'kaltura-captions-editor',
        'kaltura-recorder',
        'kaltura-avatar',
        'kaltura-genie-widget',
        'kaltura-content-lab',
        'kaltura-agents-widget',
        'kaltura-vod-avatar-wc',
        'kaltura-chart',
      ]),
    );
    expect(adapters.webcomponent.customElements).toHaveLength(12);
  });

  // The committed source carries placeholders; build-and-release.yml stamps the
  // real tag + SRI onto the tagged commit (see the workflow's stamp step). Guard
  // that the placeholders are present so a release can substitute them, and that
  // a stamped release never ships an unresolved placeholder.
  it('carries release placeholders that CI substitutes', () => {
    const released = process.env.RELEASE_STAMPED === '1';
    const flat = JSON.stringify(adapters);
    if (released) {
      expect(flat).not.toContain('__RELEASE_TAG__');
      expect(flat).not.toContain('__WC_SRI__');
      expect(adapters.webcomponent.integrity).toMatch(/^sha384-/);
    } else {
      expect(adapters.react.cdn).toContain('__RELEASE_TAG__');
      expect(adapters.webcomponent.integrity).toBe('__WC_SRI__');
    }
  });
});
