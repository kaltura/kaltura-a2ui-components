// @vitest-environment node
// Covers: QA-09 (catalog is stamped in the build workspace, bytes match what is released),
// SEC-19 (the stamped catalog carries the real SRI).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { stamp } = await loadScripts();
const SOURCE = readFileSync('src/catalog/kaltura_catalog.json', 'utf8');
const TAG = 'v0.2.0';
const BASE = 'https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/';
const WC_SRI = 'sha384-wc';
const REACT_SRI = 'sha384-react';
const STUB_SRI = 'sha384-stub';
const options = { tag: TAG, wcSri: WC_SRI, reactSri: REACT_SRI, stubSri: STUB_SRI };
const adapters = (text: string) => JSON.parse(text)['x-kaltura-adapters'] as { react: Record<string, string>; webcomponent: Record<string, string> };

describe('SEC-19: SRI helper', () => {
  it('SEC-19: sha384 of "abc" matches the published test vector', () => {
    expect(stamp.sri('abc')).toBe('sha384-ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn');
  });
});

describe('QA-09: cdnBase', () => {
  it('QA-09: points at the jsDelivr gh path of the tag', () => {
    expect(stamp.cdnBase(TAG)).toBe(BASE);
  });

  it('QA-09: takes another origin for a local test server', () => {
    expect(stamp.cdnBase(TAG, 'http://127.0.0.1:9')).toBe('http://127.0.0.1:9/gh/kaltura/kaltura-a2ui-components@v0.2.0/');
  });
});

describe('QA-09: stampCatalog on the real catalog source', () => {
  const stamped = stamp.stampCatalog(SOURCE, options);

  it('QA-09: both CDN URLs use the gh path of the tag', () => {
    const { react, webcomponent } = adapters(stamped);
    expect([react.cdn, webcomponent.cdn]).toEqual([`${BASE}dist/kaltura-react.mjs`, `${BASE}dist/kaltura-wc.js`]);
  });

  it('SEC-19: the stub URL uses the gh path of the tag', () => {
    expect(adapters(stamped).react.stubCdn).toBe(`${BASE}dist/html-element-stub.mjs`);
  });

  it('QA-09: the install line pins the git tag', () => {
    expect(adapters(stamped).react.install).toBe('npm i github:kaltura/kaltura-a2ui-components#v0.2.0');
  });

  it('SEC-19: the web component integrity is the real SRI', () => {
    expect(adapters(stamped).webcomponent.integrity).toBe(WC_SRI);
  });

  it('SEC-19: the React ESM integrity is the real SRI', () => {
    expect(adapters(stamped).react.integrity).toBe(REACT_SRI);
  });

  it('SEC-19: the stub integrity is the real SRI', () => {
    expect(adapters(stamped).react.stubIntegrity).toBe(STUB_SRI);
  });

  it('QA-09: no placeholder is left in the adapters', () => {
    const { react, webcomponent } = adapters(stamped);
    expect(JSON.stringify([react, webcomponent])).not.toContain('__');
  });

  it('QA-09: the result is valid JSON and only the adapter values changed', () => {
    const before = JSON.parse(SOURCE);
    const after = JSON.parse(stamped);
    for (const catalog of [before, after]) {
      for (const key of ['cdn', 'integrity', 'install', 'stubCdn', 'stubIntegrity']) {
        delete catalog['x-kaltura-adapters'].react[key];
        delete catalog['x-kaltura-adapters'].webcomponent[key];
      }
    }
    expect(after).toEqual(before);
  });

  it('QA-09: a base for a test server replaces only the CDN URLs', () => {
    const { react } = adapters(stamp.stampCatalog(SOURCE, { ...options, base: 'http://127.0.0.1:9/x/' }));
    expect([react.cdn, react.install]).toEqual(['http://127.0.0.1:9/x/dist/kaltura-react.mjs', 'npm i github:kaltura/kaltura-a2ui-components#v0.2.0']);
  });

  it('QA-09: SRI values with replacement patterns are written as text', () => {
    const { react, webcomponent } = adapters(stamp.stampCatalog(SOURCE, { tag: TAG, wcSri: 'sha384-a$&b$1c', reactSri: 'sha384-d$&e', stubSri: 'sha384-f$`g' }));
    expect([webcomponent.integrity, react.integrity, react.stubIntegrity]).toEqual(['sha384-a$&b$1c', 'sha384-d$&e', 'sha384-f$`g']);
  });
});

