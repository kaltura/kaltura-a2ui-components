// Workaround for https://github.com/a2ui-project/a2ui/issues/3158 (ADR 0007).
// @a2ui/react 0.13 and 0.14 run `class ReactWcHost extends HTMLElement` when it
// loads, so importing it in Node (SSR) throws "HTMLElement is not defined".
// Remove when a release of @a2ui/react imports in Node without it.
// test/conformance/ssr-import.test.ts fails on that release. The removal
// steps are in docs/adr/0007-ssr-html-element-stub.md.

// Lit takes globalThis.HTMLElement as its base class when it loads, and uses
// its own server shim only when there is none. Load it first, so it never
// sees this stub.
import '@a2ui/web_core/v0_9/basic_catalog';

const scope = globalThis as { HTMLElement?: unknown };

/** Lets a class extend HTMLElement on a server. It cannot create elements. */
class ServerHTMLElement {
  constructor() {
    throw new TypeError('HTMLElement is a server stub: custom elements render only in a browser (a2ui-project/a2ui#3158).');
  }
}

// Acts only where there is no DOM. Browsers and jsdom keep their own class.
const stub = scope.HTMLElement === undefined ? ServerHTMLElement : undefined;
if (stub) Object.defineProperty(globalThis, 'HTMLElement', { value: stub, configurable: true, writable: true });

/** Removes the stub. index.ts calls it once @a2ui/react has loaded. */
export function removeHtmlElementStub(): void {
  if (stub && scope.HTMLElement === stub) delete scope.HTMLElement;
}
