// @vitest-environment node
// Covers: QA-09 (catalog is stamped in the build workspace, bytes match what is published),
// SEC-19 (the stamped catalog carries the real SRI).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { stamp } = await loadScripts();
const SOURCE = readFileSync('src/catalog/kaltura_catalog.json', 'utf8');
const NPM_BASE = 'https://cdn.jsdelivr.net/npm/@kaltura/a2ui-react@0.2.0/';
const WC_SRI = 'sha384-wc';
const REACT_SRI = 'sha384-react';
const adapters = (text: string) => JSON.parse(text)['x-kaltura-adapters'] as { react: Record<string, string>; webcomponent: Record<string, string> };

describe('SEC-19: SRI helper', () => {
  it('SEC-19: sha384 of "abc" matches the published test vector', () => {
    expect(stamp.sri('abc')).toBe('sha384-ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn');
  });

  it('SEC-19: sha512 is available for the npm tarball integrity', () => {
    expect(stamp.sri('abc', 'sha512')).toMatch(/^sha512-[A-Za-z0-9+/]{86}==$/);
  });
});

describe('QA-09: cdnBase', () => {
  it('QA-09: npm mode points at the npm path of the version', () => {
    expect(stamp.cdnBase('npm', { name: '@kaltura/a2ui-react', version: '0.2.0', tag: 'v0.2.0' })).toBe(NPM_BASE);
  });

  it('QA-09: gh mode keeps the old gh path of the tag', () => {
    expect(stamp.cdnBase('gh', { name: '@kaltura/a2ui-react', version: '0.2.0', tag: 'v0.2.0' })).toBe(
      'https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/',
    );
  });

  it('QA-09: an unknown mode throws', () => {
    expect(() => stamp.cdnBase('cdn', { name: 'x', version: '1.0.0', tag: 'v1.0.0' })).toThrow('Unknown mode');
  });
});

describe('QA-09: stampCatalog on the real catalog source', () => {
  const stamped = stamp.stampCatalog(SOURCE, { base: NPM_BASE, wcSri: WC_SRI, reactSri: REACT_SRI });

  it('QA-09: both CDN URLs use the npm path', () => {
    const { react, webcomponent } = adapters(stamped);
    expect([react.cdn, webcomponent.cdn]).toEqual([`${NPM_BASE}dist/kaltura-react.mjs`, `${NPM_BASE}dist/kaltura-wc.js`]);
  });

  it('SEC-19: the web component integrity is the real SRI', () => {
    expect(adapters(stamped).webcomponent.integrity).toBe(WC_SRI);
  });

  it('SEC-19: the React ESM integrity is the real SRI', () => {
    expect(adapters(stamped).react.integrity).toBe(REACT_SRI);
  });

  it('QA-09: no placeholder is left in the adapter URLs and hashes', () => {
    const { react, webcomponent } = adapters(stamped);
    expect(JSON.stringify([react, webcomponent])).not.toContain('__');
  });

  it('QA-09: the result is valid JSON and only the adapter values changed', () => {
    const before = JSON.parse(SOURCE);
    const after = JSON.parse(stamped);
    for (const key of ['react', 'webcomponent']) {
      delete before['x-kaltura-adapters'][key].cdn;
      delete after['x-kaltura-adapters'][key].cdn;
    }
    for (const key of ['react', 'webcomponent']) {
      delete before['x-kaltura-adapters'][key].integrity;
      delete after['x-kaltura-adapters'][key].integrity;
    }
    expect(after).toEqual(before);
  });

  it('QA-09: gh mode stamps the tag path', () => {
    const base = stamp.cdnBase('gh', { name: '@kaltura/a2ui-react', version: '0.2.0', tag: 'v0.2.0' });
    expect(adapters(stamp.stampCatalog(SOURCE, { base, wcSri: WC_SRI, reactSri: REACT_SRI })).react.cdn).toBe(`${base}dist/kaltura-react.mjs`);
  });

  it('QA-09: SRI values with replacement patterns are written as text', () => {
    const { react, webcomponent } = adapters(stamp.stampCatalog(SOURCE, { base: NPM_BASE, wcSri: 'sha384-a$&b$1c', reactSri: 'sha384-d$&e' }));
    expect([webcomponent.integrity, react.integrity]).toEqual(['sha384-a$&b$1c', 'sha384-d$&e']);
  });
});

describe('QA-09: stampCatalog fails loudly', () => {
  it('QA-09: a catalog without the CDN placeholder URL', () => {
    expect(() => stamp.stampCatalog(SOURCE.split('__RELEASE_TAG__').join('v1.0.0'), { base: NPM_BASE, wcSri: WC_SRI, reactSri: REACT_SRI })).toThrow('no CDN placeholder');
  });

  it('QA-09: a catalog without the SRI placeholder', () => {
    expect(() => stamp.stampCatalog(SOURCE.replace('"integrity": "__WC_SRI__"', '"integrity": "x"'), { base: NPM_BASE, wcSri: WC_SRI, reactSri: REACT_SRI })).toThrow('__WC_SRI__');
  });

  it('SEC-19: a catalog without the React SRI placeholder', () => {
    expect(() => stamp.stampCatalog(SOURCE.replace('"integrity": "__REACT_SRI__"', '"integrity": "x"'), { base: NPM_BASE, wcSri: WC_SRI, reactSri: REACT_SRI })).toThrow('__REACT_SRI__');
  });

  it('QA-09: an unknown placeholder inside the adapters', () => {
    const extra = SOURCE.replace('"format": "esm",', '"format": "esm", "extra": "__NEW_SLOT__",');
    expect(() => stamp.stampCatalog(extra, { base: NPM_BASE, wcSri: WC_SRI, reactSri: REACT_SRI })).toThrow('left in the stamped adapters');
  });
});

describe('QA-09: stamp-catalog CLI', () => {
  const work = mkdtempSync(join(tmpdir(), 'stamp-'));
  const catalog = join(work, 'catalog.json');
  writeFileSync(catalog, SOURCE);
  writeFileSync(join(work, 'kaltura-wc.js'), 'wc bytes');
  writeFileSync(join(work, 'kaltura-react.mjs'), 'react bytes');
  const run = (...args: string[]) => spawnSync('node', ['scripts/stamp-catalog.mjs', '--dist', work, '--catalog', catalog, ...args], { encoding: 'utf8' });

  it('QA-09: stamps the given file with the SRI of the built bundle and leaves the repo catalog alone', () => {
    const result = run('--mode', 'npm', '--tag', 'v0.1.4');
    const { react, webcomponent } = adapters(readFileSync(catalog, 'utf8'));
    expect([result.status, webcomponent.integrity, react.integrity, readFileSync('src/catalog/kaltura_catalog.json', 'utf8')]).toEqual([
      0,
      stamp.sri('wc bytes'),
      stamp.sri('react bytes'),
      SOURCE,
    ]);
  });

  it('QA-09: a second run on the stamped file fails instead of stamping twice', () => {
    expect(run('--mode', 'npm', '--tag', 'v0.1.4').status).toBe(1);
  });

  it('QA-09: a bad tag exits 1', () => {
    expect(run('--mode', 'npm', '--tag', 'main').status).toBe(1);
  });
});
