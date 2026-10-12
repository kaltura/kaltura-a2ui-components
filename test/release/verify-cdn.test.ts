// @vitest-environment node
// Covers: QA-09 (published bytes are the built bytes), SEC-19 (SRI of both bundles and the catalog is
// checked after publish). Runs the real scripts against a local server shaped like jsDelivr's npm path.
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { loadScripts, type Hashes } from './scripts';

const { stamp, hashes: hashing, verify } = await loadScripts();
const files = new Map<string, string>();
const missing = new Map<string, number>();
const noCors = new Set<string>();
const hits: string[] = [];
let server: Server;
let origin = '';
let base = '';
let expected: Hashes;

const handle = (request: IncomingMessage, response: ServerResponse) => {
  const path = (request.url ?? '').split('?')[0] ?? '';
  hits.push(path);
  const body = files.get(path);
  const failuresLeft = missing.get(path) ?? 0;
  if (failuresLeft > 0) {
    missing.set(path, failuresLeft - 1);
    response.writeHead(404).end('not yet');
  } else if (body === undefined) {
    response.writeHead(404).end('no such file');
  } else {
    response.writeHead(200, noCors.has(path) ? {} : { 'access-control-allow-origin': '*' }).end(body);
  }
};

const publish = (wc: string, bundle: string) => {
  const catalog = stamp.stampCatalog(readCatalogSource(), { base, wcSri: stamp.sri(wc), reactSri: stamp.sri(bundle) });
  files.set('/pkg/dist/kaltura-wc.js', wc);
  files.set('/pkg/dist/kaltura-react.mjs', bundle);
  files.set('/pkg/src/catalog/kaltura_catalog.json', catalog);
  return catalog;
};

const readCatalogSource = () => readFileSync('src/catalog/kaltura_catalog.json', 'utf8');
const retry = { attempts: 1, delayMs: 1 };

beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  base = `${origin}/pkg/`;
});

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

beforeEach(() => {
  files.clear();
  missing.clear();
  noCors.clear();
  hits.length = 0;
  const catalog = publish('console.log("wc")', 'export const x = 1;');
  expected = hashing.buildHashes({
    version: '0.2.0',
    read: path => Buffer.from(files.get(`/pkg/${path}`) ?? ''),
    tarballName: 'x.tgz',
    tarballBytes: Buffer.from(catalog),
  });
});

