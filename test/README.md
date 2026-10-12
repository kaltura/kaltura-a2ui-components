# Tests

- `test/security/` and `test/probes/` hold regression tests for internal-review. Many are red until their fix lands.
- `test/pending.ts` lists files that still have a red test. The default `npm test` skips them. Run them with `RUN_PENDING=1`. Remove a file from `PENDING` in the same change that turns it green.
- Name every test `ID: behaviour`, for example `SEC-06: ...`. The ID comes from the findings register in `docs/security/internal-review.md`. The traceability table uses these titles.
- Each file starts with a header: the IDs it covers and the plan item that turns it green.
- Run one file: `npx vitest run test/player.test.ts`
- Pending files are excluded, so a path filter finds nothing. To run one: `RUN_PENDING=1 npx vitest run test/probes/catalog-drift.test.ts`
- `test/components/cases.ts` is the table for QA-18: one entry per component with valid, invalid and hostile props. Three files run it: `components/core.test.tsx` (core), `webcomponent/adapters.test.tsx` (custom elements) and `components/a2ui-surface.test.tsx` (real A2UI surface). Each runs a happy render, a hostile input case and an unmount cleanup case. Add a new component to `CASES` and all three pick it up.
- `test/docs/traceability.test.ts` checks `docs/security/internal-review.md`: every test path exists and carries the row ID.
- `test/pending.ts` is empty. A single case that waits for a fix is skipped inside its file: `it.skipIf(!process.env.RUN_PENDING)` with the title prefix `[pending ID]`. List them: `grep -rn "\[pending" test`.
- `test/conformance/` is the A2UI and Kaltura conformance suite (CONF-xx IDs): catalog meta-schema, message streams through the real `MessageProcessor` for all 12 components (`fixtures/streams.json`), zod-to-catalog generation, Kaltura guide tables (`fixtures/kaltura-docs.ts`), the public API snapshot and the peer versions. Run it alone with `npm run test:conformance`. After an intended export change: `UPDATE_API_SNAPSHOT=1 npx vitest run test/conformance/api-snapshot`.
- `test/conformance/docs-content.test.ts` (QA-16) checks the Markdown docs: the functions, npm scripts and tags they name exist, links and anchors resolve, and every error code is listed. It also checks that no doc or `src/adapters` comment tells hosts to register `basicCatalog` next to the Kaltura catalog.
- `test/package/` checks the package contract (exports, peers, files). `test/release/` checks the release scripts and workflows. They read repo files and need no build.
- Coverage: `npm run test:coverage`. The thresholds in `vitest.config.ts` are measured minus 2 points, rounded down.
