// @vitest-environment node
// Covers: CONF-17 (ADR 0007): the React entry imports in Node although
// @a2ui/react 0.13 needs HTMLElement when it loads (a2ui#3158). The stub cases
// run in a fresh Node process with the installed peers: offline, and this
// worker's globals stay clean. The entry case runs the source entry here.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const STUB = new URL('../../src/adapters/react/html-element-stub.ts', import.meta.url).href;

/** Runs `code` as an ES module in a new Node process from the repo root. */
function node(code: string) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  return { status: result.status, out: result.stdout.trim(), err: result.stderr };
}

describe('CONF-17: the HTMLElement stub for a2ui#3158', () => {
  it('CONF-17: @a2ui/react alone still fails in Node, so the stub is still needed', () => {
    const { err } = node("await import('@a2ui/react/v0_9')");
    expect(err, 'a2ui#3158 is fixed in the installed @a2ui/react. Remove the stub: see ADR 0007.').toMatch(/HTMLElement is not defined/);
  });

  it('CONF-17: with the stub first, @a2ui/react loads in Node and the stub is gone after', () => {
    const { out, err } = node(`
      const { removeHtmlElementStub } = await import(${JSON.stringify(STUB)});
      const during = typeof HTMLElement;
      const renderer = await import('@a2ui/react/v0_9');
      removeHtmlElementStub();
      console.log(JSON.stringify([during, 'A2uiSurface' in renderer, typeof HTMLElement]));`);
    expect(out, err).toBe('["function",true,"undefined"]');
  });

  it('CONF-17: the stub cannot create elements, directly or through a subclass', () => {
    const { out, err } = node(`
      await import(${JSON.stringify(STUB)});
      const Stub = globalThis.HTMLElement;
      class Host extends Stub {}
      console.log(JSON.stringify([() => new Stub(), () => new Host()].map(make => {
        try { make(); return 'created'; } catch (error) { return error.message; }
      })));`);
    expect(JSON.parse(out || '[]'), err).toEqual([expect.stringMatching(/server stub/), expect.stringMatching(/server stub/)]);
  });

  it('CONF-17: Lit loads first and keeps its own server HTMLElement, not the stub', () => {
    const { out, err } = node(`
      await import(${JSON.stringify(STUB)});
      const { ReactiveElement } = await import('@lit/reactive-element');
      console.log(Object.getPrototypeOf(ReactiveElement) === globalThis.HTMLElement);`);
    expect(out, err).toBe('false');
  });

  it('CONF-17: where HTMLElement exists (browser, jsdom), the stub changes nothing', () => {
    const { out, err } = node(`
      const Real = class HTMLElement {};
      globalThis.HTMLElement = Real;
      const { removeHtmlElementStub } = await import(${JSON.stringify(STUB)});
      const during = globalThis.HTMLElement === Real;
      removeHtmlElementStub();
      console.log(JSON.stringify([during, globalThis.HTMLElement === Real]));`);
    expect(out, err).toBe('[true,true]');
  });

  it('CONF-17: the React entry imports the stub first and removes it after its imports', () => {
    const source = readFileSync('src/adapters/react/index.ts', 'utf8');
    const imports = [...source.matchAll(/^import\b[^'"]*['"]([^'"]+)['"]/gm)];
    const removal = source.indexOf('\nremoveHtmlElementStub();');
    expect([imports[0]?.[1], removal > (imports.at(-1)?.index ?? Infinity)]).toEqual(['./html-element-stub', true]);
  });

  it('CONF-17: the source entry loads in Node, builds the catalog and leaves no stub', async () => {
    const entry = await import('../../src/adapters/react/index');
    expect([entry.kalturaReactCatalog.components.has('KalturaPlayer'), typeof globalThis.HTMLElement]).toEqual([true, 'undefined']);
  });
});
