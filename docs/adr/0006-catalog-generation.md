# 0006. Catalog generation

Status: accepted (2026-10-12)

Finding: QA-05 (drift). Code: `scripts/gen-catalog.mjs`. Tests: `test/conformance/catalog-generation.test.ts`.

## Context

- `src/catalog/kaltura_catalog.json` was hand-edited next to the zod schemas in `src/schemas/`. The two drifted: missing props, wrong defaults and props that did nothing.
- Descriptions are long prose written for agents. zod has no defaults for JSON Schema, and `.describe()` would put the prose in the bundle. That was measured at about 5.7 kB raw. The script-tag bundle has about 1.3 kB gzip of headroom under its 225 kB limit.

## Decision

- Structure is generated from zod: prop names and order, required lists, types, enums and nesting. Descriptions and defaults stay in the JSON, by hand.
- `npm run gen:catalog` checks the JSON. `npm run gen:catalog -- --write` rewrites it. A new prop gets an empty description, and the conformance test fails until someone writes one.
- Four props are kept from the JSON on purpose (`KEPT_FROM_CATALOG` in the script), each with a reason. The test pins the list.

## Consequences

- Adding a prop to zod without the catalog fails `npm test`.
- Descriptions can still go stale. Reviewers check them.
- No cost to the bundles.
