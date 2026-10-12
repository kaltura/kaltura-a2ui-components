// @vitest-environment node
// Covers: SEC-09 (nightly live check). Unit tests for the loader response checks. No network.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { smoke } = await loadScripts();
const MODULE = 'const a=1;export{a as createWorkspace,b as embeds,c as loader};';
const ok = { status: 200, headers: new Headers({ 'content-type': 'text/javascript', 'access-control-allow-origin': '*' }), body: MODULE };

describe('SEC-09: nightly Unisphere loader check', () => {
  it('SEC-09: checks the same regions as the serverUrl allowlist', () => {
    const source = readFileSync('src/core/unisphere-loader.ts', 'utf8');
    const listed = /KALTURA_REGIONS = \[([^\]]*)\]/.exec(source)?.[1]?.match(/'([a-z0-9]+)'/g)?.map(quoted => quoted.slice(1, -1));
    expect(smoke.REGIONS).toEqual(listed);
  });

  it('SEC-09: accepts a module that exports loader and createWorkspace', () => {
    expect(smoke.checkLoader('nvp1', ok)).toEqual([]);
  });

  it('SEC-09: reports a non-200 status', () => {
    expect(smoke.checkLoader('irp2', { ...ok, status: 503 })).toEqual(['unisphere.irp2: HTTP 503']);
  });

  it('SEC-09: reports a missing CORS header', () => {
    expect(smoke.checkLoader('nvp1', { ...ok, headers: new Headers({ 'content-type': 'text/javascript' }) })).toEqual([expect.stringContaining('no access-control-allow-origin')]);
  });

  it('SEC-09: reports an HTML error page served with status 200', () => {
    const page = { ...ok, headers: new Headers({ 'content-type': 'text/html', 'access-control-allow-origin': '*' }), body: '<html>sorry</html>' };
    expect(smoke.checkLoader('nvp1', page)).toEqual([
      expect.stringContaining('content-type is text/html'),
      expect.stringContaining('does not export loader'),
      expect.stringContaining('does not export createWorkspace'),
    ]);
  });

  it('SEC-09: reports a module that lost the createWorkspace export', () => {
    expect(smoke.checkLoader('nvp1', { ...ok, body: 'export{c as loader};' })).toEqual([expect.stringContaining('does not export createWorkspace')]);
  });
});