describe('QA-09: stampCatalog fails loudly', () => {
  it('QA-09: a catalog without the CDN placeholder URL', () => {
    expect(() => stamp.stampCatalog(SOURCE.split('__RELEASE_TAG__').join('v1.0.0'), options)).toThrow('no CDN placeholder');
  });

  it('QA-09: a catalog without the SRI placeholder', () => {
    expect(() => stamp.stampCatalog(SOURCE.replace('"integrity": "__WC_SRI__"', '"integrity": "x"'), options)).toThrow('__WC_SRI__');
  });

  it('SEC-19: a catalog without the React SRI placeholder', () => {
    expect(() => stamp.stampCatalog(SOURCE.replace('"integrity": "__REACT_SRI__"', '"integrity": "x"'), options)).toThrow('__REACT_SRI__');
  });

  it('SEC-19: a catalog without the stub SRI placeholder', () => {
    expect(() => stamp.stampCatalog(SOURCE.replace('"stubIntegrity": "__STUB_SRI__"', '"stubIntegrity": "x"'), options)).toThrow('__STUB_SRI__');
  });

  it('QA-09: an unknown placeholder inside the adapters', () => {
    const extra = SOURCE.replace('"format": "esm",', '"format": "esm", "extra": "__NEW_SLOT__",');
    expect(() => stamp.stampCatalog(extra, options)).toThrow('left in the stamped adapters');
  });
});

describe('QA-09: stamp-catalog CLI', () => {
  const work = mkdtempSync(join(tmpdir(), 'stamp-'));
  const catalog = join(work, 'catalog.json');
  writeFileSync(catalog, SOURCE);
  writeFileSync(join(work, 'kaltura-wc.js'), 'wc bytes');
  writeFileSync(join(work, 'kaltura-react.mjs'), 'react bytes');
  writeFileSync(join(work, 'html-element-stub.mjs'), 'stub bytes');
  const run = (...args: string[]) => spawnSync('node', ['scripts/stamp-catalog.mjs', '--dist', work, '--catalog', catalog, ...args], { encoding: 'utf8' });

  it('QA-09: stamps the given file with the SRI of the built bundle and leaves the repo catalog alone', () => {
    const result = run('--tag', TAG);
    const { react, webcomponent } = adapters(readFileSync(catalog, 'utf8'));
    expect([result.status, webcomponent.integrity, react.integrity, react.stubIntegrity, readFileSync('src/catalog/kaltura_catalog.json', 'utf8')]).toEqual([
      0,
      stamp.sri('wc bytes'),
      stamp.sri('react bytes'),
      stamp.sri('stub bytes'),
      SOURCE,
    ]);
  });

  it('QA-09: a second run on the stamped file fails instead of stamping twice', () => {
    expect(run('--tag', TAG).status).toBe(1);
  });

  it('SEC-19: a dist without the stub file exits 1 and leaves the catalog unstamped', () => {
    const bare = mkdtempSync(join(tmpdir(), 'stamp-bare-'));
    for (const file of ['kaltura-wc.js', 'kaltura-react.mjs']) writeFileSync(join(bare, file), file);
    const fresh = join(bare, 'catalog.json');
    writeFileSync(fresh, SOURCE);
    const result = spawnSync('node', ['scripts/stamp-catalog.mjs', '--dist', bare, '--catalog', fresh, '--tag', TAG], { encoding: 'utf8' });
    expect([result.status, result.stderr, readFileSync(fresh, 'utf8')]).toEqual([1, expect.stringContaining('html-element-stub.mjs'), SOURCE]);
  });

  it.each(['main', '0.2.0'])('QA-09: tag %j exits 1', tag => {
    const fresh = join(work, `${tag}.json`);
    writeFileSync(fresh, SOURCE);
    const result = spawnSync('node', ['scripts/stamp-catalog.mjs', '--dist', work, '--catalog', fresh, '--tag', tag], { encoding: 'utf8' });
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('is not vX.Y.Z')]);
  });
});
