// @vitest-environment node
// Covers: F33 (third-party notices are built from the source maps and shipped in dist/).
// The CLI runs on a temp tree with two fake bundles and fake packages.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const run = (dist: string) => spawnSync('node', ['scripts/gen-notices.mjs', '--dist', dist], { encoding: 'utf8' });

function fixture(packages: Record<string, { license?: string; files?: Record<string, string>; bundles: string[] }>) {
  const root = mkdtempSync(join(tmpdir(), 'notices-'));
  const dist = join(root, 'dist');
  mkdirSync(dist);
  const sources: Record<string, string[]> = { 'kaltura-react.mjs': ['../src/index.ts'], 'kaltura-wc.js': ['../src/index.ts'] };
  for (const [name, { license, files = {}, bundles }] of Object.entries(packages)) {
    const dir = join(root, 'node_modules', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.2.3', license }));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
    for (const bundle of bundles) sources[bundle]?.push(`../node_modules/${name}/index.js`);
  }
  for (const [bundle, list] of Object.entries(sources)) writeFileSync(join(dist, `${bundle}.map`), JSON.stringify({ sources: list }));
  return dist;
}

describe('F33: gen-notices', () => {
  const dist = fixture({
    'plain-mit': { license: 'MIT', files: { LICENSE: 'MIT text of plain-mit\n' }, bundles: ['kaltura-react.mjs', 'kaltura-wc.js'] },
    '@scope/wc-only': { license: 'ISC', files: { 'LICENSE.md': 'ISC text of wc-only' }, bundles: ['kaltura-wc.js'] },
    dompurify: { license: '(MPL-2.0 OR Apache-2.0)', files: { LICENSE: 'Apache text', 'LICENSE-MPL': 'MPL text' }, bundles: ['kaltura-react.mjs'] },
    'no-file': { license: 'MIT', bundles: ['kaltura-wc.js'] },
  });
  const result = run(dist);
  const notices = readFileSync(join(dist, 'THIRD_PARTY_NOTICES.txt'), 'utf8');

  it('F33: lists every package that has a file in a bundle, scoped names included', () => {
    expect(notices.match(/^## .+$/gm)).toEqual(['## @scope/wc-only@1.2.3', '## dompurify@1.2.3', '## no-file@1.2.3', '## plain-mit@1.2.3']);
  });

  it('F33: says which bundle holds each package', () => {
    expect(notices).toMatch(/## @scope\/wc-only@1\.2\.3\nLicence: ISC\nBundled in: kaltura-wc\.js\n/);
  });

  it('F33: copies the licence text of the package', () => {
    expect(notices).toContain('MIT text of plain-mit');
  });

  it('F33: uses DOMPurify under Apache-2.0 and leaves out the MPL text', () => {
    expect([notices.includes('used under Apache-2.0'), notices.includes('Apache text'), notices.includes('MPL text')]).toEqual([true, true, false]);
  });

  it('F33: a package without a licence file gets its declared licence', () => {
    expect(notices).toContain('This package ships no licence file. Declared licence: MIT.');
  });

  it('F33: same input gives the same bytes', () => {
    run(dist);
    expect(readFileSync(join(dist, 'THIRD_PARTY_NOTICES.txt'), 'utf8')).toBe(notices);
  });

  it('F33: exits 0', () => {
    expect(result.status).toBe(0);
  });

  it('F33: fails when a bundled package declares no licence', () => {
    expect(run(fixture({ nolicence: { bundles: ['kaltura-wc.js'] } })).status).toBe(1);
  });

  it('F33: fails when a source map is missing', () => {
    expect(run(mkdtempSync(join(tmpdir(), 'notices-empty-'))).status).toBe(1);
  });
});
