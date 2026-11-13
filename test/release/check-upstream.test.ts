// @vitest-environment node
// Covers: QA-20 (the upstream watch says "ready" only when upstream shipped what the workarounds wait for).
import { describe, it, expect } from 'vitest';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

type Manifest = { version: string; peerDependencies?: Record<string, string>; dependencies?: Record<string, string> };
type Facts = { npm: Record<string, Manifest>; github: Record<number, { state: string; merged: boolean }> };
type Row = { id: string; ready: boolean };
interface Script {
  evaluate(facts: Facts, pkg: { peerDependencies: Record<string, string>; overrides: Record<string, unknown> }): Row[];
  report(rows: Row[], github: Facts['github']): string;
}
const { evaluate, report } = (await import(pathToFileURL(resolve('scripts/check-upstream.mjs')).href)) as Script;

const pkg = { peerDependencies: { '@a2ui/web_core': '^0.15.0', '@a2ui/react': '^0.15.0' }, overrides: { dompurify: '^3.4.17' } };
const today: Facts = {
  npm: {
    '@a2ui/markdown-it': { version: '0.2.2', peerDependencies: { '@a2ui/web_core': '^0.14.0' }, dependencies: { dompurify: '3.4.11' } },
    '@a2ui/react': { version: '0.15.0' },
    '@a2ui/web_core': { version: '0.15.0', dependencies: { zod: '^3.25.76' } },
  },
  github: { 3158: { state: 'open', merged: false } },
};
const ready = (facts: Facts) => evaluate(facts, pkg).filter(row => row.ready).map(row => row.id);
const withNpm = (name: string, change: Partial<Manifest>): Facts => ({ ...today, npm: { ...today.npm, [name]: { ...(today.npm[name] as Manifest), ...change } } });

describe('QA-20: check-upstream', () => {
  it('QA-20: nothing is ready on the state of 2026-11-13', () => {
    expect(ready(today)).toEqual([]);
  });

  it('QA-20: G1 is ready when markdown-it peers a web_core our range satisfies', () => {
    expect(ready(withNpm('@a2ui/markdown-it', { peerDependencies: { '@a2ui/web_core': '^0.15.0' } }))).toEqual(['G1']);
  });

  it('QA-20: the dompurify row is ready when markdown-it depends on our override floor or newer', () => {
    expect(ready(withNpm('@a2ui/markdown-it', { dependencies: { dompurify: '^3.4.17' } }))).toEqual(['G1-dompurify']);
  });

  it('QA-20: a new web_core or react version is ready for the matrix', () => {
    expect([ready(withNpm('@a2ui/web_core', { version: '0.16.0' })), ready(withNpm('@a2ui/react', { version: '0.15.1' }))]).toEqual([['G2-web_core'], ['G2-react']]);
  });

  it('QA-20: the SSR row is ready once issue 3158 is closed', () => {
    expect(ready({ ...today, github: { 3158: { state: 'closed', merged: false } } })).toEqual(['F4-ssr']);
  });

  it('QA-20: the zod row is ready when web_core accepts zod 4', () => {
    expect(ready(withNpm('@a2ui/web_core', { dependencies: { zod: '^3.25.76 || ^4.0.0' } }))).toEqual(['zod4']);
  });

  it('QA-20: an empty or odd range is never ready', () => {
    expect(ready(withNpm('@a2ui/markdown-it', { peerDependencies: {}, dependencies: { dompurify: 'latest' } }))).toEqual([]);
  });

  it('QA-20: the report lists every row and marks the ready ones', () => {
    const rows = evaluate(withNpm('@a2ui/markdown-it', { peerDependencies: { '@a2ui/web_core': '^0.15.0' } }), pkg);
    expect(report(rows, today.github).split('\n').filter(line => line.includes('**yes**'))).toHaveLength(1);
  });
});
