// Writes dist/THIRD_PARTY_NOTICES.txt. Run after both bundles are built (`npm run build` does).
//   node scripts/gen-notices.mjs [--dist DIR]
// The list of packages is read from the shipped source maps: every node_modules package that
// has a file in dist/kaltura-react.mjs or dist/kaltura-wc.js. Licence texts come from the installed
// packages. check-bundle.mjs fails when the file is missing or leaves out a bundled package.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const BUNDLES = ['kaltura-react.mjs', 'kaltura-wc.js'];
export const NOTICES_FILE = 'THIRD_PARTY_NOTICES.txt';

// Packages with an "A OR B" licence expression, and the option we use.
// DOMPurify is (MPL-2.0 OR Apache-2.0). We use it under Apache-2.0.
const CHOSEN_LICENSE = { dompurify: 'Apache-2.0' };

// Packages that ship no licence file. The text is from the upstream repository
// (https://github.com/developit/mitt/blob/main/LICENSE), which has no copy at the v2.1.0 tag.
const UPSTREAM_LICENSE = {
  mitt: "MIT License\n\nCopyright (c) 2021 Jason Miller\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.",
};

const LICENSE_FILE = /^(licen[sc]e([.-]mit)?|copying|notice)(\.(md|txt))?$/i;

/** `## <name>@<version>` header of one notice entry. check-bundle.mjs looks for it. */
export const entryHeader = ({ name, version }) => `## ${name}@${version}`;

/** Every package with a file in a shipped bundle: [{ name, version, dir, license, bundles }]. */
export function bundledPackages(dist) {
  const found = new Map();
  for (const bundle of BUNDLES) {
    const mapPath = join(dist, `${bundle}.map`);
    if (!existsSync(mapPath)) throw new Error(`${mapPath} is missing. Run "npm run build" first.`);
    for (const source of JSON.parse(readFileSync(mapPath, 'utf8')).sources) {
      const path = resolve(dist, source);
      const marker = path.lastIndexOf('/node_modules/');
      if (marker < 0) continue;
      const parts = path.slice(marker + '/node_modules/'.length).split('/');
      const dir = join(path.slice(0, marker), 'node_modules', ...parts.slice(0, parts[0].startsWith('@') ? 2 : 1));
      const entry = found.get(dir) ?? { dir, bundles: new Set() };
      entry.bundles.add(bundle);
      found.set(dir, entry);
    }
  }
  return [...found.values()]
    .map(({ dir, bundles }) => {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      return { name: pkg.name, version: pkg.version, dir, license: pkg.license, author: pkg.author, repository: pkg.repository, bundles: [...bundles].sort() };
    })
    .sort((a, b) => (`${a.name}@${a.version}` < `${b.name}@${b.version}` ? -1 : 1));
}

const text = (value) => (typeof value === 'string' ? value : (value?.name ?? value?.url ?? ''));

function entry(pkg) {
  const declared = typeof pkg.license === 'string' ? pkg.license : '';
  if (declared === '') throw new Error(`${pkg.name}@${pkg.version} declares no licence in package.json.`);
  const chosen = CHOSEN_LICENSE[pkg.name];
  if (chosen !== undefined && !declared.includes(chosen)) throw new Error(`${pkg.name}@${pkg.version} no longer offers ${chosen} (declared: ${declared}). Review CHOSEN_LICENSE.`);
  const files = readdirSync(pkg.dir).filter((name) => LICENSE_FILE.test(name)).sort();
  const upstream = UPSTREAM_LICENSE[pkg.name];
  const body = files.length > 0
    ? files.map((name) => `${files.length > 1 ? `--- ${name}\n` : ''}${readFileSync(join(pkg.dir, name), 'utf8').trim()}`).join('\n\n')
    : upstream !== undefined
      ? `This package ships no licence file. Upstream licence text:\n\n${upstream}`
      : `This package ships no licence file. Declared licence: ${declared}.\nAuthor: ${text(pkg.author) || 'not stated'}. Source: ${text(pkg.repository) || 'not stated'}.`;
  return [
    entryHeader(pkg),
    `Licence: ${chosen === undefined ? declared : `${declared}, used under ${chosen}`}`,
    `Bundled in: ${pkg.bundles.join(', ')}`,
    '',
    body,
  ].join('\n');
}

/** The full notices text. Same input gives the same bytes. */
export function renderNotices(packages) {
  const intro = [
    'THIRD-PARTY NOTICES',
    '',
    '@kaltura/a2ui-react is AGPL-3.0-only (see LICENSE). The files in dist/ also contain the',
    'third-party packages below, as found in the source maps of dist/kaltura-react.mjs and',
    'dist/kaltura-wc.js. Each entry gives the licence text the package ships.',
  ].join('\n');
  return `${[intro, ...packages.map(entry)].join('\n\n==========\n\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const { values } = parseArgs({ options: { dist: { type: 'string' } } });
    const dist = resolve(values.dist ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
    const packages = bundledPackages(dist);
    writeFileSync(join(dist, NOTICES_FILE), renderNotices(packages));
    console.log(`gen-notices: wrote ${NOTICES_FILE} for ${packages.length} packages.`);
  } catch (error) {
    console.error(`gen-notices: ${error.message}`);
    process.exit(1);
  }
}
