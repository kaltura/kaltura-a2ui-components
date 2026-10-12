# E2E tests

Run: `npm run e2e` (all browsers) or `npx playwright test --project=chromium`.
First time: `npx playwright install chromium firefox webkit`.

Playwright starts `e2e/fixtures/servers.mjs`. It builds `dist/` only if missing.
| Origin | Default | Serves |
|---|---|---|
| A | `127.0.0.1:4310` | `/harness.html`, `/dist/*` |
| B | `127.0.0.1:4311` | hostile loader modules at `/<token>/<mode>/v1/loader/index.esm.js` |

Modes: `throw`, `throwstr`, `codeload`, `ok`, `slow`, `notfound`. Both origins log requests per token (`harness.serverLog('A' | 'B')`). Requests to `*.kaltura.com` are stubbed, never sent (`harness.kalturaMode`).

The `ok` loader records what the widget passed in: `harness.loaderConfigs()` (from `loader`) and `harness.workspaceConfigs()` (from `createWorkspace`).

| Spec | Covers |
|---|---|
| `hostile-input.spec.ts` | Hostile loader text, `serverUrl` allowlist, recorder ids, flashcards payloads, remote code |
| `ks-provider.spec.ts` | `setKsProvider` wiring (`harness.setKsProvider`), fallback to the `ks` prop, missing and bad provider output, KS never in text or console |
| `error-states.spec.ts` | Generic `serverUrl` error without echo, `role="alert"` on every error state, one bad flashcard clip |
| `bootstrap.spec.ts` | `kaltura-wc.js` boots on a bare page and defines all tags |
| `a11y.spec.ts` | Axe scan of chart and flashcards |

Add a case: import `test` from `./fixtures/harness`, call `h.open()` and `h.mount(tag, config)`, then assert on `h.pwned()` and the logs.
Title cases that wait for a fix `[pending SEC-xx]`. They are skipped unless `E2E_PENDING=1`. Remove the prefix in the fix commit. List them: `grep -rn "\[pending" e2e`.
