// Covers: QA-18 (traceability doc). Every test path in docs/security/SECF-30837.md
// exists, and every row that names tests is backed by a test that carries its ID.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const doc = readFileSync(resolve(root, 'docs/security/SECF-30837.md'), 'utf8');
const STATUSES = ['fixed', 'partial', 'blocked', 'open', 'accepted'];

const rows = doc
  .split('\n')
  .filter(line => /^\| (SEC|QA|E2E|UX|ANA|REG|REC)-\d+ \|/.test(line))
  .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()))
  // The "Noted, no change" table has 4 columns and no tests.
  .filter(cells => cells.length === 7)
  .map(([id, , , , test, ci, status]) => ({
    id,
    test,
    ci,
    status,
    paths: [...test.matchAll(/\b(?:test|e2e|scripts)\/[\w./-]+\.(?:tsx?|mjs)/g)].map(m => m[0]),
  }));

describe('QA-18: SECF-30837 traceability table', () => {
  it('QA-18: the table has rows', () => {
    expect(rows.length).toBeGreaterThan(40);
  });

  it('QA-18: every row has a known status and a CI job', () => {
    expect(rows.filter(r => !STATUSES.includes(r.status) || !r.ci).map(r => r.id)).toEqual([]);
  });

  it('QA-18: every listed test path exists', () => {
    expect(rows.flatMap(r => r.paths.filter(p => !existsSync(resolve(root, p)))).sort()).toEqual([]);
  });

  it('QA-18: no fixed row is left without a test path', () => {
    const noTest = rows.filter(r => r.status === 'fixed' && !r.paths.length && !/^None\. (Checked|Documented)/.test(r.test));
    expect(noTest.map(r => r.id)).toEqual([]);
  });

  it('QA-18: each listed test file mentions the row ID in a test title or header', () => {
    const missing = rows
      .filter(r => r.paths.length)
      // A row may point at the sibling ID that its test carries, for example "same check as QA-02".
      .filter(r => {
        const ids = [r.id, ...(r.test.match(/\b[A-Z0-9]+-\d+\b/g) ?? [])];
        return !r.paths.some(p => ids.some(id => readFileSync(resolve(root, p), 'utf8').includes(id)));
      })
      .map(r => r.id);
    expect(missing).toEqual([]);
  });

  it('QA-18: test/pending.ts is empty', async () => {
    const { PENDING } = await import('../pending');
    expect(PENDING).toEqual([]);
  });
});
