// Builds the component props of src/catalog/kaltura_catalog.json from the zod
// schemas in src/schemas. Run it after you add, remove or change a prop.
//   node scripts/gen-catalog.mjs           check: exit 1 if the JSON is out of date
//   node scripts/gen-catalog.mjs --write   rewrite the JSON (2-space indent)
//
// What comes from where:
//   zod     prop names and order, required list, types, enums, nesting
//   JSON    descriptions and defaults (zod has neither, and zod .describe()
//           would add about 5.7 kB raw to the web component bundle)
// Everything outside components.*.allOf[n].properties and .required (header,
// x-kaltura-adapters, component descriptions, Kaltura functions, Kaltura $defs)
// is copied from the JSON. A new prop gets an empty description. The
// conformance test fails until you write one.
//
// The A2UI part comes from the installed @a2ui/web_core, so the JSON lists what
// the renderer serves (ADR 0006):
//   components, functions      the basic ones first, then the Kaltura ones
//   $defs                      all of common_types.json, the basic theme, and the
//                              basic CatalogComponentCommon as BasicComponentCommon
//   anyComponent, anyFunction  built from the keys of components and functions
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = join(root, 'src/catalog/kaltura_catalog.json');
const UPSTREAM_SCHEMAS = join(root, 'node_modules/@a2ui/web_core/src/v0_9/schemas');
const COMMON_TYPES_ID = 'https://a2ui.org/specification/v0_9/common_types.json';

/**
 * Differences between zod and the catalog that are on purpose. The conformance
 * test pins this list, so a new difference needs a decision.
 */
export const INTENTIONAL_DIFFERENCES = [
  'zod .positive() and .nonnegative() on ids are not written to the catalog (type: integer only).',
  'zod objects strip unknown keys. The catalog sets additionalProperties: false on nested objects.',
  'z.unknown() (Flashcards clip entryId) keeps the catalog type. The component checks the value with isEntryId.',
  'Descriptions and defaults live in the JSON only.',
];

/**
 * Props where the catalog node is kept as it is, because it differs from zod
 * on purpose or by an open decision. Each entry needs a reason. The
 * conformance test pins this list, so a change needs a decision.
 */
export const KEPT_FROM_CATALOG = {};

// Dynamic values accept a literal, a data binding or a function call.
const DYNAMIC_PROBES = [
  ['DynamicString', 'a'],
  ['DynamicNumber', 1],
  ['DynamicBoolean', true],
];
const BINDING = { path: '/a' };

/** `DynamicString`, `DynamicNumber`, `DynamicBoolean` or undefined. */
function dynamicKind(type) {
  const accepts = value => type.safeParse(value).success;
  if (!accepts(BINDING)) return undefined;
  return DYNAMIC_PROBES.find(([, literal]) => accepts(literal))?.[0];
}

/** Puts keys of `fresh` in the order of `previous`, new keys last. */
function inOrder(previous, fresh) {
  const out = {};
  for (const key of Object.keys(previous ?? {})) if (key in fresh) out[key] = fresh[key];
  for (const key of Object.keys(fresh)) if (!(key in out)) out[key] = fresh[key];
  return out;
}

const isLoose = child => ['ZodUnknown', 'ZodAny'].includes(child._def.typeName);

/**
 * Required names in the order of the current list. z.unknown() accepts
 * undefined, so zod cannot tell if it is required: the current list decides.
 */
function requiredNames(shape, previous = []) {
  const required = Object.entries(shape)
    .filter(([name, child]) => (isLoose(child) ? previous.includes(name) : !child.isOptional()))
    .map(([name]) => name);
  return [...previous.filter(name => required.includes(name)), ...required.filter(name => !previous.includes(name))];
}

/** JSON Schema node for a zod type. `previous` is the node in the current JSON, if any. */
export function nodeFor(zodType, previous, named = false) {
  let type = zodType;
  while (['ZodOptional', 'ZodNullable', 'ZodDefault'].includes(type._def.typeName)) type = type._def.innerType;

  const loose = ['ZodUnknown', 'ZodAny'].includes(type._def.typeName);
  const kind = loose ? undefined : dynamicKind(type);
  let node;
  if (kind) {
    node = { $ref: `#/$defs/${kind}` };
  } else {
    switch (type._def.typeName) {
      case 'ZodString': {
        node = { type: 'string' };
        const max = type._def.checks.find(check => check.kind === 'max');
        if (max) node.maxLength = max.value;
        break;
      }
      case 'ZodBoolean':
        node = { type: 'boolean' };
        break;
      case 'ZodNumber':
        node = { type: type.isInt ? 'integer' : 'number' };
        break;
      case 'ZodEnum':
        node = { type: 'string', enum: [...type._def.values] };
        break;
      case 'ZodRecord':
        node = { type: 'object' };
        break;
      case 'ZodArray':
        node = { type: 'array', items: nodeFor(type._def.type, previous?.items) };
        break;
      case 'ZodUnion':
        node = { type: type._def.options.map(option => nodeFor(option).type) };
        break;
      case 'ZodObject': {
        const shape = type.shape;
        const properties = {};
        for (const [name, child] of Object.entries(shape)) properties[name] = nodeFor(child, previous?.properties?.[name], true);
        node = {
          type: 'object',
          properties,
          required: requiredNames(shape, previous?.required),
          additionalProperties: false,
        };
        break;
      }
      case 'ZodUnknown':
      case 'ZodAny':
        if (!previous?.type) throw new Error('z.unknown() needs a type in the current catalog JSON.');
        node = { type: previous.type };
        break;
      default:
        throw new Error(`gen-catalog does not support ${type._def.typeName}. Add a case in nodeFor().`);
    }
  }

  // Prose and defaults come from the JSON.
  if (named || previous?.description !== undefined) node.description = previous?.description ?? '';
  if (previous && 'default' in previous) node.default = previous.default;
  if (node.properties) node.properties = inOrder(previous?.properties, node.properties);
  return inOrder(previous, node);
}

