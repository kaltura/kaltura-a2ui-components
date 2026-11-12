// Covers: CONF-01..05: the catalog JSON is a valid JSON Schema, is a valid
// A2UI 1.0 catalog definition, and has the same shape as the A2UI basic
// catalog. It lists the 18 basic components and 14 basic functions next to the
// 12 Kaltura components (ADR 0006). No finding ID: this is the conformance suite.
//
// catalog_definition.json ships in @a2ui/web_core and is the meta-schema for a
// 1.0 catalog. The Kaltura catalog must pass it as it is (CONF-02, CONF-03).
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { kalturaNames, loadCatalog, newAjv, readJson, SCHEMAS_V1_0, type CatalogJson } from './helpers';

const catalog = loadCatalog();
const COMPONENTS = Object.keys(catalog.components);
const KALTURA = kalturaNames(catalog);
const BASIC = COMPONENTS.filter(name => !KALTURA.includes(name));
const COMMON_REF = /^common_types\.json#\/\$defs\/\w+$/;
const refsOf = (value: unknown) => [...JSON.stringify(value).matchAll(/"\$ref":\s*"([^"]+)"/g)].map(m => m[1]);

describe('CONF-01: the catalog is a valid JSON Schema 2020-12', () => {
  it('CONF-01: it and all its components compile with strict Ajv (unknown keywords and typos fail)', () => {
    const ajv = newAjv();
    // The catalog's relative refs resolve against its own $id, so common_types.json sits next to it.
    ajv.addSchema({ ...readJson<object>(`${SCHEMAS_V1_0}/common_types.json`), $id: new URL('common_types.json', catalog.$id).href });
    ajv.addSchema(catalog);
    const failures = COMPONENTS.filter(name => {
      try {
        ajv.getSchema(`${catalog.$id}#/components/${name}`);
        return false;
      } catch {
        return true;
      }
    });
    expect(failures).toEqual([]);
  });

  it('CONF-01: every $ref is local or points into common_types.json (freestanding, nothing remote)', () => {
    expect(refsOf(catalog).filter(ref => !ref.startsWith('#/') && !COMMON_REF.test(ref))).toEqual([]);
  });

  it('CONF-01: every common_types.json def the catalog refers to exists', () => {
    const defs = Object.keys(readJson<{ $defs: object }>(`${SCHEMAS_V1_0}/common_types.json`).$defs);
    const missing = refsOf(catalog).filter(ref => COMMON_REF.test(ref) && !defs.includes(ref.split('/').pop() ?? ''));
    expect(missing).toEqual([]);
  });

  it('CONF-01: the catalog declares 12 Kaltura and 18 basic components', () => {
    expect([KALTURA.length, BASIC.length]).toEqual([12, 18]);
  });

  it('CONF-01: every required prop of a Kaltura component is defined (strictRequired is off for the A2UI length function)', () => {
    const undefinedRequired = KALTURA.flatMap(name => {
      const { properties, required } = catalog.components[name];
      return required.filter(prop => !(prop in properties)).map(prop => `${name}.${prop}`);
    });
    expect(undefinedRequired).toEqual([]);
  });
});

describe('CONF-02: the shipped meta-schema', () => {
  const metaSchema = readJson<object>(`${SCHEMAS_V1_0}/catalog_definition.json`);
  const compile = () => {
    const ajv = newAjv(false);
    ajv.addSchema(readJson(`${SCHEMAS_V1_0}/common_types.json`));
    return ajv.compile(metaSchema);
  };

  it('CONF-02: it accepts the official 1.0 basic catalog', () => {
    const validate = compile();
    validate(readJson(`${SCHEMAS_V1_0}/catalogs/basic/catalog.json`));
    expect(validate.errors ?? []).toEqual([]);
  });

  it('CONF-03: it accepts the whole Kaltura catalog', () => {
    const validate = compile();
    validate(catalog);
    expect(validate.errors ?? []).toEqual([]);
  });

  it('CONF-03: it rejects a Kaltura component with a root oneOf (the rule that dropped the Player oneOf)', () => {
    const player = { ...catalog.components.KalturaPlayer, oneOf: [{ required: ['entryId'] }, { required: ['playlistId'] }] };
    const validate = compile();
    expect(validate({ ...catalog, components: { ...catalog.components, KalturaPlayer: player } })).toBe(false);
  });

  it('CONF-03: it rejects a catalog with an unknown root key', () => {
    const validate = compile();
    expect(validate({ ...catalog, 'x-unknown': {} })).toBe(false);
  });
});

