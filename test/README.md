# Tests

- `test/security/` and `test/probes/` hold regression tests for internal-review. Many are red until their fix lands.
- `test/pending.ts` lists files that still have a red test. The default `npm test` skips them. Remove a file from `PENDING` in the same change that turns it green.
- Name every test `ID: behaviour`, for example `SEC-06: ...`. The ID comes from the findings register in `docs/security/internal-review.md`. The traceability table uses these titles.
- Each file starts with a header: the IDs it covers and the plan item that turns it green.
- Run one file: `npx vitest run test/player.test.ts`
- Pending files are excluded, so a path filter finds nothing. To run one, comment its line out of `PENDING` first.
