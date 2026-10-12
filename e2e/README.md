# E2E tests

Run: `npm run e2e` (all browsers) or `npx playwright test --project=chromium`.
First time: `npx playwright install chromium firefox webkit`.

Playwright starts `e2e/fixtures/servers.mjs`. It builds `dist/` only if missing.
| Origin | Default | Serves |
|---|---|---|
| A | `127.0.0.1:4310` | `/harness.html`, `/dist/*` |
| B | `127.0.0.1:4311` | hostile loader modules at `/<token>/<mode>/v1/loader/index.esm.js` |

Modes: `throw`, `throwstr`, `codeload`, `ok`, `slow`, `notfound`. Both origins log requests per token (`harness.serverLog('A' | 'B')`). Requests to `*.kaltura.com` are stubbed, never sent (`harness.kalturaMode`).

Add a case: import `test` from `./fixtures/harness`, call `h.open()` and `h.mount(tag, config)`, then assert on `h.pwned()` and the logs.
Title cases that wait for a fix `[pending SEC-xx]`. Remove the prefix in the fix commit. List them: `grep -rn "\[pending" e2e`.
