// Covers: CONF-16 (plan item 3.3c): the public API. The exported names of each
// package entry are compared with test/conformance/snapshots/public-api.json.
// A change to the API fails here on purpose. If it is intended, update the
// snapshot and add a CHANGELOG line:
//   UPDATE_API_SNAPSHOT=1 npx vitest run test/conformance/api-snapshot
// The names come from the TypeScript compiler (values and types) and are checked
// against the real module (values only).
import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalog, readJson } from './helpers';

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const SNAPSHOT = resolve(process.cwd(), 'test/conformance/snapshots/public-api.json');

interface Names {
  values: string[];
  types: string[];
}
interface Snapshot {
  '.': Names;
  './webcomponent': Names;
  './catalog': { topLevelKeys: string[]; components: string[]; defs: string[] };
}

const ENTRIES = { '.': 'src/adapters/react/index.ts', './webcomponent': 'src/adapters/webcomponent/index.ts' } as const;

function exportedNames(files: string[]): Record<string, Names> {
  const program = ts.createProgram(
    files.map(file => resolve(process.cwd(), file)),
    {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2023,
      resolveJsonModule: true,
      allowImportingTsExtensions: true,
      types: [],
    },
  );
  const checker = program.getTypeChecker();
  const result: Record<string, Names> = {};
  for (const file of files) {
    const source = program.getSourceFile(resolve(process.cwd(), file));
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) throw new Error(`No module symbol for ${file}`);
    const values: string[] = [];
    const types: string[] = [];
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      (target.flags & ts.SymbolFlags.Value ? values : types).push(symbol.name);
    }
    result[file] = { values: values.sort(), types: types.sort() };
  }
  return result;
}

const compiled = exportedNames(Object.values(ENTRIES));
const catalog = loadCatalog();
const current: Snapshot = {
  '.': compiled[ENTRIES['.']],
  './webcomponent': compiled[ENTRIES['./webcomponent']],
  './catalog': { topLevelKeys: Object.keys(catalog), components: Object.keys(catalog.components), defs: Object.keys(catalog.$defs) },
};

if (process.env.UPDATE_API_SNAPSHOT === '1') writeFileSync(SNAPSHOT, `${JSON.stringify(current, null, 2)}\n`);
const saved = existsSync(SNAPSHOT) ? readJson<Snapshot>('test/conformance/snapshots/public-api.json') : undefined;

describe('CONF-16: public API snapshot', () => {
  it.each(['.', './webcomponent'] as const)('CONF-16: entry "%s" exports the snapshot names (values and types)', entry => {
    expect(current[entry]).toEqual(saved?.[entry]);
  });

  it('CONF-16: entry "./catalog" has the snapshot keys, components and shared defs', () => {
    expect(current['./catalog']).toEqual(saved?.['./catalog']);
  });

  it('CONF-16: the snapshot file is plain JSON with sorted name lists', () => {
    const raw = readFileSync(SNAPSHOT, 'utf8');
    expect(JSON.stringify(JSON.parse(raw), null, 2) + '\n').toBe(raw);
  });

  it('CONF-16: the React entry value names equal the keys of the real module', async () => {
    const real = await import('../../src/adapters/react/index');
    expect(Object.keys(real).sort()).toEqual(current['.'].values);
  }, 240000);

  it('CONF-16: the Web Component entry value names equal the keys of the real module', async () => {
    const real = await import('../../src/adapters/webcomponent/index');
    expect(Object.keys(real).sort()).toEqual(current['./webcomponent'].values);
  }, 240000);

  it('CONF-16: package.json maps exactly these entries', () => {
    expect(Object.keys(readJson<{ exports: object }>('package.json').exports)).toEqual(['.', './webcomponent', './catalog', './package.json']);
  });
});
