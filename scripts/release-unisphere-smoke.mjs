// Read-only check of the public Unisphere loader in every allowed region (see
// KALTURA_REGIONS in src/core/unisphere-loader.ts). Used by nightly-live.yml.
//   node scripts/release-unisphere-smoke.mjs
import { pathToFileURL } from 'node:url';

export const REGIONS = ['nvp1', 'irp2', 'frp2', 'cap2', 'syp2'];

/** Problems with one loader response. A host does `import()` and reads `loader` and `createWorkspace`. */
export function checkLoader(region, { status, headers, body }) {
  const where = `unisphere.${region}`;
  const problems = [];
  if (status !== 200) return [`${where}: HTTP ${status}`];
  if (!/javascript/i.test(headers.get('content-type') ?? '')) problems.push(`${where}: content-type is ${headers.get('content-type')}`);
  if (!headers.get('access-control-allow-origin')) problems.push(`${where}: no access-control-allow-origin header, import() from a host page would fail`);
  const exported = /export\s*\{([^}]*)\}\s*;?\s*$/.exec(body.trim())?.[1] ?? '';
  for (const name of ['loader', 'createWorkspace']) {
    if (!new RegExp(`\\b${name}\\b`).test(exported)) problems.push(`${where}: module does not export ${name}`);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = [];
  for (const region of REGIONS) {
    const url = `https://unisphere.${region}.ovp.kaltura.com/v1/loader/index.esm.js`;
    try {
      const response = await fetch(url, { headers: { origin: 'https://example.com' }, signal: AbortSignal.timeout(30_000) });
      problems.push(...checkLoader(region, { status: response.status, headers: response.headers, body: await response.text() }));
    } catch (error) {
      problems.push(`unisphere.${region}: ${error.message}`);
    }
  }
  for (const problem of problems) console.error(`FAIL ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`OK loader in ${REGIONS.length} regions.`);
}
