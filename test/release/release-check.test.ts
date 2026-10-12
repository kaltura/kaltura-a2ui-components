// @vitest-environment node
// Covers: SEC-09 (only a clean vX.Y.Z tag that matches package.json can release).
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { check } = await loadScripts();

describe('SEC-09: release tag parsing', () => {
  it.each([
    ['v0.2.0', '0.2.0', 'latest'],
    ['v10.20.30', '10.20.30', 'latest'],
    ['v0.2.0-rc.1', '0.2.0-rc.1', 'next'],
  ])('SEC-09: %s is accepted', (tag, version, npmTag) => {
    expect(check.parseTag(tag)).toEqual({ version, npmTag });
  });

  it.each(['', '0.2.0', 'v0.2', 'v0.2.0.1', 'v0.2.0+build', 'v0.2.0-', 'V0.2.0', 'refs/tags/v0.2.0', 'v0.2.0\n', 'v0.2.0\nversion=9.9.9', 'v0.2.0 ', 'v0.2.0;id'])(
    'SEC-09: %j is rejected',
    tag => {
      expect(() => check.parseTag(tag)).toThrow('is not vX.Y.Z');
    },
  );
});

describe('SEC-09: tag must match package.json', () => {
  it('SEC-09: accepts the same version', () => {
    expect(check.checkRelease('v0.2.0', { version: '0.2.0' })).toEqual({ version: '0.2.0', npmTag: 'latest' });
  });

  it('SEC-09: rejects a different version', () => {
    expect(() => check.checkRelease('v0.2.1', { version: '0.2.0' })).toThrow('does not match package.json version 0.2.0');
  });

  it('SEC-09: rejects a private package', () => {
    expect(() => check.checkRelease('v0.2.0', { version: '0.2.0', private: true })).toThrow('private');
  });

  it('SEC-09: the CLI exits 1 for a tag that is not in package.json', () => {
    const run = spawnSync('node', ['scripts/release-check.mjs', 'v999.0.0'], { encoding: 'utf8' });
    expect([run.status, run.stderr]).toEqual([1, expect.stringContaining('does not match package.json')]);
  });

  it('SEC-09: the CLI prints GITHUB_OUTPUT lines for the current version', () => {
    const { version } = JSON.parse(spawnSync('node', ['-p', 'JSON.stringify(require("./package.json"))'], { encoding: 'utf8' }).stdout) as { version: string };
    const run = spawnSync('node', ['scripts/release-check.mjs', `v${version}`], { encoding: 'utf8' });
    expect([run.status, run.stdout]).toEqual([0, `version=${version}\nnpm_tag=${version.includes('-') ? 'next' : 'latest'}\n`]);
  });
});
