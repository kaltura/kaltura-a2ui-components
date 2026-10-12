// Checks what jsDelivr serves for a published version. Read-only, node built-ins only.
//   node scripts/verify-cdn.mjs --version 0.2.0 --hashes hashes.json --attempts 20   (release)
//   node scripts/verify-cdn.mjs --latest                                              (nightly)
// --latest reads the newest version from the npm registry. If the package is not
// on npm yet it prints a notice and exits 0. Any mismatch once a version exists exits 1.
// With --hashes: the registry tarball integrity and the CDN bytes must equal the
// build's hashes. Without it: the CDN catalog must match the CDN bytes.
// Why retries: jsDelivr caches a 404 on the npm path for 10 minutes, and a new
// version can take a few minutes to appear. --delay-ms between tries.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { CDN_FILES } from './release-hashes.mjs';
import { cdnBase, sri } from './stamp-catalog.mjs';

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
 * Latest version on the npm registry, or undefined if the package has no
 * published version yet (404 or no dist-tags). Other failures throw.
 */
export async function resolveLatest({ name, registryUrl = 'https://registry.npmjs.org' }) {
  const response = await fetch(`${registryUrl}/${name.replace('/', '%2f')}`, { signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`npm registry answered HTTP ${response.status} for ${name}.`);
  const tags = (await response.json())['dist-tags'] ?? {};
  const version = tags.latest ?? Object.values(tags)[0];
  return version ? { version } : undefined;
}

/** The registry must hold the exact tarball the build made. Returns problems. */
export async function verifyRegistry({ registryUrl, name, version, integrity, retry }) {
  try {
    const { bytes } = await getWithRetry(`${registryUrl}/${name.replace('/', '%2f')}/${version}`, retry);
    const published = JSON.parse(bytes.toString('utf8')).dist?.integrity;
    return published === integrity ? [] : [`registry integrity ${published} is not the build's ${integrity}`];
  } catch (error) {
    return [`registry: ${error.message}`];
  }
}

/**
 * Fetches the three CDN files under `base` (with trailing slash). Returns problems.
 * `expected` is the hashes.json `cdn` object, or undefined for a self-check.
 */
export async function verifyCdn({ base, expected, retry }) {
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
    if (react.cdn !== `${base}dist/kaltura-react.mjs`) problems.push(`catalog react.cdn is ${react.cdn}`);
    if (webcomponent.cdn !== `${base}dist/kaltura-wc.js`) problems.push(`catalog webcomponent.cdn is ${webcomponent.cdn}`);
    const wc = seen['dist/kaltura-wc.js'];
    if (wc && webcomponent.integrity !== wc.sri) problems.push(`catalog webcomponent.integrity ${webcomponent.integrity} is not the served ${wc.sri}`);
    const bundle = seen['dist/kaltura-react.mjs'];
    // A release (expected given) must carry the React SRI. Older published versions do not have the key.
    if (bundle && (expected || react.integrity !== undefined) && react.integrity !== bundle.sri) problems.push(`catalog react.integrity ${react.integrity} is not the served ${bundle.sri}`);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { values } = parseArgs({
      options: {
        mode: { type: 'string', default: 'npm' },
        version: { type: 'string' },
        latest: { type: 'boolean', default: false },
        hashes: { type: 'string' },
        'base-url': { type: 'string' },
        'registry-url': { type: 'string', default: 'https://registry.npmjs.org' },
        'skip-registry': { type: 'boolean', default: false },
        attempts: { type: 'string', default: '1' },
        'delay-ms': { type: 'string', default: '30000' },
      },
    });
    const { name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const resolved = values.latest ? await resolveLatest({ name, registryUrl: values['registry-url'] }) : { version: values.version };
    if (!values.latest && !resolved.version) throw new Error('Pass --version X.Y.Z or --latest.');
    if (!resolved) {
      console.log(`${process.env.GITHUB_ACTIONS ? '::notice::' : 'NOTICE '}${name} is not published to npm yet, so there is no CDN version to check. Nothing was checked.`);
      process.exit(0);
    }
    const base = values['base-url'] ? values['base-url'].replace(/\/?$/, '/') : cdnBase(values.mode, { name, version: resolved.version, tag: `v${resolved.version}` });
    const retry = { attempts: Number(values.attempts), delayMs: Number(values['delay-ms']), log: console.log };
    const hashes = values.hashes ? JSON.parse(readFileSync(values.hashes, 'utf8')) : undefined;
    console.log(`Checking ${base}`);
    const problems = [
      ...(hashes && !values['skip-registry'] ? await verifyRegistry({ registryUrl: values['registry-url'], name, version: resolved.version, integrity: hashes.tarball.integrity, retry }) : []),
      ...(await verifyCdn({ base, expected: hashes?.cdn, retry })),
    ];
    if (problems.length > 0) {
      for (const problem of problems) console.error(`FAIL ${problem}`);
      process.exit(1);
    }
    console.log(`OK ${CDN_FILES.length} CDN files${hashes ? ' and the registry tarball match the build' : ' match the CDN catalog'}.`);
  } catch (error) {
    console.error(`verify-cdn: ${error.message}`);
    process.exit(1);
  }
}
