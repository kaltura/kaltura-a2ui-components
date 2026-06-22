import { describe, it, expect } from 'vitest';
import { KALTURA_CATALOG_ID } from '../src/adapters/react/index';
import catalog from '../src/catalog/kaltura_catalog.json';

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

describe('scaffold', () => {
  it('exposes the Kaltura catalog id', () => {
    expect(KALTURA_CATALOG_ID).toBe('https://kaltura.github.io/a2ui/v1/catalog.json');
  });

  it('ships all 12 experience components', () => {
    const names = Object.keys((catalog as { components: Record<string, unknown> }).components);
    expect(names).toEqual(expect.arrayContaining([...ALL_COMPONENTS]));
    expect(names).toHaveLength(ALL_COMPONENTS.length);
  });
});
