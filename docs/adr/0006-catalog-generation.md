# 0006. Catalog generation

Status: accepted (2026-10-12)

Test ID: QA-05 (drift). Code: `scripts/gen-catalog.mjs`. Tests: `test/conformance/catalog-generation.test.ts`.

## Context

- `src/catalog/kaltura_catalog.json` sits next to the zod schemas in `src/schemas/`. The two must agree.
- Descriptions are long prose written for agents. zod has no defaults for JSON Schema, and `.describe()` would put the prose in the bundle, which has a `size-limit` budget.

## Decision

- Structure is generated from zod: prop names and order, required lists, types, enums and nesting. Descriptions and defaults stay in the JSON, by hand.
- `npm run gen:catalog` checks the JSON. `npm run gen:catalog -- --write` rewrites it. A new prop gets an empty description, and the conformance test fails until someone writes one.
- A prop can be kept from the JSON on purpose (`KEPT_FROM_CATALOG` in the script), with a reason. The test pins the list. It is empty.

## The JSON lists what the renderer serves

An A2UI surface binds to one catalog id, and `kalturaReactCatalog` serves the 18 basic components and the basic functions next to the Kaltura ones. The JSON lists the same names, so an agent that reads it sees `Text` and `Image` too.

- Options were: (a) a Kaltura-only JSON, (b) `$ref` to the basic catalog URL, (c) copy the basic entries into the JSON. We chose (c). The reference clients read the local `components` and `functions` maps and do not follow remote `$ref`. A surface has one id, so (a) would hide components the renderer serves. (c) also keeps the file freestanding.
- The generator copies the basic entries and all of `common_types.json` from the installed `@a2ui/web_core`, so they cannot drift. `anyComponent` and `anyFunction` are built from the keys. Basic components extend `BasicComponentCommon` (`weight`), as upstream.
- The theme is the basic one, and `buildKalturaCatalog` passes `basicCatalog.themeSchema` to `Catalog`.
- `KalturaPlayer.partnerId` and `uiconfId` are plain integers, as in zod. A binding or function call gives `invalid-props`.
- Kaltura components have no `weight`, `tooltip` or `visible`. Nothing in the React or web component code reads them, so the catalog adds no prop that does nothing.
- `copyToClipboard` is the one Kaltura function. It is listed in `functions`.
- A catalog id only has to be a unique string ("not necessarily a resolvable URI" in the A2UI schemas). The file is served from the [kaltura/a2ui](https://github.com/kaltura/a2ui) repo (GitHub Pages, `v3/catalog.json`).
- Tests: `test/adapter.test.ts` (runtime names equal JSON names), `test/conformance/catalog-schema.test.ts`.

## Consequences

- Adding a prop to zod without the catalog fails `npm test`.
- No cost to the bundles.

## A2UI 1.0 catalog (v3)

[ADR 0010](0010-a2ui-1-0.md) sets the protocol. The generator rules above hold. The catalog has:

- The id `https://kaltura.github.io/a2ui/v3/catalog.json`.
- `common_types.json` copied byte for byte from `@a2ui/web_core`, shipped next to the catalog. The catalog refers to it with relative refs (`common_types.json#/$defs/DynamicString`), so the asset folder is self-contained.
- A root with `protocolVersion: "1.0"`, `catalogId` equal to `$id`, and `instructions`. The extension block is `metadata.extensions.com_kaltura_adapters`.
- Flat components with no root `oneOf` or `anyOf`. "Exactly one of `entryId` and `playlistId`" lives in the Player descriptions and is enforced at run time.
- Descriptions written by hand. We do not use `catalog.toJson()` as the source: it drops the descriptions and turns `.positive()` into a draft-4 keyword. The zod schemas use `.int().min(1)`.
- Tests: `test/conformance/catalog-schema.test.ts` (the shipped meta-schema, strict Ajv, shape), `test/conformance/catalog-parity.test.ts` (the catalog the bundle builds equals the JSON).
