// Builds the component props of src/catalog/kaltura_catalog.json from the zod
// schemas in src/schemas. Run it after you add, remove or change a prop.
//   node scripts/gen-catalog.mjs           check: exit 1 if the JSON is out of date
//   node scripts/gen-catalog.mjs --write   rewrite the JSON (2-space indent)
//
// It also writes docs/components.md (one section per component) from the catalog,
// test/conformance/fixtures/streams.json and chart-examples.json. --check covers it.
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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = join(root, 'src/catalog/kaltura_catalog.json');
const DOC_PATH = join(root, 'docs/components.md');
const FIXTURES = join(root, 'test/conformance/fixtures');
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
  'The catalog Player has a oneOf rule (entryId or playlistId) that zod does not carry. The component checks the pair.',
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
  } else if (type.description?.startsWith('REF:#/$defs/Action|')) {
    node = { $ref: '#/$defs/Action' };
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
  out.components = basicFirst(basic.components, out.components);
  out.functions = basicFirst(basic.functions, out.functions);
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

// Components that load without a KS. The rest show "Invalid ks" without one (test/conformance/components-doc.test.tsx pins this).
export const KS_NOT_REQUIRED = { KalturaPlayer: 'Only for protected entries', KalturaFlashcards: 'Only for protected entries', KalturaChart: 'No' };
const TYPE_NAMES = { DynamicString: 'string', DynamicNumber: 'number', DynamicBoolean: 'boolean' };

function typeOf(node) {
  if (node.$ref) return TYPE_NAMES[node.$ref.split('/').pop()] ?? node.$ref.split('/').pop().toLowerCase();
  if (node.enum) return node.enum.length > 4 ? node.type : node.enum.map(value => `"${value}"`).join(' / ');
  if (Array.isArray(node.type)) return node.type.join(' or ');
  return node.type === 'array' ? `${typeOf(node.items)}[]` : node.type;
}

const cell = text => String(text).replaceAll('|', '\\|');
const code = value => `\`${cell(value)}\``;
const jsonBlock = value => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

/** Replaces `{ path }` bindings with their value from the data model. */
function resolveBindings(value, model) {
  if (Array.isArray(value)) return value.map(item => resolveBindings(item, model));
  if (!value || typeof value !== 'object') return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === 'path') return value.path.split('/').filter(Boolean).reduce((at, key) => at?.[key], model);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveBindings(item, model)]));
}

/** The `config` of a web component that matches a stream: its first component, with bindings filled in. */
export function configOf(stream) {
  const model = stream.messages.find(message => message.updateDataModel)?.updateDataModel.value;
  const { id: _id, component: _component, ...props } = stream.messages.find(message => message.updateComponents).updateComponents.components[0];
  return resolveBindings(props, model);
}

/**
 * The text of docs/components.md. `streams` is test/conformance/fixtures/streams.json
 * (one valid message stream per component), `chartExamples` is chart-examples.json.
 */
export function renderComponentsDoc(catalog, streams, chartExamples) {
  const names = Object.keys(catalog.components).filter(name => name.startsWith('Kaltura'));
  const tags = catalog['x-kaltura-adapters'].webcomponent.customElements;
  if (tags.length !== names.length) throw new Error('x-kaltura-adapters.webcomponent.customElements must list one tag per Kaltura component, in order.');
  const needsKs = name => KS_NOT_REQUIRED[name] ?? 'Yes';

  const sections = names.map((name, index) => {
    const tag = tags[index];
    const part = catalog.components[name].allOf.find(entry => entry.properties?.component);
    const stream = streams.find(entry => entry.component === name);
    if (!stream) throw new Error(`streams.json has no stream for ${name}.`);
    const messages = stream.messages.filter(message => !message.createSurface);
    const rows = Object.entries(part.properties)
      .filter(([prop]) => prop !== 'component' && prop !== 'action')
      .map(([prop, node]) => `| ${code(prop)} | ${cell(typeOf(node))} | ${part.required.includes(prop) ? 'yes' : ''} | ${'default' in node ? code(JSON.stringify(node.default)) : ''} | ${cell(node.description)} |`);
    const lines = [
      `## ${name}`,
      '',
      catalog.components[name].description,
      '',
      `Element: ${code(`<${tag}>`)}. Needs a KS: ${needsKs(name)}.`,
      '',
      '| Prop | Type | Required | Default | Description |',
      '|---|---|---|---|---|',
      ...rows,
      '',
    ];
    if (name === 'KalturaChart') {
      lines.push(
        'One example row for each `chartType`:',
        '',
        '| `chartType` | Example row | `xKey` | `yKeys` |',
        '|---|---|---|---|',
        ...chartExamples.map(({ chartType, row, xKey, yKeys }) => `| ${code(chartType)} | ${code(JSON.stringify(row))} | ${code(xKey)} | ${code(JSON.stringify(yKeys))} |`),
        '',
      );
    }
    lines.push(
      'A2UI messages, sent after `createSurface`:',
      '',
      jsonBlock(messages),
      '',
      'The same in a web component:',
      '',
      `\`\`\`html\n<${tag}></${tag}>\n<script>\n  document.querySelector('${tag}').config = ${JSON.stringify(configOf(stream), null, 2).replaceAll('\n', '\n  ')};\n</script>\n\`\`\``,
      '',
    );
    return lines.join('\n');
  });

  return [
    '# Components',
    '',
    '<!-- Generated by "npm run gen:catalog -- --write". Do not edit by hand. -->',
    '',
    'Each section has the props, an A2UI payload and the matching web component `config`.',
    '',
    '- In A2UI, a `string`, `number` or `boolean` prop can be a data binding like `{ "path": "/title" }`. A `config` takes plain values.',
    '- Every component also takes an optional `action`. It tells the agent about errors and events ([host-api.md](host-api.md)).',
    '- A2UI components have no `ks` prop. The host supplies the KS with `setKsProvider` ([host-integration.md](host-integration.md#kaltura-session-ks)).',
    '',
    '| Component | Element | Needs a KS |',
    '|---|---|---|',
    ...names.map((name, index) => `| [${name}](#${name.toLowerCase()}) | ${code(`<${tags[index]}>`)} | ${needsKs(name)} |`),
    '',
    ...sections,
  ]
    .join('\n')
    .replace(/\n+$/, '\n');
}

