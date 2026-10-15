# Test map

Which test covers each ID. Test titles start with the ID. The traceability test (`test/docs/traceability.test.ts`) checks that every path exists and that the file carries the ID. IDs only here. Details of a vulnerability go to a private advisory, not this repo.

**Status values**

| Status | Meaning |
|---|---|
| fixed | Fixed. Its tests run in the default suite and pass. |
| partial | Part is done. The Test column names the rest. |
| blocked | Waits on a third party. |
| open | Not fixed. |
| accepted | Known and accepted. Documented only. |

**Test paths** are relative to the repo root. `e2e/` specs run in Playwright. Everything else runs in vitest (`npm test`). **CI job** names are the `name:` values in `.github/workflows/`. `e2e` runs once per browser: `e2e (chromium)`, `e2e (firefox)`, `e2e (webkit)`. `unit tests` runs once per Node version: `unit tests (node 24)` (required) and `unit tests (node 26)` (not required).

| ID | Area | Test | CI job | Status |
|---|---|---|---|---|
| SEC-01 | Unisphere loader, Media Manager, Unisphere widget | test/security/unisphere-loader.test.ts; test/security/server-url.test.tsx; test/security/load-error.test.tsx; e2e/hostile-input.spec.ts (cases 4, 5, 16); e2e/error-states.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| QA-03 | Unisphere loader, Unisphere widget | test/security/server-url.test.tsx; test/lifecycle/unisphere-widget.test.tsx; e2e/unisphere-lifecycle.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-06 | Media Manager, Unisphere widget (error display) | test/security/load-error.test.tsx; test/security/error-state.test.tsx; e2e/hostile-input.spec.ts (cases 1, 2, 3); e2e/error-states.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| QA-13 | Media Manager, Unisphere widget (error display) | test/security/load-error.test.tsx; e2e/hostile-input.spec.ts (cases 1, 2, 3) | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-04 | Flashcards (content rendering) | test/security/flashcards.test.tsx; e2e/hostile-input.spec.ts (case 7) | unit tests; e2e (chromium, firefox, webkit) | fixed |
| QA-12 | Flashcards (content rendering) | test/security/flashcards.test.tsx; e2e/hostile-input.spec.ts (case 7); e2e/error-states.spec.ts (one bad clip) | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-03 | Recorder (props checked before the script loads) | test/security/recorder.test.tsx; test/security/props-validation.test.ts; test/review/hardening-review.test.tsx; e2e/hostile-input.spec.ts (cases 12, 13); e2e/error-states.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-02 | `@a2ui/web_core` dependency, `vite.config.ts` | test/security/open-url.test.ts; test/client-functions.test.ts | unit tests; npm audit | fixed |
| SEC-23 | Markdown and sanitiser dependencies (lockfile) | None. Checked by `npm audit --audit-level=high` in CI | npm audit; dependency review | fixed |
| SEC-05 | Catalog, schemas, markdown (KS handling) | test/security/markdown.test.tsx; test/security/ks-binding.test.ts; test/security/ks-provider.test.tsx; test/security/ks-scope.test.tsx; test/security/a2ui-ks-source.test.tsx; test/security/media-url.test.tsx; test/conformance/docs-content.test.ts; e2e/ks-provider.spec.ts; e2e/hostile-input.spec.ts; e2e/media-url-policy.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-07 | Captions editor (props checked before the page is fetched), Analytics (URL building) | test/security/urls.test.ts; test/security/props-validation.test.ts | unit tests | fixed |
| SEC-11 | Player, Flashcards (props checked before the script loads) | test/security/urls.test.ts; test/security/flashcards.test.tsx; test/security/props-validation.test.ts | unit tests | fixed |
| SEC-12 | Flashcards (clip thumbnail) | test/security/flashcards.test.tsx; test/security/props-validation.test.ts | unit tests | fixed |
| SEC-08 | Avatar (SDK loading) | test/security/avatar.test.tsx; e2e/avatar.spec.ts; e2e/csp.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| QA-04 | Avatar (SDK loading, lifecycle) | test/probes/avatar.test.tsx; e2e/avatar.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| E2E-01 | Web component bundle (`vite.config.ts`) | scripts/check-bundle.mjs (rule E2E-01); e2e/bootstrap.spec.ts; e2e against a published release (e2e/README.md) | bundle and package checks; e2e (chromium, firefox, webkit) | fixed |
| E2E-02 | Catalog and zod schemas | test/probes/catalog-drift.test.ts | unit tests | fixed |
| QA-05 | Catalog and zod schemas | test/security/legit-props.test.tsx; test/review/hardening-review.test.tsx (numeric annotation x); test/probes/catalog-drift.test.ts | unit tests | fixed |
| QA-01 | Web component adapters (lifecycle) | test/probes/webcomponent-lifecycle.test.tsx; test/webcomponent/define-element.test.tsx; e2e/webcomponent-lifecycle.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-17 | Web component adapters (lifecycle) | test/probes/webcomponent-lifecycle.test.tsx; test/webcomponent/define-element.test.tsx; e2e/webcomponent-lifecycle.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| QA-07 | Media Manager (lifecycle) | test/lifecycle/media-manager.test.tsx | unit tests | fixed |
| QA-02 | Component styles (CSS tokens) | e2e/css-tokens.spec.ts (confirmed broken in Chromium before the fix) | e2e (chromium, firefox, webkit) | fixed |
| SEC-25 | Component styles (CSS tokens) | e2e/css-tokens.spec.ts (same `getComputedStyle` check as QA-02) | e2e (chromium, firefox, webkit) | fixed |
| QA-06 | Radar chart, chart error boundary | test/probes/charts.test.tsx; test/charts/chart-core.test.tsx | unit tests | fixed |
| SEC-15 | Radar chart, chart error boundary | test/probes/charts.test.tsx; test/charts/chart-core.test.tsx | unit tests | fixed |
| QA-10 | React adapter (`loadKalturaCatalog`) | test/probes/catalog-drift.test.ts | unit tests | fixed |
| QA-14 | Chart country matching | test/probes/country-codes.test.ts; test/charts/country-matching.test.ts | unit tests | fixed |
| QA-15 | GeoMap chart | test/charts/geomap.test.tsx | unit tests | fixed |
| SEC-16 | GeoMap chart | test/charts/geomap.test.tsx | unit tests | fixed |
| SEC-13 | Source data table (CSV export) | test/charts/csv-export.test.tsx | unit tests | fixed |
| SEC-14 | Player, Flashcards, Captions editor (iframe permissions) | None. The Player and clips are no longer iframes ([ADR 0008](../adr/0008-in-page-player-and-captions-editor.md)) | unit tests | accepted |
| SEC-18 | Media Manager (selection event) | test/lifecycle/media-manager.test.tsx; e2e/unisphere-lifecycle.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| SEC-10 | Player, Flashcards, Captions editor (KS in iframe URLs) | test/security/ks-provider.test.tsx; test/security/player.test.tsx; test/security/player-script.test.ts; test/security/captions-editor.test.tsx; e2e/player.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| ANA-01 | Analytics (embed protocol) | test/security/analytics.test.tsx; e2e/analytics.spec.ts | unit tests; e2e (chromium, firefox, webkit) | fixed |
| REG-01 | Flashcards, Captions, Recorder, Analytics, Player (regional hosts) | test/security/region.test.tsx | unit tests | fixed |
| REC-01 | Recorder (integration type) | test/security/recorder.test.tsx; test/security/recorder-script.test.ts; e2e/recorder.spec.ts | unit tests; e2e (chromium, firefox, webkit) | partial |
| SEC-09 | Release workflow, tracked `dist/` | test/release/workflows.test.ts; test/release/release-check.test.ts; scripts/release-check.mjs | unit tests; actionlint and zizmor; inputs and main | fixed |
| QA-09 | Release workflow, tracked `dist/` | test/release/workflows.test.ts; test/release/stamp-catalog.test.ts; test/release/stamped-catalog.test.ts; test/release/release-hashes.test.ts; test/release/release-notes.test.ts; scripts/stamp-catalog.mjs; scripts/release-verify-stamp.mjs; scripts/release-hashes.mjs; scripts/release-notes.mjs | unit tests; lint and types; inputs and main; build and stamp; actionlint and zizmor | fixed |
| QA-08 | Build config (bundling, source maps) | test/package/contract.test.ts; scripts/check-bundle.mjs; scripts/check-consumer.mjs | unit tests; bundle and package checks | fixed |
| QA-11 | `package.json` exports, license file | test/package/contract.test.ts; `check:package` (publint, attw) | unit tests; bundle and package checks | fixed |
| SEC-19 | Release workflow (SRI coverage) | test/release/stamp-catalog.test.ts; test/release/stamped-catalog.test.ts; test/release/verify-cdn.test.ts; test/release/release-notes.test.ts; test/release/unisphere-smoke.test.ts; test/release/workflows.test.ts; scripts/verify-cdn.mjs; scripts/release-verify-stamp.mjs; scripts/release-unisphere-smoke.mjs | unit tests; release commit, tag and GitHub Release; jsDelivr matches the build; live smoke | fixed |
| QA-16 | `README.md`, docs | test/conformance/docs-content.test.ts; scripts/check-examples.mjs | unit tests; bundle and package checks (`check:examples`) | fixed |
| QA-17 | Code duplication (many files) | test/webcomponent/define-element.test.tsx; test/webcomponent/adapters.test.tsx | unit tests | partial |
| QA-18 | Test coverage (all components) | test/components/core.test.tsx; test/components/a2ui-surface.test.tsx; test/webcomponent/adapters.test.tsx; test/charts/render-all.test.tsx; test/docs/traceability.test.ts | unit tests | fixed |
| UX-01 | Flashcards (layout CSS: `box-sizing`) | e2e/error-states.spec.ts (`UX-01: flashcard clip thumbnails are not covered on a plain page`) | e2e (chromium, firefox, webkit) | fixed |

## Pending cases

A test that waits for a fix is skipped inside its file with `it.skipIf(!process.env.RUN_PENDING)` and the title prefix `[pending ID]`. Whole files go in `test/pending.ts`. E2E cases use the same prefix and run with `E2E_PENDING=1`. Today `test/pending.ts` is empty and no case is skipped.

## Noted, no change

| ID | Area | Status |
|---|---|---|
| SEC-21 | Clipboard preview | noted |
| SEC-22 | `loadKalturaCatalog` URL (host-only input) | noted |
| SEC-24 | Prerelease dependency pins | noted |
| SEC-26 | `window.KalturaAvatar` global | no longer used since the avatar moved to the embeds API |

## How to update

1. Add a row for every new ID in the same change that adds the fix. Fill in Test and CI job and set Status.
2. Keep IDs, file names and test names only. No payloads or reproduction steps.
