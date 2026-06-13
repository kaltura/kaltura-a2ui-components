import { describe, it, expect } from 'vitest';
import { KALTURA_CATALOG_ID } from '../src/adapters/react/index';
import catalog from '../src/catalog/kaltura_catalog.json';

describe('scaffold', () => {
  it('exposes the Kaltura catalog id', () => {
    expect(KALTURA_CATALOG_ID).toBe('https://kaltura.github.io/a2ui/v1/catalog.json');
  });

  it('ships the backend catalog authority with the three shipped components', () => {
    const names = Object.keys((catalog as { components: Record<string, unknown> }).components);
    expect(names).toEqual(
      expect.arrayContaining(['KalturaPlayer', 'KalturaFlashcards', 'KalturaMediaManager']),
    );
  });

  it('does not register KalturaChart yet (deferred to #45)', () => {
    const names = Object.keys((catalog as { components: Record<string, unknown> }).components);
    expect(names).not.toContain('KalturaChart');
  });
});