const isScalar = value => value === null || typeof value !== 'object';
// Arrays of names stay on one line up to this width. Objects need a shorter one, except `action`.
const MAX_INLINE_ARRAY = 130;
const MAX_INLINE_OBJECT = 60;

/** One line for a short array or flat object of plain values, else undefined. */
function flatten(value, key) {
  const items = Array.isArray(value) ? value : Object.values(value);
  const plain = item => isScalar(item) || (Array.isArray(item) && item.every(isScalar));
  if (!(Array.isArray(value) ? items.every(isScalar) : items.every(plain))) return undefined;
  const flat = Array.isArray(value)
    ? `[${items.map(item => JSON.stringify(item)).join(', ')}]`
    : `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${isScalar(item) ? JSON.stringify(item) : `[${item.map(entry => JSON.stringify(entry)).join(', ')}]`}`).join(', ')} }`;
  return flat.length <= (Array.isArray(value) ? MAX_INLINE_ARRAY : key === 'action' ? Infinity : MAX_INLINE_OBJECT) ? flat : undefined;
}

/**
 * JSON with 2-space indent. In the Kaltura parts a short array or flat object
 * of plain values stays on one line, so a one-prop change does not reflow its
 * neighbours. The copied A2UI parts keep the upstream layout.
 */
export function formatCatalog(value, path = []) {
  if (isScalar(value)) return JSON.stringify(value);
  const [group, name] = path;
  const upstream = (group === 'components' && name !== undefined && !name.startsWith('Kaltura')) || group === 'functions' || group === '$defs';
  const flat = upstream ? undefined : flatten(value, path.at(-1));
  if (flat) return flat;
  const indent = '  '.repeat(path.length);
  const inner = `${indent}  `;
  if (Array.isArray(value)) return value.length ? `[\n${value.map(item => `${inner}${formatCatalog(item, [...path, ''])}`).join(',\n')}\n${indent}]` : '[]';
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${formatCatalog(item, [...path, key])}`).join(',\n')}\n${indent}}`;
}

async function main() {
  const write = process.argv.includes('--write');
  const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
  const current = readJson(CATALOG_PATH);
  const next = generateCatalog(current, await loadApis());
  const doc = renderComponentsDoc(next, readJson(join(FIXTURES, 'streams.json')), readJson(join(FIXTURES, 'chart-examples.json')));
  const stale = [];
  if (JSON.stringify(next) !== JSON.stringify(current)) stale.push([CATALOG_PATH, `${formatCatalog(next)}\n`]);
  if (!existsSync(DOC_PATH) || readFileSync(DOC_PATH, 'utf8') !== doc) stale.push([DOC_PATH, doc]);
  if (!stale.length) {
    console.log('Catalog and docs/components.md are up to date.');
    return;
  }
  const names = stale.map(([path]) => path.replace(`${root}/`, '')).join(' and ');
  if (!write) {
    console.error(`${names} out of date. Run "npm run gen:catalog -- --write".`);
    process.exitCode = 1;
    return;
  }
  for (const [path, text] of stale) writeFileSync(path, text);
  console.log(`Wrote ${names}. Fill in any empty description.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
