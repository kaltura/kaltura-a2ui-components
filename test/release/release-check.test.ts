// @vitest-environment node
// Covers: SEC-09 (only a semver version that matches package.json, and a private
// package.json can release).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { check } = await loadScripts();
const pkg = { version: '0.2.0', private: true };

describe('SEC-09: release version parsing', () => {
  it.each([
    ['0.2.0', 'v0.2.0', false],
    ['10.20.30', 'v10.20.30', false],
    ['0.2.0-rc.1', 'v0.2.0-rc.1', true],
  ])('SEC-09: %s is accepted', (version, tag, prerelease) => {
    expect(check.parseVersion(version)).toEqual({ version, tag, prerelease });
  });

  it.each(['', 'v0.2.0', '0.2', '0.2.0.1', '0.2.0+build', '0.2.0-', '01.2.0', '0.02.0', 'refs/tags/v0.2.0', '0.2.0\n', '0.2.0\nversion=9.9.9', '0.2.0 ', '0.2.0;id', '0.2.0-rc..1'])(
    'SEC-09: %j is rejected',
    version => {
      expect(() => check.parseVersion(version)).toThrow('is not X.Y.Z');
    },
  );

  it('SEC-09: parseTag reads a vX.Y.Z tag', () => {
    expect(check.parseTag('v0.2.0')).toEqual({ version: '0.2.0', tag: 'v0.2.0', prerelease: false });
  });

  it('SEC-09: parseTag rejects a tag without the v prefix', () => {
    expect(() => check.parseTag('0.2.0')).toThrow('is not vX.Y.Z');
  });
});

describe('SEC-09: checkRelease', () => {
  it('SEC-09: accepts a matching private package', () => {
    expect(check.checkRelease('0.2.0', { pkg })).toEqual({ version: '0.2.0', tag: 'v0.2.0', prerelease: false });
  });

  it('SEC-09: rejects a different version', () => {
    expect(() => check.checkRelease('0.2.1', { pkg })).toThrow('does not match package.json version 0.2.0');
  });

  it('SEC-09: rejects a package that is not private, so npm publish can never run', () => {
    expect(() => check.checkRelease('0.2.0', { pkg: { version: '0.2.0' } })).toThrow('"private": true');
  });

  it('SEC-09: the CLI exits 1 for a version that is not in package.json', () => {
    const run = spawnSync('node', ['scripts/release-check.mjs', '999.0.0'], { encoding: 'utf8' });
    expect([run.status, run.stderr]).toEqual([1, expect.stringContaining('does not match package.json')]);
  });

  it('SEC-09: the CLI prints GITHUB_OUTPUT lines for the current version', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    const run = spawnSync('node', ['scripts/release-check.mjs', version], { encoding: 'utf8' });
    expect([run.status, run.stdout]).toEqual([0, `version=${version}\ntag=v${version}\nprerelease=${version.includes('-')}\n`]);
  });
});
