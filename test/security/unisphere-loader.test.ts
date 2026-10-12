// Covers: SEC-01 / QA-03 (allowlist part). Unit tests for core/unisphere-loader.ts.
import { describe, it, expect, afterEach } from 'vitest';
import {
  deriveLoaderUrl,
  loadUnisphereModule,
  setExtraAllowedOrigins,
  getExtraAllowedOrigins,
} from '../../src/core/unisphere-loader';

const HOST = 'https://unisphere.nvp1.ovp.kaltura.com';
const LOADER = `${HOST}/v1/loader/index.esm.js`;

afterEach(() => setExtraAllowedOrigins([]));

describe('SEC-01: deriveLoaderUrl accepts', () => {
  it.each(['nvp1', 'irp2', 'frp2', 'cap2', 'syp2'])('SEC-01: region %s', region => {
    const origin = `https://unisphere.${region}.ovp.kaltura.com`;
    expect(deriveLoaderUrl(`${origin}/v1`)).toBe(`${origin}/v1/loader/index.esm.js`);
  });
  it.each([HOST, `${HOST}/`, `${HOST}/v1`, `${HOST}/v1/`])('SEC-01: %s', url => {
    expect(deriveLoaderUrl(url)).toBe(LOADER);
  });
});

describe('SEC-01: deriveLoaderUrl rejects', () => {
  const BAD = [
    '',
    ' ',
    'unisphere.nvp1.ovp.kaltura.com/v1',
    `http://unisphere.nvp1.ovp.kaltura.com/v1`,
    'data:text/javascript,export default 1',
    'javascript:alert(1)',
    'blob:https://unisphere.nvp1.ovp.kaltura.com/uuid',
    '//unisphere.nvp1.ovp.kaltura.com/v1',
    '/v1',
    'https://unisphere.sgp2.ovp.kaltura.com/v1', // region without microservices
    'https://unisphere.ovp.kaltura.com/v1',
    'https://kaltura.com/v1',
    'https://evil.kaltura.com/v1',
    'https://unisphere.nvp1.ovp.kaltura.com.evil.example/v1',
    'https://evil.example/unisphere.nvp1.ovp.kaltura.com/v1',
    'https://evil.example/v1?h=unisphere.nvp1.ovp.kaltura.com',
    'https://unisphere.nvp1.ovp.kaltura.com@evil.example/v1',
    'https://evil.example@unisphere.nvp1.ovp.kaltura.com/v1',
    'https://user:pw@unisphere.nvp1.ovp.kaltura.com/v1',
    'https://unisphere.nvp1.ovp.kaltura.com:8443/v1',
    'https://unisphere.nvp1.ovp.kaltura.com:443/v1',
    'https://unisphere.nvp1.ovp.kaltura.com./v1', // trailing dot
    'https://UNISPHERE.nvp1.ovp.kaltura.com/v1', // uppercase
    'HTTPS://unisphere.nvp1.ovp.kaltura.com/v1',
    'https://unisphere.nvp1.ovp.kaltura.com\\@evil.example/v1',
    'https://unisphere.nvp1.ovp.kaltura.com\\.evil.example/v1',
    'https://unisphere.nvp1.ovp.kaltura.com/v1?x=1',
    'https://unisphere.nvp1.ovp.kaltura.com/v1#x',
    'https://unisphere.nvp1.ovp.kaltura.com/v1/../v2',
    'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js',
    'https://unisphere.nvp1.ovp.kaltura.com/other/v1',
    ' https://unisphere.nvp1.ovp.kaltura.com/v1',
    'https://unisphere.nvp1.ovp.kaltura.com/v1\n',
    'https://unisphere.nvp1.ovp.kaltura.com/v1\t',
    'https://unisphere.nvp1.ovp.kaltura.com/\tv1',
    'https://unisphere.nvp1.ovp.kaltura.com%2f@evil.example/v1',
    'https://unisphere.nvp1.ovp.kaltura.com。evil.example/v1', // ideographic full stop
    'https://unisphere.nvp1.ovp.kaltura.com．evil.example/v1', // fullwidth full stop
    'https://unisphere.nvp1.ovp.kaltura.cοm/v1', // Greek omicron
    'https://unisphere.nvp1.ovp.kaltura.com/V1',
  ];
  it.each(BAD)('SEC-01: %j', url => {
    expect(() => deriveLoaderUrl(url)).toThrow(/allowed Unisphere origin/);
  });
  it('SEC-01: non-string input', () => {
    expect(() => deriveLoaderUrl(undefined as unknown as string)).toThrow();
  });
});

describe('SEC-01: host-set extra origins', () => {
  const PRIVATE = 'https://unisphere.private.example.com';
  it('SEC-01: an extra origin is accepted only after the host sets it', () => {
    expect(() => deriveLoaderUrl(`${PRIVATE}/v1`)).toThrow();
    setExtraAllowedOrigins([PRIVATE]);
    expect(deriveLoaderUrl(`${PRIVATE}/v1`)).toBe(`${PRIVATE}/v1/loader/index.esm.js`);
  });
  it('SEC-01: extra origins keep the same strict checks', () => {
    setExtraAllowedOrigins([PRIVATE]);
    expect(() => deriveLoaderUrl(`${PRIVATE}@evil.example/v1`)).toThrow();
    expect(() => deriveLoaderUrl(`${PRIVATE}.evil.example/v1`)).toThrow();
  });
  it('SEC-01: the getter returns a copy and set replaces the list', () => {
    setExtraAllowedOrigins([PRIVATE]);
    getExtraAllowedOrigins().push('https://evil.example');
    expect(getExtraAllowedOrigins()).toEqual([PRIVATE]);
    setExtraAllowedOrigins([]);
    expect(getExtraAllowedOrigins()).toEqual([]);
  });
  it('SEC-01: a trailing slash is normalised', () => {
    setExtraAllowedOrigins([`${PRIVATE}/`]);
    expect(getExtraAllowedOrigins()).toEqual([PRIVATE]);
  });
  it.each([
    'http://unisphere.private.example.com',
    `${PRIVATE}/v1`,
    `${PRIVATE}?x=1`,
    `${PRIVATE}#x`,
    'https://user@unisphere.private.example.com',
    'javascript:alert(1)',
    '//unisphere.private.example.com',
    'unisphere.private.example.com',
    '*',
    '',
  ])('SEC-01: setExtraAllowedOrigins rejects %j', value => {
    expect(() => setExtraAllowedOrigins([value])).toThrow();
  });
  it('SEC-01: one bad entry leaves the previous list untouched', () => {
    setExtraAllowedOrigins([PRIVATE]);
    expect(() => setExtraAllowedOrigins(['https://ok.example.com', 'http://bad.example.com'])).toThrow();
    expect(getExtraAllowedOrigins()).toEqual([PRIVATE]);
  });
});

describe('SEC-01: loadUnisphereModule', () => {
  it('SEC-01: rejects (does not throw synchronously) for a bad serverUrl', async () => {
    const promise = loadUnisphereModule('https://evil.example/v1');
    await expect(promise).rejects.toThrow(/allowed Unisphere origin/);
  });
});
