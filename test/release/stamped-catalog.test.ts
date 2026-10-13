// @vitest-environment node
// Covers: QA-09 (the stamped catalog has no placeholder left, bytes match the build), SEC-19 (both
// bundles carry the real SRI). Chains the REAL stamp script onto the REAL catalog source, then runs
// the same check release.yml runs (scripts/release-verify-stamp.mjs).
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { stamp, verifyStamp } = await loadScripts();
const SOURCE_PATH = 'src/catalog/kaltura_catalog.json';
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const TAG = 'v0.2.0';

/** Fake dist + a copy of the real catalog source in a temp dir. */
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'stamped-'));
  writeFileSync(join(dir, 'kaltura-wc.js'), 'wc bytes');
  writeFileSync(join(dir, 'kaltura-react.mjs'), 'react bytes');
  copyFileSync(SOURCE_PATH, join(dir, 'catalog.json'));
  return { dir, catalog: join(dir, 'catalog.json') };
}
const cli = (script: string, dir: string, catalog: string) => spawnSync('node', [script, '--dist', dir, '--catalog', catalog, '--tag', TAG], { encoding: 'utf8' });

describe('QA-09: real stamp script on the real catalog', () => {
  const { dir, catalog } = workspace();
  const stampResult = cli('scripts/stamp-catalog.mjs', dir, catalog);
  const stamped = readFileSync(catalog, 'utf8');
  const expected = {
    tag: TAG,
    wcSri: stamp.sri('wc bytes'),
    reactSri: stamp.sri('react bytes'),
  };

  it('QA-09: the stamp script succeeds', () => {
    expect([stampResult.status, stampResult.stderr]).toEqual([0, '']);
  });

  it('QA-09: no placeholder token is left anywhere in the stamped catalog', () => {
    expect(stamped.match(/__[A-Z][A-Z0-9_]*__/g)).toBeNull();
  });

  it('QA-09: the release check finds no problem', () => {
    expect(verifyStamp.checkStamped(stamped, expected)).toEqual([]);
  });

  it('SEC-19: both bundles carry the SRI of the built files', () => {
    const { react, webcomponent } = JSON.parse(stamped)['x-kaltura-adapters'] as Record<string, { integrity: string }>;
    expect([react?.integrity, webcomponent?.integrity]).toEqual([expected.reactSri, expected.wcSri]);
  });

  it('QA-09: the release check CLI exits 0 on the stamped file', () => {
    const result = cli('scripts/release-verify-stamp.mjs', dir, catalog);
    expect([result.status, result.stdout]).toEqual([0, expect.stringContaining('is stamped for v0.2.0')]);
  });

  it('QA-09: the release check CLI exits 1 when the bundle changed after stamping', () => {
    writeFileSync(join(dir, 'kaltura-react.mjs'), 'other bytes');
    const result = cli('scripts/release-verify-stamp.mjs', dir, catalog);
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL react.integrity')]);
  });
});

describe('QA-09: the release check is not blind', () => {
  const expected = { tag: TAG, wcSri: 'sha384-wc', reactSri: 'sha384-react' };

  it('QA-09: the unstamped source fails it', () => {
    expect(verifyStamp.checkStamped(SOURCE, expected).length).toBeGreaterThan(0);
  });

  it('QA-09: a placeholder in a description is caught', () => {
    const stamped = stamp.stampCatalog(SOURCE, expected).replace('"description": "Where', '"description": "__RELEASE_TAG__ Where');
    expect(verifyStamp.checkStamped(stamped, expected)).toEqual([expect.stringContaining('__RELEASE_TAG__')]);
  });

  it('QA-09: an install line for another tag is caught', () => {
    const stamped = stamp.stampCatalog(SOURCE, expected).replace('#v0.2.0"', '#v0.1.4"');
    expect(verifyStamp.checkStamped(stamped, expected)).toEqual([expect.stringContaining('react.install is npm i github:kaltura/kaltura-a2ui-components#v0.1.4')]);
  });
});
