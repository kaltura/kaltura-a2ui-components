// Covers: QA-08 (peer dependency declarations), QA-11 (package contract).
// The build output side lives in scripts/check-bundle.mjs and
// scripts/check-consumer.mjs; this file checks what the repo files promise.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as reactAdapter from '../../src/adapters/react';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  license: string;
  description: string;
  exports: Record<string, string | Record<string, string>>;
  dependencies?: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};
const installed = (name: string) =>
  (JSON.parse(read(`node_modules/${name}/package.json`)) as { version: string; peerDependencies?: Record<string, string> });

const SHARED_PEERS = ['@a2ui/react', '@a2ui/web_core', 'zod'];

describe('QA-08: shared libraries are peers of the ESM build', () => {
  it.each(SHARED_PEERS)('QA-08: %s is a peer dependency', (name) => {
    expect(pkg.peerDependencies[name]).toBeDefined();
  });

  it.each(SHARED_PEERS)('QA-08: %s is not also a regular dependency (one copy only)', (name) => {
    expect(pkg.dependencies?.[name]).toBeUndefined();
  });

  it.each(SHARED_PEERS)('QA-08: %s is a devDependency with the same range, for tests and the IIFE bundle', (name) => {
    expect(pkg.devDependencies[name]).toBe(pkg.peerDependencies[name]);
  });

  it.each(['@a2ui/react', '@a2ui/web_core'])('QA-08: the %s peer range stays on the installed 0.x line', (name) => {
    const [, minor] = installed(name).version.split('.');
    expect(pkg.peerDependencies[name]).toMatch(new RegExp(`^\\^0\\.${minor}\\.\\d+$`));
  });

  it('QA-08: the zod peer range equals the one @a2ui/react asks for', () => {
    expect(pkg.peerDependencies.zod).toBe(installed('@a2ui/react').peerDependencies?.zod);
  });
});

describe('QA-11: package contract', () => {
  it('QA-11: license field is AGPL-3.0-only and the LICENSE file is the AGPL v3 text', () => {
    expect([pkg.license, read('LICENSE').includes('GNU AFFERO GENERAL PUBLIC LICENSE\n                       Version 3, 19 November 2007')]).toEqual(['AGPL-3.0-only', true]);
  });

  it('QA-11: ./webcomponent has types before default', () => {
    expect(Object.keys(pkg.exports['./webcomponent'] as object)).toEqual(['types', 'default']);
  });

  it('QA-11: ./catalog is a condition object with a default', () => {
    expect(pkg.exports['./catalog']).toEqual({ default: './src/catalog/kaltura_catalog.json' });
  });

  it('QA-11: description names both artifacts and no longer says "CDN-publishable"', () => {
    expect(pkg.description).toMatch(/^(?=.*React)(?=.*web component)(?!.*CDN-publishable)/s);
  });

  it('QA-11: every URL builder is exported from the React entry', () => {
    expect(['buildAnalyticsUrl'].filter((name) => typeof (reactAdapter as Record<string, unknown>)[name] !== 'function')).toEqual([]);
  });
});