describe('QA-09: verifyCdn compares the served bytes with the build', () => {
  it('QA-09: no problems when the CDN serves the built files', async () => {
    expect(await verify.verifyCdn({ base, expected: expected.cdn, retry })).toEqual([]);
  });

  it('QA-09: a changed bundle is reported with both hashes', async () => {
    files.set('/pkg/dist/kaltura-wc.js', 'console.log("evil")');
    const problems = await verify.verifyCdn({ base, expected: expected.cdn, retry });
    expect(problems).toEqual(
      expect.arrayContaining([expect.stringContaining(`dist/kaltura-wc.js: served ${stamp.sri('console.log("evil")')}, build made ${expected.cdn['dist/kaltura-wc.js']}`)]),
    );
  });

  it('SEC-19: the React bundle is checked too, not only the web component', async () => {
    files.set('/pkg/dist/kaltura-react.mjs', 'export const x = 2;');
    expect(await verify.verifyCdn({ base, expected: expected.cdn, retry })).toEqual(expect.arrayContaining([expect.stringContaining('dist/kaltura-react.mjs: served')]));
  });

  it('QA-09: a catalog that differs from the build is reported', async () => {
    files.set('/pkg/src/catalog/kaltura_catalog.json', readCatalogSource());
    const problems = await verify.verifyCdn({ base, expected: expected.cdn, retry });
    expect(problems).toEqual(expect.arrayContaining([expect.stringContaining('src/catalog/kaltura_catalog.json: served')]));
  });

  it('SEC-19: a catalog integrity that is not the served bundle is reported even without expected hashes', async () => {
    const catalog = stamp.stampCatalog(readCatalogSource(), { base, wcSri: 'sha384-wrong', reactSri: stamp.sri('export const x = 1;') });
    files.set('/pkg/src/catalog/kaltura_catalog.json', catalog);
    expect(await verify.verifyCdn({ base, retry })).toEqual([expect.stringContaining('catalog webcomponent.integrity sha384-wrong is not the served')]);
  });

  it('SEC-19: a catalog without the React integrity is reported when the build hashes are given', async () => {
    const catalog = JSON.parse(files.get('/pkg/src/catalog/kaltura_catalog.json') ?? '{}');
    delete catalog['x-kaltura-adapters'].react.integrity;
    files.set('/pkg/src/catalog/kaltura_catalog.json', JSON.stringify(catalog));
    const problems = await verify.verifyCdn({ base, expected: expected.cdn, retry });
    expect(problems).toEqual(expect.arrayContaining([expect.stringContaining('catalog react.integrity undefined is not the served')]));
  });

  it('QA-09: catalog URLs that point somewhere else are reported', async () => {
    const other = stamp.stampCatalog(readCatalogSource(), { base: 'https://cdn.example.com/x/', wcSri: stamp.sri('console.log("wc")'), reactSri: stamp.sri('export const x = 1;') });
    files.set('/pkg/src/catalog/kaltura_catalog.json', other);
    expect(await verify.verifyCdn({ base, retry })).toEqual([
      expect.stringContaining('catalog react.cdn is https://cdn.example.com/x/dist/kaltura-react.mjs'),
      expect.stringContaining('catalog webcomponent.cdn is https://cdn.example.com/x/dist/kaltura-wc.js'),
    ]);
  });

  it('SEC-19: a script without a CORS header is reported, since crossorigin SRI would fail', async () => {
    noCors.add('/pkg/dist/kaltura-wc.js');
    expect(await verify.verifyCdn({ base, expected: expected.cdn, retry })).toEqual([expect.stringContaining('dist/kaltura-wc.js: no access-control-allow-origin')]);
  });

  it('QA-09: a missing file is reported once per file and the others are still checked', async () => {
    files.delete('/pkg/dist/kaltura-react.mjs');
    expect(await verify.verifyCdn({ base, expected: expected.cdn, retry })).toEqual([expect.stringContaining('kaltura-react.mjs: HTTP 404 after 1 attempt(s)')]);
  });
});

describe('QA-09: retries', () => {
  it('QA-09: a file that is 404 at first is fetched on a later try', async () => {
    missing.set('/pkg/dist/kaltura-wc.js', 2);
    expect(await verify.verifyCdn({ base, expected: expected.cdn, retry: { attempts: 3, delayMs: 1 } })).toEqual([]);
  });

  it('QA-09: it gives up after the given number of tries', async () => {
    missing.set('/pkg/dist/kaltura-wc.js', 5);
    await verify.verifyCdn({ base, expected: expected.cdn, retry: { attempts: 3, delayMs: 1 } });
    expect(hits.filter(path => path === '/pkg/dist/kaltura-wc.js')).toHaveLength(3);
  });

  it('QA-09: getWithRetry reports a refused connection', async () => {
    await expect(verify.getWithRetry('http://127.0.0.1:1/x', { attempts: 2, delayMs: 1 })).rejects.toThrow('after 2 attempt(s)');
  });
});

describe('QA-09: registry integrity', () => {
  const packument = (integrity: string) => {
    files.set('/registry/@kaltura%2fa2ui-react/0.2.0', JSON.stringify({ dist: { integrity } }));
  };
  const options = () => ({ registryUrl: `${origin}/registry`, name: '@kaltura/a2ui-react', version: '0.2.0', integrity: expected.tarball.integrity, retry });

  it('QA-09: matches when the registry holds the built tarball', async () => {
    packument(expected.tarball.integrity);
    expect(await verify.verifyRegistry(options())).toEqual([]);
  });

  it('QA-09: reports a tarball that is not the built one', async () => {
    packument('sha512-other');
    expect(await verify.verifyRegistry(options())).toEqual([expect.stringContaining('registry integrity sha512-other is not the build')]);
  });

  it('QA-09: reports a version the registry does not have', async () => {
    expect(await verify.verifyRegistry(options())).toEqual([expect.stringContaining('registry: ')]);
  });
});

