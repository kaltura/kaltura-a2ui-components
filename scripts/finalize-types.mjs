// Post-processes the declarations that tsc emits into dist/types.
//
// 1. Removes side-effect CSS imports. The CSS is injected by the JS bundle
//    and is not shipped under dist/types, so consumers could not resolve it.
// 2. Adds the file extension to relative specifiers. The sources use bundler
//    style imports without extensions, which Node16 ESM resolution rejects.
// 3. Replaces the declaration of the web component entry. That entry is an IIFE script with
//    no ES exports, so it declares nothing but the globals in global.d.ts.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const types = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'types');
const cssImport = /^import\s+['"][^'"]+\.css['"];?[ \t]*\r?\n/gm;
const relativeSpecifier = /(\bfrom\s+|\bimport\(\s*)(['"])(\.\.?\/[^'"]*)\2/g;

function withExtension(dir, specifier) {
  const target = resolve(dir, specifier);
  if (existsSync(`${target}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(target, 'index.d.ts'))) return `${specifier.replace(/\/$/, '')}/index.js`;
  throw new Error(`finalize-types: cannot resolve "${specifier}" from ${dir}`);
}

for (const entry of readdirSync(types, { recursive: true })) {
  if (!entry.endsWith('.d.ts')) continue;
  const path = join(types, entry);
  const dir = dirname(path);
  const source = readFileSync(path, 'utf8');
  const result = source
    .replace(cssImport, '')
    .replace(relativeSpecifier, (_m, lead, quote, specifier) =>
      /\.[cm]?[jt]s$/.test(specifier) ? _m : `${lead}${quote}${withExtension(dir, specifier)}${quote}`,
    );
  if (result !== source) writeFileSync(path, result);
}

writeFileSync(
  join(types, 'adapters/webcomponent/index.d.ts'),
  `// dist/kaltura-wc.js is a script with no ES exports. Importing this entry adds the types of\n// window.KalturaA2UIWebComponents, the Kaltura elements and the kaltura-action event.\nimport './global.js';\nexport {};\n`,
);
