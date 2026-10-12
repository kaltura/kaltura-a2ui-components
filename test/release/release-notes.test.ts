// @vitest-environment node
// Covers: SEC-19 (the Release notes carry the SRI of every CDN file), QA-09 (the notes are the
// CHANGELOG section of the released version, with install lines for that tag).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScripts } from './scripts';

const { notes, check } = await loadScripts();
const CHANGELOG = '# Changelog\n\n## 0.2.0 - 2026-10-12\n\nSummary.\n\n### Security\n\n- A fix.\n\n## 0.1.5 (not tagged): old\n\n- Old.\n';
const hashes = { version: '0.2.0', cdn: { 'dist/kaltura-wc.js': 'sha384-wc', 'dist/kaltura-react.mjs': 'sha384-react', 'src/catalog/kaltura_catalog.json': 'sha384-cat' } };
const text = notes.releaseNotes({ changelog: CHANGELOG, version: '0.2.0', hashes });

describe('QA-09: releaseNotes', () => {
  it('QA-09: starts with the CHANGELOG section body and stops before the next version', () => {
    expect([text.startsWith('Summary.\n\n### Security\n\n- A fix.\n'), text.includes('Old.')]).toEqual([true, false]);
  });

  it('SEC-19: the script tag pins the tag and carries the SRI', () => {
    expect(text).toContain('<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/dist/kaltura-wc.js" integrity="sha384-wc" crossorigin="anonymous"></script>');
  });

  it('QA-09: the ESM install line uses the git tag, not npm', () => {
    expect(text).toContain('npm i github:kaltura/kaltura-a2ui-components#v0.2.0 ');
  });

  it('SEC-19: lists the SRI of every CDN file', () => {
    expect(Object.values(hashes.cdn).filter(value => !text.includes(`\`${value}\``))).toEqual([]);
  });

  it('QA-09: relative links point to the tag on GitHub, since the Release page has no repo base', () => {
    const linked = notes.releaseNotes({ changelog: CHANGELOG.replace('- A fix.', '- A [fix](docs/a.md#x), [up](#security) and [web](https://example.com).'), version: '0.2.0', hashes });
    expect(linked).toContain(
      '- A [fix](https://github.com/kaltura/kaltura-a2ui-components/blob/v0.2.0/docs/a.md#x), [up](https://github.com/kaltura/kaltura-a2ui-components/blob/v0.2.0/CHANGELOG.md#security) and [web](https://example.com).',
    );
  });

  it('QA-09: fails for a version without a dated section', () => {
    expect(() => notes.releaseNotes({ changelog: CHANGELOG, version: '0.1.5', hashes })).toThrow('no "## 0.1.5 - YYYY-MM-DD" section');
  });
});

describe('QA-09: release-notes CLI on the real CHANGELOG', () => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const file = join(mkdtempSync(join(tmpdir(), 'notes-')), 'hashes.json');
  writeFileSync(file, JSON.stringify({ ...hashes, version }));
  const result = spawnSync('node', ['scripts/release-notes.mjs', '--version', version, '--hashes', file], { encoding: 'utf8' });

  it('QA-09: prints the section of the package.json version', () => {
    const { body } = check.changelogSection(readFileSync('CHANGELOG.md', 'utf8'), version);
    expect([result.status, result.stdout.startsWith(body.split('](')[0] ?? '-')]).toEqual([0, true]);
  });

  it('QA-09: has no relative link left', () => {
    expect(result.stdout.match(/\]\((?![a-z][a-z0-9+.-]*:)[^)]*\)/gi)).toBeNull();
  });
});