describe('QA-09: resolveLatest', () => {
  const options = () => ({ registryUrl: `${origin}/registry`, name: '@kaltura/a2ui-react' });

  it('QA-09: takes the latest dist-tag from the npm registry', async () => {
    files.set('/registry/@kaltura%2fa2ui-react', JSON.stringify({ 'dist-tags': { latest: '0.2.0', next: '0.3.0-rc.1' } }));
    expect(await verify.resolveLatest(options())).toEqual({ version: '0.2.0' });
  });

  it('QA-09: returns undefined when the package is not on npm yet', async () => {
    expect(await verify.resolveLatest(options())).toBeUndefined();
  });

  it('QA-09: returns undefined when the package has no published version', async () => {
    files.set('/registry/@kaltura%2fa2ui-react', JSON.stringify({ name: '@kaltura/a2ui-react', 'dist-tags': {} }));
    expect(await verify.resolveLatest(options())).toBeUndefined();
  });

  it('QA-09: a registry outage is an error, not "not published"', async () => {
    await expect(verify.resolveLatest({ ...options(), registryUrl: 'http://127.0.0.1:1' })).rejects.toThrow();
  });
});

describe('QA-09: verify-cdn CLI', () => {
  // Async on purpose: the local server runs in this process and must keep answering.
  const exec = promisify(execFile);
  const run = async (...args: string[]) => {
    try {
      const { stdout, stderr } = await exec('node', ['scripts/verify-cdn.mjs', ...args]);
      return { status: 0, stdout, stderr };
    } catch (error) {
      const failed = error as { code: number; stdout: string; stderr: string };
      return { status: failed.code, stdout: failed.stdout, stderr: failed.stderr };
    }
  };
  const withBase = (...args: string[]) => run('--version', '0.2.0', '--base-url', base, '--delay-ms', '1', ...args);
  const hashFile = () => {
    const path = `${mkdtempSync(`${tmpdir()}/hashes-`)}/hashes.json`;
    writeFileSync(path, JSON.stringify(expected));
    return path;
  };

  it('QA-09: exits 0 when everything matches', async () => {
    const result = await withBase('--hashes', hashFile(), '--skip-registry');
    expect([result.status, result.stdout]).toEqual([0, expect.stringContaining('OK 3 CDN files and the registry tarball match the build')]);
  });

  it('QA-09: exits 1 and names the file when a byte changed', async () => {
    files.set('/pkg/dist/kaltura-react.mjs', 'export const x = 3;');
    const result = await withBase('--hashes', hashFile(), '--skip-registry');
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL dist/kaltura-react.mjs: served')]);
  });

  it('QA-09: without hashes it checks the catalog against the served bundle', async () => {
    expect((await withBase()).status).toBe(0);
  });

  it('QA-09: --latest exits 0 with a notice while the package is not on npm', async () => {
    const result = await run('--latest', '--registry-url', `${origin}/registry`);
    expect([result.status, result.stdout, result.stderr]).toEqual([0, expect.stringContaining('not published to npm yet'), '']);
  });

  it('QA-09: --latest still fails on a real mismatch once a version exists', async () => {
    files.set('/registry/@kaltura%2fa2ui-react', JSON.stringify({ 'dist-tags': { latest: '0.2.0' } }));
    files.set('/pkg/dist/kaltura-react.mjs', 'export const x = 9;');
    const result = await run('--latest', '--registry-url', `${origin}/registry`, '--base-url', base);
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL')]);
  });

  it('QA-09: needs a version or --latest', async () => {
    expect((await run()).status).toBe(1);
  });
});
