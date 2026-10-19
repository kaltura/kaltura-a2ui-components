# 0003. Peer dependencies

Status: accepted (2026-10-12)

Test IDs: QA-08, SEC-02. Code: `vite.config.ts`, `package.json`. Checks: `scripts/check-bundle.mjs`, `scripts/check-consumer.mjs`.

## Context

- The ESM bundle inlined `@a2ui/react`, `@a2ui/web_core` and `zod`. The host builds its own `MessageProcessor` and `Catalog` from its own copy, so `kalturaReactCatalog instanceof Catalog` was false, React context was duplicated, and an old `web_core` with a known `openUrl` bug was frozen into our file.
- The script-tag bundle has no package manager. It must be self-contained.
- `@a2ui/markdown-it` pins DOMPurify 3.4.11 (0.1.2, and still 0.2.1). `@a2ui/react`, a required peer, depends on it, so every host install gets 3.4.11.

## Decision

| Bundle | `@a2ui/react`, `@a2ui/web_core`, `zod` | `@a2ui/markdown-it`, DOMPurify |
|---|---|---|
| `kaltura-react.mjs` (ESM, git install) | External. Peers: `^0.14.0`, `^0.14.0`, `^3.25.76`, plus `react` and `react-dom` 19 | Inlined, with DOMPurify 3.4.17 |
| `kaltura-wc.js` (script tag) | Inlined | Inlined |

- The peer ranges are one 0.x line (caret on 0.x), so a new minor of `@a2ui/*` needs a review and a release. The peers moved from 0.11 to 0.13 and then to 0.14, each with no support for the older line. 0.13 changed the basic catalog (Lit elements in `@a2ui/web_core`) and the `Catalog` constructor. In Node, 0.13 and 0.14 need the stub in [ADR 0007](0007-ssr-html-element-stub.md).
- `@a2ui/markdown-it` is inlined in the ESM, so our own sanitiser (Flashcards) runs on DOMPurify 3.4.17. If it were external, our code would use the host's copy, which is 3.4.11 unless the host overrides it. Inlining does not fix the host's tree: hosts add a `dompurify` override (README, [host-integration.md](../host-integration.md#dompurify-override)). Making it external would save a large part of the bundle. That waits until upstream raises the pin.
- Source maps keep their mappings and drop `sourcesContent`.
- Chart libraries (`@visx/*`, `topojson-client` and their d3 and `@react-spring` deps) are inlined in both bundles, or tree-shaken out, so they are `devDependencies`. The package has no runtime `dependencies`. `check:consumer` fails if a bundle, or a `.d.ts` reachable from `exports`, imports a package that is not a dependency or a peer.

## Consequences

- One copy of each shared library in the host. The ESM is capped by `size-limit` (see `.size-limit.json`; check with `npm run size`).
- Hosts install the peers themselves. npm 7+ installs missing peers and stops with `ERESOLVE` on a conflicting version.
- The script-tag bundle must be rebuilt when what it inlines changes. It is capped by `size-limit` (see `.size-limit.json`).
- The conformance suite runs with `@a2ui/react` and `@a2ui/web_core` at the lowest version their ranges allow, and a test fails if the lockfile moves (`test/conformance/peers.test.ts`). `react`, `react-dom` and `zod` run at the lockfile version, with no lowest-version check.
