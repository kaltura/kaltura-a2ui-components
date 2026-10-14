// Covers: CONF-01..05 (plan item 3.3c): the catalog JSON is a valid JSON Schema,
// fits the A2UI catalog definition that ships with @a2ui/web_core, and has the
// same shape as the A2UI basic catalog. It lists the 18 basic components and 14
// basic functions next to the 12 Kaltura components (ADR 0006). No finding ID: this is the conformance suite.
//
// The A2UI packages ship no meta-schema for the v0.9 catalog format. The only one,
// v1_0/catalog_definition.json, rejects the official v0.9 basic catalog too
// (CONF-02 pins that), so it can only check a projection of ours (CONF-03).
import { describe, it, expect } from 'vitest';
import { kalturaNames, loadCatalog, newAjv, readJson, SCHEMAS_V0_9, SCHEMAS_V1_0, type CatalogJson } from './helpers';

const catalog = loadCatalog();
const COMPONENTS = Object.keys(catalog.components);
const KALTURA = kalturaNames(catalog);
const BASIC = COMPONENTS.filter(name => !KALTURA.includes(name));

describe('CONF-01: the catalog is a valid JSON Schema 2020-12', () => {
  it('CONF-01: it and all its components compile with strict Ajv (unknown keywords and typos fail)', () => {
    const ajv = newAjv();
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

  it('CONF-01: every $ref points inside the catalog (freestanding, nothing remote)', () => {
    const refs = [...JSON.stringify(catalog).matchAll(/"\$ref":\s*"([^"]+)"/g)].map(m => m[1]);
    expect(refs.filter(ref => !ref.startsWith('#/'))).toEqual([]);
  });

  it('CONF-01: the catalog declares 12 Kaltura and 18 basic components', () => {
    expect([KALTURA.length, BASIC.length]).toEqual([12, 18]);
  });

  it('CONF-01: every required prop of a Kaltura component is defined (strictRequired is off for the A2UI length function)', () => {
    const undefinedRequired = KALTURA.flatMap(name =>
      catalog.components[name].allOf.flatMap(part => {
        const { properties = {}, required = [] } = part as { properties?: object; required?: string[] };
        return required.filter(prop => !(prop in properties)).map(prop => `${name}.${prop}`);
      }),
    );
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

  it('CONF-02: it does not accept the official v0.9 basic catalog, so it cannot check a full v0.9 catalog', () => {
    const basic = readJson(`${SCHEMAS_V0_9}/catalogs/basic/catalog.json`);
    expect(compile()(basic)).toBe(false);
  });

  it('CONF-03: it accepts the components and anyComponent of the Kaltura catalog', () => {
    // Left out on purpose: x-kaltura-adapters (our extension), the inlined $defs
    // (the meta-schema allows only anyComponent and anyFunction there) and functions
    // (this is the v1.0 meta-schema: it wants `@call`, v0.9 functions use `call`).
    const { 'x-kaltura-adapters': _adapters, functions: _functions, ...rest } = catalog;
    const projection = { ...rest, $defs: { anyComponent: catalog.$defs.anyComponent, anyFunction: catalog.$defs.anyFunction } };
    const validate = compile();
    validate(projection);
    expect(validate.errors ?? []).toEqual([]);
  });
});

describe('CONF-04: same shape as the A2UI basic catalog', () => {
  const basic = readJson<CatalogJson & { components: CatalogJson['components'] }>(`${SCHEMAS_V0_9}/catalogs/basic/catalog.json`);

  it('CONF-04: it has the top-level keys the basic catalog has', () => {
    expect(Object.keys(basic).filter(key => !(key in catalog))).toEqual([]);
  });

  it('CONF-04: the catalog id equals its $id', () => {
    expect(catalog.catalogId).toBe(catalog.$id);
  });

  it.each(KALTURA)('CONF-04: %s extends ComponentCommon and CatalogComponentCommon like the basic components', name => {
    const { allOf, unevaluatedProperties } = catalog.components[name];
    expect([allOf[0].$ref, allOf[1].$ref, unevaluatedProperties]).toEqual([
      '#/$defs/ComponentCommon',
      '#/$defs/CatalogComponentCommon',
      false,
    ]);
  });

  it.each(BASIC)('CONF-04: basic %s extends ComponentCommon and BasicComponentCommon (weight only, as upstream)', name => {
    const { allOf, unevaluatedProperties } = catalog.components[name];
    expect([allOf[0].$ref, allOf[1].$ref, unevaluatedProperties]).toEqual([
      '#/$defs/ComponentCommon',
      '#/$defs/BasicComponentCommon',
      false,
    ]);
  });

  it.each(COMPONENTS)('CONF-04: %s names itself in properties.component.const', name => {
    const own = catalog.components[name].allOf.find(part => part.properties?.component);
    expect(own?.properties?.component?.const).toBe(name);
  });

  it('CONF-04: anyComponent lists every component once, in order', () => {
    expect(catalog.$defs.anyComponent.oneOf.map(entry => entry.$ref)).toEqual(COMPONENTS.map(name => `#/components/${name}`));
  });

  it('CONF-04: anyFunction lists every function once, in order', () => {
    expect(catalog.$defs.anyFunction.oneOf.map(entry => entry.$ref)).toEqual(Object.keys(catalog.functions).map(name => `#/functions/${name}`));
  });

  it('CONF-04: the shared defs the components and functions refer to exist', () => {
    const wanted = [...JSON.stringify([catalog.components, catalog.functions]).matchAll(/"#\/\$defs\/(\w+)"/g)].map(m => m[1]);
    expect([...new Set(wanted)].filter(name => !(name in catalog.$defs))).toEqual([]);
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
    expect(KALTURA.flatMap(name => described(catalog.components[name].allOf[2], name))).toEqual([]);
  });

  it('CONF-05: every component has a description', () => {
    const empty = KALTURA.filter(name => !(catalog.components[name] as { description?: string }).description);
    expect(empty).toEqual([]);
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

  it.each(['KalturaPlayer', 'KalturaFlashcards', 'KalturaCaptionsEditor'])('CONF-19: %s does not mention an iframe', name => {
    expect(texts(catalog.components[name]).filter(text => /iframe/i.test(text))).toEqual([]);
  });

  it('CONF-19: every integer ID says it is not a string or a binding', () => {
    type Props = Record<string, { type?: string; description: string }>;
    const ids = KALTURA.flatMap(name =>
      Object.entries((catalog.components[name].allOf[2] as unknown as { properties: Props }).properties)
        .filter(([prop, node]) => /Id$/.test(prop) && node.type === 'integer' && !node.description.includes('Integer, not a string, not a binding.'))
        .map(([prop]) => `${name}.${prop}`),
    );
    expect(ids).toEqual([]);
  });
});
