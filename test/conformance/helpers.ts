// Shared setup for the conformance suite: JSON Schema
// validators for the catalog and the A2UI message schemas that ship in the
// installed @a2ui/web_core package.
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
export const readJson = <T = unknown>(path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T;

export const SCHEMAS_V1_0 = 'node_modules/@a2ui/web_core/src/v1_0/schemas';

/** `$id` the shipped message schemas use to point at "the catalog". */
export const CATALOG_REF_ID = 'https://a2ui.org/specification/v1_0/catalog.json';

export interface CatalogJson {
  $id: string;
  catalogId: string;
  protocolVersion: string;
  instructions: string;
  components: Record<string, { type: string; description: string; properties: Record<string, { $ref?: string; const?: string; description?: string }>; required: string[] }>;
  functions: Record<string, { returnType?: string; allowedCallers?: string; requiresUserActivation?: boolean; properties: Record<string, { const?: string }> }>;
  $defs: Record<string, unknown> & { anyComponent: { oneOf: { $ref: string }[] }; anyFunction: { oneOf: { $ref: string }[] } };
  metadata: { extensions: { com_kaltura_adapters: KalturaAdapters } };
  [key: string]: unknown;
}

export interface KalturaAdapters {
  react: Record<string, string> & { exports: string[] };
  webcomponent: Record<string, string> & { customElements: string[] };
  [key: string]: unknown;
}

/** The Kaltura components: the catalog also lists the A2UI basic ones. */
export const kalturaNames = (catalog: CatalogJson) => Object.keys(catalog.components).filter(name => name.startsWith('Kaltura'));

export const loadCatalog = () => readJson<CatalogJson>('src/catalog/kaltura_catalog.json');

// The Ajv class is a CommonJS default export, so the import shape differs by loader.
const AjvClass = ((Ajv2020 as unknown as { default?: typeof Ajv2020 }).default ?? Ajv2020) as typeof Ajv2020;

/**
 * Strict Ajv (2020-12) that knows the A2UI keys `catalogId`, `components` and `functions` and the
 * Kaltura extension. `strictRequired` and `strictTypes` are off because A2UI's own schemas break
 * them: the `length` function lists `min` and `max` in `required` without defining them, and
 * `DynamicString` has an `allOf` branch with `properties` and no `type`. Unknown keywords and typos
 * still fail. The Kaltura components get the `required` check in CONF-01. Formats (`uri`, `date`) are
 * not checked, because ajv-formats is not a dependency.
 */
export function newAjv(strict = true) {
  const ajv = new AjvClass({ strict, strictRequired: false, strictTypes: false, validateFormats: false, allErrors: true, allowUnionTypes: true });
  if (strict) for (const keyword of ['catalogId', 'protocolVersion', 'components', 'functions', 'metadata', 'instructions', 'returnType', 'allowedCallers', 'requiresUserActivation']) ajv.addKeyword(keyword);
  return ajv;
}

/**
 * Ajv with the shipped 1.0 message schemas, where "catalog.json" is the Kaltura
 * catalog. Returns a validator for a list of agent-to-renderer messages.
 */
export function messageListValidator() {
  const ajv = newAjv(false);
  ajv.addSchema(readJson(`${SCHEMAS_V1_0}/common_types.json`));
  ajv.addSchema(readJson(`${SCHEMAS_V1_0}/agent_to_renderer.json`));
  ajv.addSchema({ ...loadCatalog(), $id: CATALOG_REF_ID });
  return ajv.compile(readJson(`${SCHEMAS_V1_0}/agent_to_renderer_list.json`));
}

/**
 * Validator for one component as it appears in `updateComponents`: the catalog
 * definition plus `ComponentCommon`, closed with `unevaluatedProperties: false`
 * like the message envelope (`agent_to_renderer.json`, `Component`). The catalog
 * itself leaves components open.
 */
export function componentValidator(name: string) {
  const ajv = newAjv();
  const catalog = loadCatalog();
  const common = readJson<object>(`${SCHEMAS_V1_0}/common_types.json`);
  ajv.addSchema({ ...common, $id: new URL('common_types.json', catalog.$id).href });
  ajv.addSchema(catalog);
  const validate = ajv.compile({
    allOf: [{ $ref: `${new URL('common_types.json', catalog.$id).href}#/$defs/ComponentCommon` }, { $ref: `${catalog.$id}#/components/${name}` }],
    unevaluatedProperties: false,
  });
  return validate;
}
