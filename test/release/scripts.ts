// Loads the release scripts (plain .mjs, no type declarations) with the types the tests use.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface Retry {
  attempts?: number;
  delayMs?: number;
  log?: (line: string) => void;
}

export interface Hashes {
  version: string;
  cdn: Record<string, string>;
  tarball: { name: string; integrity: string };
}

export interface ReleaseScripts {
  check: {
    parseTag(tag: string): { version: string; npmTag: string };
    checkRelease(tag: string, pkg: { version: string; private?: boolean }): { version: string; npmTag: string };
  };
  stamp: {
    sri(bytes: Uint8Array | string, algorithm?: string): string;
    cdnBase(mode: string, parts: { name: string; version: string; tag: string }): string;
    stampCatalog(text: string, options: { base: string; wcSri: string; reactSri: string }): string;
  };
  verifyStamp: {
    checkStamped(text: string, options: { base: string; wcSri: string; reactSri: string }): string[];
  };
  hashes: {
    CDN_FILES: string[];
    buildHashes(options: { version: string; read(path: string): Uint8Array; tarballName: string; tarballBytes: Uint8Array }): Hashes;
    sha256sums(files: { name: string; bytes: Uint8Array }[]): string;
  };
  verify: {
    getWithRetry(url: string, retry?: Retry): Promise<{ bytes: Buffer; headers: Headers }>;
    resolveLatest(options: { name: string; registryUrl: string }): Promise<{ version: string } | undefined>;
    verifyRegistry(options: { registryUrl: string; name: string; version: string; integrity: string; retry?: Retry }): Promise<string[]>;
    verifyCdn(options: { base: string; expected?: Record<string, string>; retry?: Retry }): Promise<string[]>;
  };
  smoke: {
    REGIONS: string[];
    checkLoader(region: string, response: { status: number; headers: Headers; body: string }): string[];
  };
}

const load = <T>(name: string) => import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), 'scripts', name)).href) as Promise<T>;

export async function loadScripts(): Promise<ReleaseScripts> {
  const [check, stamp, verifyStamp, hashes, verify, smoke] = await Promise.all([
    load<ReleaseScripts['check']>('release-check.mjs'),
    load<ReleaseScripts['stamp']>('stamp-catalog.mjs'),
    load<ReleaseScripts['verifyStamp']>('release-verify-stamp.mjs'),
    load<ReleaseScripts['hashes']>('release-hashes.mjs'),
    load<ReleaseScripts['verify']>('verify-cdn.mjs'),
    load<ReleaseScripts['smoke']>('release-unisphere-smoke.mjs'),
  ]);
  return { check, stamp, verifyStamp, hashes, verify, smoke };
}
