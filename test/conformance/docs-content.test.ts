// @vitest-environment node
// Covers: QA-16 (README and docs match the code), plan items 3.5 and 3.3e.
// Text checks on the Markdown files. The code in README and examples/ is run
// by "npm run check:examples" (needs a build), not here.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { readJson, loadCatalog } from './helpers';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

function markdownFiles(dir: string): string[] {
  return readdirSync(resolve(root, dir)).flatMap(name => {
    const path = join(dir, name);
    if (statSync(resolve(root, path)).isDirectory()) return markdownFiles(path);
    return path.endsWith('.md') ? [path] : [];
  });
}

const DOCS = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', '.github/PULL_REQUEST_TEMPLATE.md', ...markdownFiles('docs'), ...markdownFiles('examples'), 'test/README.md', 'e2e/README.md'];
const text = Object.fromEntries(DOCS.map(path => [path, read(path)]));
// Code blocks hold example code, not claims about names or links.
const prose = (path: string) => (text[path] ?? '').replace(/^```[\s\S]*?^```/gm, '');

interface Api {
  '.': { values: string[] };
  './webcomponent': { values: string[] };
}
const api = readJson<Api>('test/conformance/snapshots/public-api.json');
const exported = new Set([...api['.'].values, ...api['./webcomponent'].values]);
const scripts = Object.keys(readJson<{ scripts: Record<string, string> }>('package.json').scripts);

describe('QA-16: docs name real things', () => {
  it.each(DOCS.filter(path => path !== 'CHANGELOG.md'))('QA-16: %s names only exported functions', path => {
    const names = [...prose(path).matchAll(/`((?:set|build|load|getExtra)[A-Z]\w*)/g)].map(match => match[1] ?? '');
    expect(names.filter(name => !exported.has(name))).toEqual([]);
  });

  it.each(DOCS)('QA-16: %s runs only npm scripts that exist', path => {
    const used = [...(text[path] ?? '').matchAll(/npm run ([a-z0-9:]+)/g)].map(match => match[1] ?? '');
    expect(used.filter(name => !scripts.includes(name))).toEqual([]);
  });

  it.each(DOCS)('QA-16: %s uses only custom element tags that exist', path => {
    const tags = new Set((loadCatalog()['x-kaltura-adapters'] as { webcomponent: { customElements: string[] } }).webcomponent.customElements);
    const used = [...prose(path).matchAll(/<(kaltura-[a-z-]+)/g)].map(match => match[1] ?? '');
    expect(used.filter(tag => !tags.has(tag))).toEqual([]);
  });

  it('QA-16: README lists the peer ranges from package.json', () => {
    const peers = readJson<{ peerDependencies: Record<string, string> }>('package.json').peerDependencies;
    const missing = Object.entries(peers).filter(([name, range]) => !text['README.md']?.includes(`${name} ${range}`) && !(name.startsWith('react') && text['README.md']?.includes(`${name} ^19`)));
    expect(missing).toEqual([]);
  });

  it('QA-16: docs/host-api.md names every error code', () => {
    const type = read('src/core/host-hooks.ts').match(/type KalturaErrorCode =([^;]+);/)?.[1] ?? '';
    const codes = [...type.matchAll(/'([a-z-]+)'/g)].map(match => match[1] ?? '');
    const missing = codes.filter(code => !text['docs/host-api.md']?.includes(`\`${code}\``));
    expect(codes).toHaveLength(6);
    expect(missing).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(resolve(root, dir)).flatMap(name => {
    const path = join(dir, name);
    if (statSync(resolve(root, path)).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('SEC-05: no advice to register basicCatalog next to the Kaltura catalog', () => {
  // Its JSDoc ships in the .d.ts files. An agent can pick a second catalog by id.
  it.each([...sourceFiles('src/adapters'), ...DOCS])('SEC-05: %s', path => {
    expect(read(path)).not.toMatch(/MessageProcessor\(\s*\[[^\]]*\bbasicCatalog\b/);
  });
});

/** GitHub's heading anchor: lower case, no punctuation, spaces to dashes. */
const slug = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');
const anchors = (path: string) => new Set([...(text[path] ?? read(path)).matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1] ?? '')));

describe('QA-16: docs links resolve', () => {
  it.each(DOCS)('QA-16: %s has no broken relative link or anchor', path => {
    const links = [...prose(path).matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1] ?? '').filter(link => !/^[a-z][a-z0-9+.-]*:/i.test(link));
    const broken = links.filter(link => {
      const [file = '', anchor] = link.split('#');
      const target = file === '' ? path : relative(root, resolve(root, dirname(path), file));
      if (!existsSync(resolve(root, target))) return true;
      return anchor !== undefined && target.endsWith('.md') && !anchors(target).has(anchor);
    });
    expect(broken).toEqual([]);
  });
});
