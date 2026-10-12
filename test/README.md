# Tests

- `test/security/` and `test/probes/` hold regression tests for SECF-30837. Many are red until their fix lands.
- `test/pending.ts` lists files that still have a red test. The default `npm test` skips them. Run them with `RUN_PENDING=1`. Remove a file from `PENDING` in the same change that turns it green.
- Name every test `ID: behaviour`, for example `SEC-06: ...`. The ID comes from the findings register in `docs/security/SECF-30837.md`. The traceability table uses these titles.
- Each file starts with a header: the IDs it covers and the plan item that turns it green.
- Run one file: `npx vitest run test/player.test.ts`
- Pending files are excluded, so a path filter finds nothing. To run one: `RUN_PENDING=1 npx vitest run test/probes/catalog-drift.test.ts`
- `test/components/cases.ts` is the table for QA-18: one entry per component with valid, invalid and hostile props. Three files run it: `components/core.test.tsx` (core), `webcomponent/adapters.test.tsx` (custom elements) and `components/a2ui-surface.test.tsx` (real A2UI surface). Each runs a happy render, a hostile input case and an unmount cleanup case. Add a new component to `CASES` and all three pick it up.
- `test/docs/traceability.test.ts` checks `docs/security/SECF-30837.md`: every test path exists and carries the row ID.
- `test/pending.ts` is empty. A single case that waits for a fix is skipped inside its file: `it.skipIf(!process.env.RUN_PENDING)` with the title prefix `[pending ID]`. List them: `grep -rn "\[pending" test`.
- Coverage: `npm run test:coverage`. The thresholds in `vitest.config.ts` are measured minus 2 points, rounded down.
