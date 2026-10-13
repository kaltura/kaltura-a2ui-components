// Covers: CONF-06..08 (plan item 3.3c): src/catalog/kaltura_catalog.json equals
// what scripts/gen-catalog.mjs builds from the zod schemas in src/schemas, and
// the places where it differs on purpose are pinned.
//
// Decision: the JSON is generated for structure (props, order, types, required)
// and keeps its descriptions and defaults by hand. zod .describe() would move
// the prose into the bundle (about 5.7 kB raw) and the web component bundle has
// about 1.3 kB gzip of headroom. Details: docs/adr/0006-catalog-generation.md.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
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
import { kalturaNames, loadCatalog, type CatalogJson } from './helpers';

interface Api {
  name: string;
  schema: z.ZodObject<z.ZodRawShape>;
}
interface Generator {
  generateCatalog(catalog: CatalogJson, apis: Api[], keep?: Record<string, string>): CatalogJson;
  KEPT_FROM_CATALOG: Record<string, string>;
  INTENTIONAL_DIFFERENCES: string[];
}

const APIS: Api[] = [
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

const generator = (await import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), 'scripts/gen-catalog.mjs')).href)) as Generator;
const catalog = loadCatalog();
const ownBlock = (c: CatalogJson, name: string) =>
  c.components[name].allOf.find(part => part.properties?.component) as unknown as { properties: Record<string, unknown>; required: string[] };

describe('CONF-06: the checked-in catalog equals the generated one', () => {
  it('CONF-06: generating from the 12 zod schemas changes nothing (run "npm run gen:catalog" to check)', () => {
    expect(generator.generateCatalog(catalog, APIS)).toEqual(catalog);
  });

  it('CONF-06: key order is the same, so a --write run gives a small diff', () => {
    expect(JSON.stringify(generator.generateCatalog(catalog, APIS))).toBe(JSON.stringify(catalog));
  });

  it('CONF-06: it covers all 12 Kaltura components', () => {
    expect(APIS.map(api => api.name)).toEqual(kalturaNames(catalog));
  });
});

describe('CONF-07: the generator notices drift (so the test above is not vacuous)', () => {
  const player = (shape: z.ZodRawShape): Api => ({ name: 'KalturaPlayer', schema: z.object(shape) });
  const others = APIS.filter(api => api.name !== 'KalturaPlayer');
  const shape = KalturaPlayerApi.schema.shape;

  it('CONF-07: a prop removed from zod is removed from the catalog', () => {
    const { entryName: _entryName, ...rest } = shape;
    const next = generator.generateCatalog(catalog, [player(rest), ...others]);
    expect(Object.keys(ownBlock(next, 'KalturaPlayer').properties)).not.toContain('entryName');
  });

  it('CONF-07: a prop added to zod appears with an empty description, which CONF-05 rejects', () => {
    const next = generator.generateCatalog(catalog, [player({ ...shape, volume: z.number().optional() }), ...others]);
    expect(ownBlock(next, 'KalturaPlayer').properties.volume).toEqual({ type: 'number', description: '' });
  });

  it('CONF-07: a required prop made optional leaves the required list', () => {
    const next = generator.generateCatalog(catalog, [player({ ...shape, entryId: shape.entryId.optional() }), ...others]);
    expect(ownBlock(next, 'KalturaPlayer').required).not.toContain('entryId');
  });

  it('CONF-07: an enum change is copied', () => {
    const chart = { name: 'KalturaChart', schema: z.object({ ...KalturaChartApi.schema.shape, chartType: z.enum(['line', 'bar']) }) };
    const next = generator.generateCatalog(catalog, [...APIS.filter(api => api.name !== 'KalturaChart'), chart]);
    expect((ownBlock(next, 'KalturaChart').properties.chartType as { enum: string[] }).enum).toEqual(['line', 'bar']);
  });

  it('CONF-07: a string max length is copied', () => {
    const avatar = { name: 'KalturaAvatar', schema: KalturaAvatarApi.schema.extend({ openingPhrase: z.string().max(7).optional() }) };
    const next = generator.generateCatalog(catalog, [...APIS.filter(api => api.name !== 'KalturaAvatar'), avatar]);
    expect((ownBlock(next, 'KalturaAvatar').properties.openingPhrase as { maxLength: number }).maxLength).toBe(7);
  });

  it('CONF-07: the input catalog is not changed, so the check compares two different objects', () => {
    const input = structuredClone(catalog);
    generator.generateCatalog(input, [player({ ...shape, volume: z.number().optional() }), ...others]);
    expect(input).toEqual(catalog);
  });
});

describe('CONF-08: differences between zod and the catalog are on purpose', () => {
  it('CONF-08: no prop is kept from the catalog (the Player ids take data bindings, like zod)', () => {
    expect(Object.keys(generator.KEPT_FROM_CATALOG)).toEqual([]);
  });

  it('CONF-08: each kept prop still differs from what zod gives (a stale entry should be removed)', () => {
    const strict = generator.generateCatalog(catalog, APIS, {});
    const stale = Object.keys(generator.KEPT_FROM_CATALOG).filter(key => {
      const [component, prop] = key.split('.');
      return JSON.stringify(ownBlock(strict, component).properties[prop]) === JSON.stringify(ownBlock(catalog, component).properties[prop]);
    });
    expect(stale).toEqual([]);
  });

  it('CONF-08: the only props that differ without the keep list are the kept ones', () => {
    const strict = generator.generateCatalog(catalog, APIS, {});
    const differing = Object.keys(catalog.components).flatMap(component => {
      const before = ownBlock(catalog, component).properties as Record<string, unknown>;
      const after = ownBlock(strict, component).properties as Record<string, unknown>;
      return Object.keys(before).filter(prop => JSON.stringify(before[prop]) !== JSON.stringify(after[prop])).map(prop => `${component}.${prop}`);
    });
    expect(differing).toEqual(Object.keys(generator.KEPT_FROM_CATALOG));
  });

  it('CONF-08: every kept prop has a reason', () => {
    expect(Object.values(generator.KEPT_FROM_CATALOG).filter(reason => reason.length < 20)).toEqual([]);
  });

  it('CONF-08: the list of intended differences is this one', () => {
    expect(generator.INTENTIONAL_DIFFERENCES).toHaveLength(4);
  });
});
