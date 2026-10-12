// Checks what jsDelivr serves from a release tag. Read-only, node built-ins only.
//   node scripts/verify-cdn.mjs --tag v0.2.0 --hashes hashes.json --attempts 20   (release)
//   node scripts/verify-cdn.mjs --latest                                           (nightly)
// --latest reads the latest GitHub Release and its hashes.json asset. With no Release,
// or a Release without hashes.json (made before 0.2.0), it prints a notice and exits 0.
// With hashes: the bytes on jsDelivr must equal the build's hashes. Without: the
// served catalog must match the served bundles. Any mismatch exits 1.
// Why retries: jsDelivr can take a few minutes to see a new tag. --delay-ms between tries.
// GH_TOKEN (read-only is enough) is sent to the GitHub API only, never to the CDN.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseTag } from './release-check.mjs';
import { CDN_FILES } from './release-hashes.mjs';
import { GH_REPO, cdnBase, sri } from './stamp-catalog.mjs';

const CATALOG = 'src/catalog/kaltura_catalog.json';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** GET with retries on any failure. Returns { bytes, headers }. */
export async function getWithRetry(url, { attempts = 1, delayMs = 0, log = () => {} } = {}) {
  let reason = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return { bytes: Buffer.from(await response.arrayBuffer()), headers: response.headers };
      reason = `HTTP ${response.status}`;
    } catch (error) {
      reason = error.message;
    }
    if (attempt < attempts) {
      log(`  ${url}: ${reason}, retry ${attempt}/${attempts - 1} in ${delayMs / 1000}s`);
      await sleep(delayMs);
    }
  }
  throw new Error(`${url}: ${reason} after ${attempts} attempt(s)`);
}

/**
 * The latest GitHub Release: its tag and the URL of its hashes.json asset (undefined
 * if it has none). Undefined when the repo has no Release. Other failures throw.
 */
export async function resolveLatest({ apiUrl = 'https://api.github.com', repo = GH_REPO, token }) {
  const headers = { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${apiUrl}/repos/${repo}/releases/latest`, { headers, signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub API answered HTTP ${response.status} for the latest Release of ${repo}.`);
  const { tag_name: tag, assets = [] } = await response.json();
  return { tag, hashesUrl: assets.find(asset => asset.name === 'hashes.json')?.browser_download_url };
}

/**
 * Fetches the three CDN files under `base` (with trailing slash). Returns problems.
 * `catalogBase` is the base the catalog URLs must use (the real jsDelivr URL when
 * `base` is a test server). `expected` is the hashes.json `cdn` object, or undefined
 * for a self-check.
 */
export async function verifyCdn({ base, catalogBase = base, expected, retry }) {
  const problems = [];
  const seen = {};
  for (const path of CDN_FILES) {
    try {
      const { bytes, headers } = await getWithRetry(`${base}${path}`, retry);
      seen[path] = { bytes, sri: sri(bytes) };
      if (!path.endsWith('.json') && !headers.get('access-control-allow-origin')) {
        problems.push(`${path}: no access-control-allow-origin header, so a crossorigin script with SRI would fail`);
      }
      if (expected && expected[path] !== seen[path].sri) problems.push(`${path}: served ${seen[path].sri}, build made ${expected[path]}`);
    } catch (error) {
      problems.push(error.message);
    }
  }
  if (seen[CATALOG]) {
    const { react, webcomponent } = JSON.parse(seen[CATALOG].bytes.toString('utf8'))['x-kaltura-adapters'];
    if (react.cdn !== `${catalogBase}dist/kaltura-react.mjs`) problems.push(`catalog react.cdn is ${react.cdn}`);
    if (webcomponent.cdn !== `${catalogBase}dist/kaltura-wc.js`) problems.push(`catalog webcomponent.cdn is ${webcomponent.cdn}`);
    const wc = seen['dist/kaltura-wc.js'];
    if (wc && webcomponent.integrity !== wc.sri) problems.push(`catalog webcomponent.integrity ${webcomponent.integrity} is not the served ${wc.sri}`);
    const bundle = seen['dist/kaltura-react.mjs'];
    // A release (expected given) must carry the React SRI. Tags before 0.2.0 do not have the key.
    if (bundle && (expected || react.integrity !== undefined) && react.integrity !== bundle.sri) problems.push(`catalog react.integrity ${react.integrity} is not the served ${bundle.sri}`);
  }
  return problems;
}

const notice = text => {
  console.log(`${process.env.GITHUB_ACTIONS ? '::notice::' : 'NOTICE '}${text}`);
  process.exit(0);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const { values } = parseArgs({
      options: {
        tag: { type: 'string' },
        latest: { type: 'boolean', default: false },
        hashes: { type: 'string' },
        'cdn-origin': { type: 'string', default: 'https://cdn.jsdelivr.net' },
        'api-url': { type: 'string', default: 'https://api.github.com' },
        attempts: { type: 'string', default: '1' },
        'delay-ms': { type: 'string', default: '30000' },
      },
    });
    if (!values.latest && !values.tag) throw new Error('Pass --tag vX.Y.Z or --latest.');
    const retry = { attempts: Number(values.attempts), delayMs: Number(values['delay-ms']), log: console.log };
    let tag = values.tag;
    let hashes = values.hashes ? JSON.parse(readFileSync(values.hashes, 'utf8')) : undefined;
    if (values.latest) {
      const latest = await resolveLatest({ apiUrl: values['api-url'], token: process.env.GH_TOKEN || undefined });
      if (!latest) notice(`${GH_REPO} has no GitHub Release yet, so there is no tag to check. Nothing was checked.`);
      if (!latest.hashesUrl) notice(`The latest Release ${latest.tag} has no hashes.json asset (made before 0.2.0). Nothing was checked.`);
      tag = latest.tag;
      hashes = JSON.parse((await getWithRetry(latest.hashesUrl, retry)).bytes.toString('utf8'));
    }
    const { version } = parseTag(tag);
    const base = cdnBase(tag, values['cdn-origin']);
    console.log(`Checking ${base}`);
    const problems = [
      ...(hashes && hashes.version !== version ? [`hashes.json is for ${hashes.version}, not ${tag}`] : []),
      ...(await verifyCdn({ base, catalogBase: cdnBase(tag), expected: hashes?.cdn, retry })),
    ];
    if (problems.length > 0) {
      for (const problem of problems) console.error(`FAIL ${problem}`);
      process.exit(1);
    }
    console.log(`OK ${CDN_FILES.length} files on jsDelivr ${hashes ? 'match the build' : 'match the served catalog'}.`);
  } catch (error) {
    console.error(`verify-cdn: ${error.message}`);
    process.exit(1);
  }
}