/** The basic catalog and the common types that ship in @a2ui/web_core. */
export function loadUpstream() {
  const read = path => JSON.parse(readFileSync(join(UPSTREAM_SCHEMAS, path), 'utf8'));
  return { basic: read('catalogs/basic/catalog.json'), common: read('common_types.json') };
}

/**
 * Makes common_types refs local (`catalog.json#/...` there means the catalog in use, which
 * is this file) and points the basic common props at BasicComponentCommon.
 */
function localRefs(node) {
  if (Array.isArray(node)) return node.map(localRefs);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      if (key !== '$ref') return [key, localRefs(value)];
      if (value === '#/$defs/CatalogComponentCommon') return [key, '#/$defs/BasicComponentCommon'];
      return [key, value.replace(`${COMMON_TYPES_ID}#`, '#').replace(/^catalog\.json#/, '#')];
    }),
  );
}

/** Basic entries first, then the entries of `map` that are not basic. */
const basicFirst = (basic, map) => ({
  ...localRefs(basic),
  ...Object.fromEntries(Object.entries(map ?? {}).filter(([name]) => !(name in basic))),
});

/** The catalog with the basic components, functions and shared $defs from @a2ui/web_core. */
function withBasic(catalog, { basic, common }) {
  const out = structuredClone(catalog);
  out.components = basicFirst(basic.components, catalog.components);
  out.functions = basicFirst(basic.functions, catalog.functions);
  const anyOf = group => ({ oneOf: Object.keys(out[group]).map(name => ({ $ref: `#/${group}/${name}` })) });
  const generated = {
    BasicComponentCommon: localRefs(basic.$defs.CatalogComponentCommon),
    theme: localRefs(basic.$defs.theme),
    anyComponent: anyOf('components'),
    anyFunction: anyOf('functions'),
  };
  const shared = localRefs(common.$defs);
  const kaltura = Object.fromEntries(Object.entries(catalog.$defs).filter(([name]) => !(name in shared || name in generated)));
  out.$defs = { ...shared, ...kaltura, ...generated };
  return out;
}

/**
 * Returns a new catalog object. `apis` is a list of `{ name, schema }` as
 * exported by src/schemas/*.ts. `keep` is the KEPT_FROM_CATALOG map.
 */
export function generateCatalog(catalog, apis, keep = KEPT_FROM_CATALOG, upstream = loadUpstream()) {
  const out = withBasic(catalog, upstream);
  for (const { name, schema } of apis) {
    const component = out.components[name];
    if (!component) throw new Error(`${name} is not in the catalog. Add its description and allOf block first.`);
    const part = component.allOf.find(entry => entry.properties?.component);
    if (!part) throw new Error(`${name} has no allOf block with properties.component.`);
    const previous = part.properties;
    const properties = {};
    for (const [prop, child] of Object.entries(schema.shape)) {
      properties[prop] = `${name}.${prop}` in keep ? previous[prop] : nodeFor(child, previous[prop], true);
    }
    part.properties = { component: previous.component ?? { const: name }, ...inOrder(previous, properties) };
    part.required = ['component', ...requiredNames(schema.shape, part.required.filter(entry => entry !== 'component'))];
  }
  return out;
}

/** Loads the 12 schemas through Vite, because they are TypeScript. */
export async function loadApis() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const files = [
      ['player', 'KalturaPlayerApi'],
      ['flashcards', 'KalturaFlashcardsApi'],
      ['media-manager', 'KalturaMediaManagerApi'],
      ['analytics', 'KalturaAnalyticsApi'],
      ['captions-editor', 'KalturaCaptionsEditorApi'],
      ['recorder', 'KalturaRecorderApi'],
      ['avatar', 'KalturaAvatarApi'],
      ['genie', 'KalturaGenieApi'],
      ['content-lab', 'KalturaContentLabApi'],
      ['agents-widget', 'KalturaAgentsWidgetApi'],
      ['vod-avatar', 'KalturaVodAvatarApi'],
      ['chart', 'KalturaChartApi'],
    ];
    const apis = [];
    for (const [file, exportName] of files) {
      const mod = await server.ssrLoadModule(`/src/schemas/${file}.ts`);
      apis.push(mod[exportName]);
    }
    return apis;
  } finally {
    await server.close();
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const current = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const next = generateCatalog(current, await loadApis());
  if (JSON.stringify(next) === JSON.stringify(current)) {
    console.log('Catalog is up to date.');
    return;
  }
  if (!write) {
    console.error('src/catalog/kaltura_catalog.json is out of date. Run "npm run gen:catalog -- --write".');
    process.exitCode = 1;
    return;
  }
  writeFileSync(CATALOG_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log('Wrote src/catalog/kaltura_catalog.json. Fill in any empty description.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