describe('CONF-04: same shape as the A2UI basic catalog', () => {
  const basic = readJson<CatalogJson>(`${SCHEMAS_V1_0}/catalogs/basic/catalog.json`);

  it('CONF-04: it has the top-level keys the basic catalog has', () => {
    expect(Object.keys(basic).filter(key => !(key in catalog))).toEqual([]);
  });

  it('CONF-04: the catalog id equals its $id and sits under /v3/', () => {
    expect([catalog.catalogId === catalog.$id, catalog.$id]).toEqual([true, 'https://kaltura.github.io/a2ui/v3/catalog.json']);
  });

  it('CONF-04: the protocol version is "1.0"', () => {
    expect(catalog.protocolVersion).toBe('1.0');
  });

  it('CONF-04: $defs has anyComponent, anyFunction and Weight only', () => {
    expect(Object.keys(catalog.$defs)).toEqual(['anyComponent', 'anyFunction', 'Weight']);
  });

  it('CONF-04: the extension key is a UAX #31 identifier', () => {
    expect(Object.keys(catalog.metadata.extensions)).toEqual(['com_kaltura_adapters']);
  });

  it.each(KALTURA)('CONF-04: %s is a flat object definition with no root oneOf or anyOf', name => {
    const component = catalog.components[name] as Record<string, unknown>;
    expect([component.type, 'allOf' in component, 'oneOf' in component, 'anyOf' in component]).toEqual(['object', false, false, false]);
  });

  it.each(COMPONENTS)('CONF-04: %s names itself in properties.component.const', name => {
    // Basic components with checks put their properties in an allOf branch.
    const component = catalog.components[name] as { properties?: Record<string, { const?: string }>; allOf?: { properties?: Record<string, { const?: string }> }[] };
    const own = component.properties ?? component.allOf?.find(part => part.properties?.component)?.properties;
    expect(own?.component?.const).toBe(name);
  });

  it('CONF-04: anyComponent lists every component once, in order', () => {
    expect(catalog.$defs.anyComponent.oneOf.map(entry => entry.$ref)).toEqual(COMPONENTS.map(name => `#/components/${name}`));
  });

  it('CONF-04: anyFunction lists every function once, in order', () => {
    expect(catalog.$defs.anyFunction.oneOf.map(entry => entry.$ref)).toEqual(Object.keys(catalog.functions).map(name => `#/functions/${name}`));
  });

  it('CONF-04: every local def the components and functions refer to exists', () => {
    const wanted = [...JSON.stringify([catalog.components, catalog.functions]).matchAll(/"#\/\$defs\/(\w+)"/g)].map(m => m[1]);
    expect([...new Set(wanted)].filter(name => !(name in catalog.$defs))).toEqual([]);
  });

  it('CONF-04: copyToClipboard is a renderer-only function that needs a user gesture, with @call and void result (D10)', () => {
    const { returnType, allowedCallers, requiresUserActivation, properties } = catalog.functions.copyToClipboard;
    expect([returnType, allowedCallers, requiresUserActivation, properties['@call'].const]).toEqual(['void', 'rendererOnly', true, 'copyToClipboard']);
  });

  it('CONF-04: every function that needs user activation is renderer-only', () => {
    const wrong = Object.entries(catalog.functions)
      .filter(([, fn]) => fn.requiresUserActivation && (fn.allowedCallers ?? 'rendererOnly') !== 'rendererOnly')
      .map(([name]) => name);
    expect(wrong).toEqual([]);
  });
});

describe('CONF-05: every prop is documented', () => {
  const described = (node: unknown, path: string): string[] => {
    if (!node || typeof node !== 'object') return [];
    const record = node as Record<string, unknown>;
    const missing: string[] = [];
    const props = record.properties as Record<string, Record<string, unknown>> | undefined;
    for (const [name, child] of Object.entries(props ?? {})) {
      if (name !== 'component' && (typeof child.description !== 'string' || child.description.trim() === '')) missing.push(`${path}.${name}`);
      missing.push(...described(child, `${path}.${name}`), ...described(child.items, `${path}.${name}[]`));
    }
    return missing;
  };

  it('CONF-05: no property has an empty description (run "npm run gen:catalog -- --write", then fill it in)', () => {
    expect(KALTURA.flatMap(name => described(catalog.components[name], name))).toEqual([]);
  });

  it('CONF-05: every component has a description', () => {
    expect(KALTURA.filter(name => !catalog.components[name].description)).toEqual([]);
  });
});

describe('CONF-19: descriptions are plain for the agent', () => {
  const texts = (node: unknown): string[] => {
    if (!node || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, child]) => (key === 'description' && typeof child === 'string' ? [child] : texts(child)));
  };

  it('CONF-19: no description has an em dash', () => {
    expect(texts(catalog).filter(text => text.includes('—'))).toEqual([]);
  });

  it('CONF-19: the instructions have no em dash', () => {
    expect(catalog.instructions.includes('—')).toBe(false);
  });

  it.each(['KalturaPlayer', 'KalturaFlashcards', 'KalturaCaptionsEditor'])('CONF-19: %s does not mention an iframe', name => {
    expect(texts(catalog.components[name]).filter(text => /iframe/i.test(text))).toEqual([]);
  });

  it('CONF-19: every integer ID says it is not a string or a binding', () => {
    const ids = KALTURA.flatMap(name =>
      Object.entries(catalog.components[name].properties as Record<string, { type?: string; description: string }>)
        .filter(([prop, node]) => /Id$/.test(prop) && node.type === 'integer' && !node.description.includes('Integer, not a string, not a binding.'))
        .map(([prop]) => `${name}.${prop}`),
    );
    expect(ids).toEqual([]);
  });
});

describe('T3: common_types.json ships beside the catalog', () => {
  const shipped = readJson<{ $defs: Record<string, unknown> }>('src/catalog/common_types.json');

  it('T3: it is the file from @a2ui/web_core, byte for byte', () => {
    expect(readFileSync('src/catalog/common_types.json', 'utf8')).toBe(readFileSync(`${SCHEMAS_V1_0}/common_types.json`, 'utf8'));
  });

  it('T3: every relative ref in the catalog names a definition in it', () => {
    const missing = refsOf(catalog)
      .filter(ref => !ref.startsWith('#'))
      .filter(ref => !(ref.startsWith('common_types.json#/$defs/') && ref.split('/').at(-1)! in shipped.$defs));
    expect(missing).toEqual([]);
  });

  it('T3: the release workflow uploads it as an asset', () => {
    expect(readFileSync('.github/workflows/release.yml', 'utf8')).toContain('cp src/catalog/common_types.json "${assets}/common_types.json"');
  });
});
