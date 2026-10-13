# E2E tests

Run: `npm run e2e` (all browsers) or `npx playwright test --project=chromium`.
First time: `npx playwright install chromium firefox webkit`.

Playwright starts `e2e/fixtures/servers.mjs`. It builds `dist/` only if missing.
| Origin | Default | Serves |
|---|---|---|
| A | `127.0.0.1:4310` | `/harness.html`, `/dist/*` |
| B | `127.0.0.1:4311` | hostile loader modules at `/<token>/<mode>/v1/loader/index.esm.js` |

Modes: `throw`, `throwstr`, `codeload`, `ok`, `slow`, `notfound`. Both origins log requests per token (`harness.serverLog('A' | 'B')`). Requests to `*.kaltura.com` are stubbed, never sent (`harness.kalturaMode`).

The `ok` loader records what the widget passed in: `harness.loaderConfigs()` (from `loader`), `harness.workspaceConfigs()` (from `createWorkspace`) and `harness.embedsConfigs()` (from `embeds.workspace`, the avatar).

| Spec | Covers |
|---|---|
| `hostile-input.spec.ts` | Hostile loader text, `serverUrl` allowlist, recorder script and container ids, flashcards payloads, remote code |
| `recorder.spec.ts` | Express Recorder via a stub script: one shared load, create options, KS only from the provider, destroy, events, fixed error text (REC-01) |
| `ks-provider.spec.ts` | `setKsProvider` wiring (`harness.setKsProvider`), fallback to the `ks` prop, missing and bad provider output, KS never in text or console |
| `error-states.spec.ts` | Generic `serverUrl` error without echo, `role="alert"` on every error state, one bad flashcard clip |
| `bootstrap.spec.ts` | `kaltura-wc.js` boots on a bare page and defines all tags |
| `a11y.spec.ts` | Axe scan of chart and flashcards |
| `webcomponent-lifecycle.spec.ts` | Late `config`, remove and re-add, move keeps the widget, one root per element (QA-01, SEC-17) |
| `unisphere-lifecycle.spec.ts` | Unisphere widgets follow props and kill the workspace; `kaltura-entry-selected` scope (QA-03, QA-07, SEC-18) |
| `css-tokens.spec.ts` | Design tokens resolve with and without host variables (QA-02, SEC-25) |
| `iframe-permissions.spec.ts` | `allow` and `sandbox` of the remaining iframes, no capture permission, no iframe for the player, clips and recorder |
| `avatar.spec.ts` | Avatar on the embeds API: provider KS only, no script tag, teardown order, disconnect event (SEC-08, QA-04) |
| `csp.spec.ts` | The recommended CSP from docs/host-integration.md, including the avatar (SEC-08) and the recorder script (REC-01) |
| `analytics.spec.ts` | Analytics `postMessage` handshake against a stub KMC page: `init` content, `navigate`, `updateFilters`, `updateLayout` clamp, wrong origin and wrong source rejected (ANA-01) |

Add a case: import `test` from `./fixtures/harness`, call `h.open()` and `h.mount(tag, config)`, then assert on `h.pwned()` and the logs.
Title cases that wait for a fix `[pending SEC-xx]`. They are skipped unless `E2E_PENDING=1`. Remove the prefix in the fix commit. List them: `grep -rn "\[pending" e2e`.

## Run against a published release

Reads from jsDelivr, writes only to the directory you pass. Use it to check that the served bytes behave like the local build (E2E-01).

```sh
tag=v0.3.0; dir="$(mktemp -d)"
for f in kaltura-wc.js kaltura-react.mjs html-element-stub.mjs; do
  curl -fsSL "https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@${tag}/dist/${f}" -o "${dir}/${f}"
done
E2E_DIST="$dir" E2E_PENDING=1 npx playwright test
```

v0.3.0: all 456 cases pass in chromium, firefox and webkit.
