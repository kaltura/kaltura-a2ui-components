// @vitest-environment node
// Covers: QA-09 (bytes jsDelivr serves from the tag are the built bytes), SEC-19 (SRI of both bundles
// and the catalog is checked after the release). Runs the real scripts against a local server shaped
// like jsDelivr's gh path (/gh/<owner>/<repo>@<tag>/<file>) and the GitHub releases API.
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { loadScripts, type Hashes } from './scripts';

const { stamp, hashes: hashing, verify } = await loadScripts();
const TAG = 'v0.2.0';
const REPO = 'kaltura/kaltura-a2ui-components';
const files = new Map<string, string>();
const missing = new Map<string, number>();
const noCors = new Set<string>();
const hits: { path: string; headers: IncomingHttpHeaders }[] = [];
let server: Server;
let origin = '';
let expected: Hashes;

/** Path on the local server, laid out like cdn.jsdelivr.net/gh. */
const cdnPath = (file: string, tag = TAG) => `/gh/${REPO}@${tag}/${file}`;
const latestPath = `/api/repos/${REPO}/releases/latest`;

const handle = (request: IncomingMessage, response: ServerResponse) => {
  const path = (request.url ?? '').split('?')[0] ?? '';
  hits.push({ path, headers: request.headers });
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

const readCatalogSource = () => readFileSync('src/catalog/kaltura_catalog.json', 'utf8');
const retry = { attempts: 1, delayMs: 1 };
const local = () => ({ base: stamp.cdnBase(TAG, origin), catalogBase: stamp.cdnBase(TAG) });

/** Serves bundles and a catalog stamped like release.yml does (real jsDelivr URLs). */
const publish = (wc: string, bundle: string, tag = TAG) => {
  files.set(cdnPath('dist/kaltura-wc.js', tag), wc);
  files.set(cdnPath('dist/kaltura-react.mjs', tag), bundle);
  files.set(cdnPath('src/catalog/kaltura_catalog.json', tag), stamp.stampCatalog(readCatalogSource(), { tag, wcSri: stamp.sri(wc), reactSri: stamp.sri(bundle) }));
  return hashing.buildHashes({ version: tag.slice(1), read: path => Buffer.from(files.get(cdnPath(path, tag)) ?? '') });
};

/** A GitHub Release as the API returns it, with a hashes.json asset unless `assets` is empty. */
const release = (tag: string, assets = [{ name: 'hashes.json', browser_download_url: `${origin}/download/${tag}/hashes.json` }]) => {
  files.set(latestPath, JSON.stringify({ tag_name: tag, assets }));
};

beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

beforeEach(() => {
  files.clear();
  missing.clear();
  noCors.clear();
  hits.length = 0;
  expected = publish('console.log("wc")', 'export const x = 1;');
});

describe('QA-09: verifyCdn compares the served bytes with the build', () => {
  it('QA-09: no problems when the CDN serves the built files', async () => {
    expect(await verify.verifyCdn({ ...local(), expected: expected.cdn, retry })).toEqual([]);
  });

  it('QA-09: it fetches from the gh path of the tag', async () => {
    await verify.verifyCdn({ ...local(), expected: expected.cdn, retry });
    expect(hits.map(hit => hit.path)).toEqual(hashing.CDN_FILES.map(file => cdnPath(file)));
  });

  it('QA-09: a changed bundle is reported with both hashes', async () => {
    files.set(cdnPath('dist/kaltura-wc.js'), 'console.log("evil")');
    const problems = await verify.verifyCdn({ ...local(), expected: expected.cdn, retry });
    expect(problems).toEqual(
      expect.arrayContaining([expect.stringContaining(`dist/kaltura-wc.js: served ${stamp.sri('console.log("evil")')}, build made ${expected.cdn['dist/kaltura-wc.js']}`)]),
    );
  });

  it('SEC-19: the React bundle is checked too, not only the web component', async () => {
    files.set(cdnPath('dist/kaltura-react.mjs'), 'export const x = 2;');
    expect(await verify.verifyCdn({ ...local(), expected: expected.cdn, retry })).toEqual(expect.arrayContaining([expect.stringContaining('dist/kaltura-react.mjs: served')]));
  });

  it('QA-09: a catalog that differs from the build is reported', async () => {
    files.set(cdnPath('src/catalog/kaltura_catalog.json'), readCatalogSource());
    const problems = await verify.verifyCdn({ ...local(), expected: expected.cdn, retry });
    expect(problems).toEqual(expect.arrayContaining([expect.stringContaining('src/catalog/kaltura_catalog.json: served')]));
  });

  it('SEC-19: a catalog integrity that is not the served bundle is reported even without expected hashes', async () => {
    const catalog = stamp.stampCatalog(readCatalogSource(), { tag: TAG, wcSri: 'sha384-wrong', reactSri: stamp.sri('export const x = 1;') });
    files.set(cdnPath('src/catalog/kaltura_catalog.json'), catalog);
    expect(await verify.verifyCdn({ ...local(), retry })).toEqual([expect.stringContaining('catalog webcomponent.integrity sha384-wrong is not the served')]);
  });

  it('SEC-19: a catalog without the React integrity is reported when the build hashes are given', async () => {
    const catalog = JSON.parse(files.get(cdnPath('src/catalog/kaltura_catalog.json')) ?? '{}');
    delete catalog['x-kaltura-adapters'].react.integrity;
    files.set(cdnPath('src/catalog/kaltura_catalog.json'), JSON.stringify(catalog));
    const problems = await verify.verifyCdn({ ...local(), expected: expected.cdn, retry });
    expect(problems).toEqual(expect.arrayContaining([expect.stringContaining('catalog react.integrity undefined is not the served')]));
  });

  it('QA-09: catalog URLs that point at another tag are reported', async () => {
    const other = stamp.stampCatalog(readCatalogSource(), { tag: 'v0.1.9', wcSri: stamp.sri('console.log("wc")'), reactSri: stamp.sri('export const x = 1;') });
    files.set(cdnPath('src/catalog/kaltura_catalog.json'), other);
    expect(await verify.verifyCdn({ ...local(), retry })).toEqual([
      expect.stringContaining(`catalog react.cdn is ${stamp.cdnBase('v0.1.9')}dist/kaltura-react.mjs`),
      expect.stringContaining(`catalog webcomponent.cdn is ${stamp.cdnBase('v0.1.9')}dist/kaltura-wc.js`),
    ]);
  });

  it('SEC-19: a script without a CORS header is reported, since crossorigin SRI would fail', async () => {
    noCors.add(cdnPath('dist/kaltura-wc.js'));
    expect(await verify.verifyCdn({ ...local(), expected: expected.cdn, retry })).toEqual([expect.stringContaining('dist/kaltura-wc.js: no access-control-allow-origin')]);
  });

  it('QA-09: a missing file is reported once per file and the others are still checked', async () => {
    files.delete(cdnPath('dist/kaltura-react.mjs'));
    expect(await verify.verifyCdn({ ...local(), expected: expected.cdn, retry })).toEqual([expect.stringContaining('kaltura-react.mjs: HTTP 404 after 1 attempt(s)')]);
  });
});

describe('QA-09: retries', () => {
  it('QA-09: a file that is 404 at first (tag not yet seen by jsDelivr) is fetched on a later try', async () => {
    missing.set(cdnPath('dist/kaltura-wc.js'), 2);
    expect(await verify.verifyCdn({ ...local(), expected: expected.cdn, retry: { attempts: 3, delayMs: 1 } })).toEqual([]);
  });

  it('QA-09: it gives up after the given number of tries', async () => {
    missing.set(cdnPath('dist/kaltura-wc.js'), 5);
    await verify.verifyCdn({ ...local(), expected: expected.cdn, retry: { attempts: 3, delayMs: 1 } });
    expect(hits.filter(hit => hit.path === cdnPath('dist/kaltura-wc.js'))).toHaveLength(3);
  });

  it('QA-09: getWithRetry reports a refused connection', async () => {
    await expect(verify.getWithRetry('http://127.0.0.1:1/x', { attempts: 2, delayMs: 1 })).rejects.toThrow('after 2 attempt(s)');
  });
});

describe('QA-09: resolveLatest reads the latest GitHub Release', () => {
  const options = (token?: string) => ({ apiUrl: `${origin}/api`, repo: REPO, token });

  it('QA-09: returns the tag and the hashes.json asset URL', async () => {
    release(TAG);
    expect(await verify.resolveLatest(options())).toEqual({ tag: TAG, hashesUrl: `${origin}/download/${TAG}/hashes.json` });
  });

  it('QA-09: a Release without a hashes.json asset has no hashes URL', async () => {
    release('v0.1.3', []);
    expect(await verify.resolveLatest(options())).toEqual({ tag: 'v0.1.3', hashesUrl: undefined });
  });

  it('QA-09: returns undefined when the repo has no Release yet', async () => {
    expect(await verify.resolveLatest(options())).toBeUndefined();
  });

  it('SEC-09: sends the read token to the API when one is given', async () => {
    release(TAG);
    await verify.resolveLatest(options('read-only-token'));
    expect(hits.find(hit => hit.path === latestPath)?.headers.authorization).toBe('Bearer read-only-token');
  });

  it('QA-09: an API outage is an error, not "no release"', async () => {
    await expect(verify.resolveLatest({ ...options(), apiUrl: 'http://127.0.0.1:1' })).rejects.toThrow();
  });
});

describe('QA-09: verify-cdn CLI', () => {
  // Async on purpose: the local server runs in this process and must keep answering.
  const exec = promisify(execFile);
  const run = async (...args: string[]) => {
    try {
      const { stdout, stderr } = await exec('node', ['scripts/verify-cdn.mjs', '--cdn-origin', origin, '--api-url', `${origin}/api`, '--delay-ms', '1', ...args], { env: { ...process.env, GH_TOKEN: '', GITHUB_ACTIONS: '' } });
      return { status: 0, stdout, stderr };
    } catch (error) {
      const failed = error as { code: number; stdout: string; stderr: string };
      return { status: failed.code, stdout: failed.stdout, stderr: failed.stderr };
    }
  };
  const hashFile = (value: Hashes = expected) => {
    const path = `${mkdtempSync(`${tmpdir()}/hashes-`)}/hashes.json`;
    writeFileSync(path, JSON.stringify(value));
    return path;
  };

  it('QA-09: exits 0 when everything matches', async () => {
    const result = await run('--tag', TAG, '--hashes', hashFile());
    expect([result.status, result.stdout]).toEqual([0, expect.stringContaining('OK 3 files on jsDelivr match the build')]);
  });

  it('QA-09: exits 1 and names the file when a byte changed', async () => {
    files.set(cdnPath('dist/kaltura-react.mjs'), 'export const x = 3;');
    const result = await run('--tag', TAG, '--hashes', hashFile());
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL dist/kaltura-react.mjs: served')]);
  });

  it('QA-09: exits 1 when hashes.json is for another version', async () => {
    const result = await run('--tag', TAG, '--hashes', hashFile({ ...expected, version: '0.1.9' }));
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL hashes.json is for 0.1.9, not v0.2.0')]);
  });

  it('QA-09: without hashes it checks the catalog against the served bundles', async () => {
    expect((await run('--tag', TAG)).status).toBe(0);
  });

  it('QA-09: --latest exits 0 with a notice while there is no Release', async () => {
    const result = await run('--latest');
    expect([result.status, result.stdout, result.stderr]).toEqual([0, expect.stringContaining('no GitHub Release yet'), '']);
  });

  it('QA-09: --latest exits 0 with a notice when the latest Release has no hashes.json (made before 0.2.0)', async () => {
    release('v0.1.3', []);
    const result = await run('--latest');
    expect([result.status, result.stdout, result.stderr]).toEqual([0, expect.stringContaining('v0.1.3 has no hashes.json asset'), '']);
  });

  it('QA-09: --latest checks the tag of the latest Release against its hashes.json asset', async () => {
    const old = publish('console.log("wc 0.1.9")', 'export const y = 1;', 'v0.1.9');
    release('v0.1.9');
    files.set('/download/v0.1.9/hashes.json', JSON.stringify(old));
    const result = await run('--latest');
    expect([result.status, hits.some(hit => hit.path === cdnPath('dist/kaltura-wc.js', 'v0.1.9'))]).toEqual([0, true]);
  });

  it('QA-09: --latest fails on a mismatch once a Release has hashes', async () => {
    release(TAG);
    files.set(`/download/${TAG}/hashes.json`, JSON.stringify(expected));
    files.set(cdnPath('dist/kaltura-wc.js'), 'console.log("other")');
    const result = await run('--latest');
    expect([result.status, result.stderr]).toEqual([1, expect.stringContaining('FAIL dist/kaltura-wc.js: served')]);
  });

  it('QA-09: needs --tag or --latest', async () => {
    expect((await run()).status).toBe(1);
  });

  it('QA-09: rejects a tag that is not vX.Y.Z', async () => {
    expect((await run('--tag', 'main')).status).toBe(1);
  });
});
