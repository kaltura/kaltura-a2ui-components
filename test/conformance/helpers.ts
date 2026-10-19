// Shared setup for the conformance suite: JSON Schema
// validators for the catalog and the A2UI message schemas that ship in the
// installed @a2ui/web_core package.
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
export const readJson = <T = unknown>(path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T;

export const SCHEMAS_V0_9 = 'node_modules/@a2ui/web_core/src/v0_9/schemas';
export const SCHEMAS_V1_0 = 'node_modules/@a2ui/web_core/src/v1_0/schemas';

/** `$id` the shipped message schemas use to point at "the catalog". */
export const CATALOG_REF_ID = 'https://a2ui.org/specification/v0_9/catalog.json';

export interface CatalogJson {
  $id: string;
  catalogId: string;
  components: Record<string, { allOf: { $ref?: string; properties?: Record<string, { const?: string }> }[]; unevaluatedProperties?: boolean }>;
  functions: Record<string, unknown>;
  $defs: Record<string, unknown> & { anyComponent: { oneOf: { $ref: string }[] }; anyFunction: { oneOf: { $ref: string }[] } };
  'x-kaltura-adapters': Record<string, unknown>;
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
  if (strict) for (const keyword of ['catalogId', 'components', 'functions', 'x-kaltura-adapters']) ajv.addKeyword(keyword);
  return ajv;
}

/**
 * Ajv with the shipped v0.9 message schemas, where "catalog.json" is the Kaltura
 * catalog. Returns a validator for a list of server-to-client messages.
 */
export function messageListValidator() {
  const ajv = newAjv(false);
  ajv.addSchema(readJson(`${SCHEMAS_V0_9}/common_types.json`));
  ajv.addSchema(readJson(`${SCHEMAS_V0_9}/server_to_client.json`));
  ajv.addSchema({ ...loadCatalog(), $id: CATALOG_REF_ID });
  return ajv.compile(readJson(`${SCHEMAS_V0_9}/server_to_client_list.json`));
}

/** Validator for one component object of the Kaltura catalog (`#/components/<name>`). */
export function componentValidator(name: string) {
  const ajv = newAjv();
  ajv.addSchema(loadCatalog());
  const validate = ajv.getSchema(`${loadCatalog().$id}#/components/${name}`);
  if (!validate) throw new Error(`No catalog component ${name}`);
  return validate;
}
