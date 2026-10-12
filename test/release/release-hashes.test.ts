// @vitest-environment node
// Covers: SEC-19 (SRI for both bundles and the catalog, npm integrity of the tarball), QA-09
// (hashes of the exact release assets). The CLI runs on temp files.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { hashes, stamp } = await loadScripts();

describe('SEC-19: buildHashes', () => {
  const built = hashes.buildHashes({
    version: '0.2.0',
    read: path => Buffer.from(`bytes of ${path}`),
    tarballName: 'a.tgz',
    tarballBytes: Buffer.from('tarball'),
  });

  it('SEC-19: covers both bundles and the catalog', () => {
    expect(Object.keys(built.cdn)).toEqual(['dist/kaltura-wc.js', 'dist/kaltura-react.mjs', 'src/catalog/kaltura_catalog.json']);
  });

  it('SEC-19: uses sha384 SRI for CDN files', () => {
    expect(built.cdn['dist/kaltura-react.mjs']).toBe(stamp.sri('bytes of dist/kaltura-react.mjs'));
  });

  it('QA-09: the tarball uses the npm integrity format (sha512)', () => {
    expect(built.tarball).toEqual({ name: 'a.tgz', integrity: stamp.sri('tarball', 'sha512') });
  });
});

describe('QA-09: sha256sums', () => {
  it('QA-09: matches `sha256sum` format and sorts by name', () => {
    const hex = (text: string) => createHash('sha256').update(text).digest('hex');
    expect(hashes.sha256sums([{ name: 'b', bytes: Buffer.from('2') }, { name: 'a', bytes: Buffer.from('1') }])).toBe(`${hex('1')}  a\n${hex('2')}  b\n`);
  });
});

describe('QA-09: release-hashes CLI', () => {
  const out = mkdtempSync(join(tmpdir(), 'hashes-'));
  writeFileSync(join(out, 'kaltura-a2ui-react-0.2.0.tgz'), 'tarball');
  writeFileSync(join(out, 'sbom.cdx.json'), '{}');
  const run = (dir: string) => spawnSync('node', ['scripts/release-hashes.mjs', '--version', '0.2.0', '--out', dir], { encoding: 'utf8' });

  it('QA-09: writes hashes.json and a SHA256SUMS that lists every other file', () => {
    const result = run(out);
    const sums = readFileSync(join(out, 'SHA256SUMS'), 'utf8').trim().split('\n').map(line => line.split('  ')[1]);
    expect([result.status, sums]).toEqual([0, ['hashes.json', 'kaltura-a2ui-react-0.2.0.tgz', 'sbom.cdx.json']]);
  });

  it('SEC-19: hashes.json holds the SRI of the files in the working tree', () => {
    const written = JSON.parse(readFileSync(join(out, 'hashes.json'), 'utf8')) as { cdn: Record<string, string> };
    expect(written.cdn['src/catalog/kaltura_catalog.json']).toBe(stamp.sri(readFileSync('src/catalog/kaltura_catalog.json')));
  });

  it('QA-09: refuses a directory without exactly one tarball', () => {
    expect(run(mkdtempSync(join(tmpdir(), 'empty-'))).status).toBe(1);
  });
});
