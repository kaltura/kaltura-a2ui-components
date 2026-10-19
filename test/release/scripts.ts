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
}

export interface ReleaseScripts {
  check: {
    parseVersion(version: string): { version: string; tag: string; prerelease: boolean };
    parseTag(tag: string): { version: string; tag: string; prerelease: boolean };
    checkRelease(version: string, inputs: { pkg: { version: string; private?: boolean } }): { version: string; tag: string; prerelease: boolean };
  };
  notes: {
    releaseNotes(options: { version: string; hashes: Hashes; summary?: string }): string;
  };
  stamp: {
    GH_REPO: string;
    sri(bytes: Uint8Array | string, algorithm?: string): string;
    cdnBase(tag: string, origin?: string): string;
    stampCatalog(text: string, options: { tag: string; base?: string; wcSri: string; reactSri: string; stubSri: string }): string;
  };
  verifyStamp: {
    checkStamped(text: string, options: { tag: string; base?: string; wcSri: string; reactSri: string; stubSri: string }): string[];
  };
  hashes: {
    CDN_FILES: string[];
    buildHashes(options: { version: string; read(path: string): Uint8Array }): Hashes;
    sha256sums(files: { name: string; bytes: Uint8Array }[]): string;
  };
  verify: {
    getWithRetry(url: string, retry?: Retry): Promise<{ bytes: Buffer; headers: Headers }>;
    resolveLatest(options: { apiUrl: string; repo: string; token?: string }): Promise<{ tag: string; hashesUrl?: string } | undefined>;
    verifyCdn(options: { base: string; catalogBase?: string; expected?: Record<string, string>; retry?: Retry }): Promise<string[]>;
  };
  smoke: {
    REGIONS: string[];
    checkLoader(region: string, response: { status: number; headers: Headers; body: string }): string[];
  };
}

const load = <T>(name: string) => import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), 'scripts', name)).href) as Promise<T>;

export async function loadScripts(): Promise<ReleaseScripts> {
  const [check, notes, stamp, verifyStamp, hashes, verify, smoke] = await Promise.all([
    load<ReleaseScripts['check']>('release-check.mjs'),
    load<ReleaseScripts['notes']>('release-notes.mjs'),
    load<ReleaseScripts['stamp']>('stamp-catalog.mjs'),
    load<ReleaseScripts['verifyStamp']>('release-verify-stamp.mjs'),
    load<ReleaseScripts['hashes']>('release-hashes.mjs'),
    load<ReleaseScripts['verify']>('verify-cdn.mjs'),
    load<ReleaseScripts['smoke']>('release-unisphere-smoke.mjs'),
  ]);
  return { check, notes, stamp, verifyStamp, hashes, verify, smoke };
}
