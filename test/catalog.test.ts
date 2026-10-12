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

  it('describes the react ESM adapter (git install + jsDelivr) keyed to the release tag', () => {
    expect(adapters.react.format).toBe('esm');
    expect(adapters.react.install).toBe('npm i github:kaltura/kaltura-a2ui-components#__RELEASE_TAG__');
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

  // The committed source carries placeholders. release.yml stamps them in the build
  // workspace only (scripts/stamp-catalog.mjs). The stamped result is checked by
  // scripts/release-verify-stamp.mjs and test/release/stamped-catalog.test.ts.
  it('carries the release placeholders that the release workflow substitutes', () => {
    expect([adapters.react.cdn, adapters.react.integrity, adapters.webcomponent.cdn, adapters.webcomponent.integrity]).toEqual([
      expect.stringContaining('@__RELEASE_TAG__/dist/kaltura-react.mjs'),
      '__REACT_SRI__',
      expect.stringContaining('@__RELEASE_TAG__/dist/kaltura-wc.js'),
      '__WC_SRI__',
    ]);
  });

  it('keeps placeholder tokens out of every description, so a stamped catalog has none left', () => {
    const descriptions = [adapters.description, adapters.react.description, adapters.webcomponent.description];
    expect(descriptions.filter(text => /__[A-Z][A-Z0-9_]*__/.test(text))).toEqual([]);
  });
});
