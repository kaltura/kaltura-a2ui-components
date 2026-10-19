# Contributing

## Set up

```bash
nvm use            # Node from .nvmrc
npm ci
npx playwright install chromium firefox webkit   # only for e2e and check:examples
```

## Dev loop

| Command | Does | When |
|---|---|---|
| `npm run check` | Types, lint, all unit tests | Before every push |
| `npx vitest run test/path/file.test.ts` | One test file | While you work |
| `npm run build` | `dist/kaltura-react.mjs` (with `dist/html-element-stub.mjs`), `dist/kaltura-wc.js`, types | Before the commands below |
| `npm run e2e` | Playwright on three browsers against `dist/` | After a change to a component or the bundle |
| `npm run e2e:live` | Player test against a real Kaltura account | After a change to the Player or the KS flow. See Live test below |
| `npm run check:examples` | README snippets and `examples/` in Chromium, against `dist/` | After a change to README, examples or the public API |
| `npm run check:bundle`, `check:package`, `check:consumer`, `size` | Bundle contents, package contract, consumer install, size budget | After a change to build config, `package.json` or dependencies |
| `npm run test:conformance` | A2UI and Kaltura conformance suite only | After a change to a schema, the catalog or an export |
| `npm run gen:catalog` | Is the catalog JSON in step with the zod schemas? Add `-- --write` to rewrite it | After a change to `src/schemas/` |

## Live test

It needs `NVP1_PARTNER_ID` and `NVP1_ADMIN_SECRET` in a gitignored `.env`. Without them the test is skipped.
Run `npm run e2e:live` (add `-- --project=chromium` for one browser). It mints a 10 minute KS in the test process, plays a real entry and fails if the KS shows up in any request URL.
LIVE-05 to LIVE-15 use fixed ids on the NVP1 test partner: a two-entry manual playlist, and an entry with an English and a French caption asset. Another partner needs its own. LIVE-08 and LIVE-11 to LIVE-15 also need `NVP1_ADMIN_USER_ID` in `.env`: an admin user that has a role, or the Analytics app fails to start. LIVE-16 to LIVE-22 (Avatar, Genie, VOD Avatar, Agents Widget, entitlement) use a second US partner that has Avatar agents: `KALTURA_PARTNER_ID`, `KALTURA_ADMIN_SECRET` and `KALTURA_ADMIN_USER_ID`. They only read from it. LIVE-22 skips when the partner has no members-only category with entries.
`e2e/live/alt.live.spec.ts` runs the same widgets against the North Virginia QA environment (ALT) through `setEnvironments`. It needs `ALT_PARTNER_ID_1` and `ALT_ADMIN_SECRET_1`, only reads, and checks that no request goes to a US host. ALT stands in for a non-default region. It is not a real non-US region.
Never run it in CI, and never commit the secret or a KS.

Look at the examples: build, serve the repo root with any static server and open `examples/plain-html/index.html`. The React example needs Vite: `scripts/check-examples.mjs` shows how it is built.

## Layout

`src/schemas/` (zod) → `src/core/` (render logic) → `src/adapters/react/` (A2UI path) and `src/adapters/webcomponent/` (custom elements). `src/catalog/kaltura_catalog.json` is the catalog agents see.

## Test pyramid

| Layer | Where | Proves |
|---|---|---|
| Static | `npm run lint` (ESLint and `scripts/check-lint-rules.mjs`) | Banned patterns: raw HTML sinks, `srcdoc`, `eval`, a raw `import()` outside the loader |
| Unit and component | `test/**` (vitest, jsdom) | Helpers, all 12 cores, adapters, error states. `test/components/cases.ts` has one table row per component |
| Security regression | `test/security/`, `test/probes/` | One test per finding ID |
| Conformance | `test/conformance/` | Catalog JSON is valid and equals what the zod schemas generate. Message streams render every component. Public API snapshot. Kaltura guide facts |
| Package and release | `test/package/`, `test/release/` | `package.json` contract, workflows, release scripts |
| E2E | `e2e/` (Playwright) | Built bundles in Chromium, Firefox and WebKit, with local fixture servers. Axe scans, CSP. `e2e/live/` is the exception: `npm run e2e:live` talks to a real account and never runs in CI |
| Docs | `scripts/check-examples.mjs`, `test/docs/`, `test/conformance/docs-content.test.ts` | README and example code run. Docs name only real exports |

More in [test/README.md](test/README.md) and [e2e/README.md](e2e/README.md).

## Conventions

- **Test titles start with an ID** (`SEC-06`, `CONF-15`). Pick the next free ID in [docs/security/test-map.md](docs/security/test-map.md). The traceability test fails when a row names a test file that lacks the ID.
- **Red first.** Write the test, see it fail for the right reason, then fix.
- **Pending convention.** A test that waits for a fix is skipped inside its file with `it.skipIf(!process.env.RUN_PENDING)` and the title prefix `[pending ID]`. E2E cases use the same prefix and run with `E2E_PENDING=1`. Whole files go in `test/pending.ts`. `test/pending.ts` is empty today, and the traceability test keeps it empty. Never merge a pending case without a row in the test map that says what blocks it.
- **Public API change.** A new export, a removed export or a new tag fails `test/conformance/api-snapshot.test.ts`. Update the snapshot with `UPDATE_API_SNAPSHOT=1 npx vitest run test/conformance/api-snapshot`, describe it in the PR (the title becomes a Release notes line, label a breaking change `breaking`) and, for a breaking change, add a note to the [current migration doc](docs/migration-0.4.md).
- **New or changed prop.** Change the zod schema, run `npm run gen:catalog -- --write`, write the description in the JSON (it is not generated), and add a case to `test/components/cases.ts`.
- **Docs follow the code.** Change the doc in the same commit as the behaviour. A doc that names a function must name one that exists: `test/conformance/docs-content.test.ts` checks this.
- **Peers.** CI tests the lowest version each peer range allows (`test/conformance/peers.test.ts`). It has no run on the newest. To try one: `npm install --no-save @a2ui/web_core@latest @a2ui/react@latest`, then `npm run test:conformance`. Restore with `npm ci`.
- **Style.** Short sentences and plain words in docs and comments. No em dashes.

## Security checklist

Copy this into your PR (the PR template has it). Agent output is untrusted input.

- [ ] Every new prop has a zod rule, and a hostile value shows a plain-text error.
- [ ] No `innerHTML`, `dangerouslySetInnerHTML`, `srcdoc`, `eval`, `new Function` or `document.write`. Markdown goes through `src/core/safe-markdown.ts`.
- [ ] Remote code loads only through a fixed loader (`src/core/unisphere-loader.ts` behind the allowlist, `src/core/recorder-script.ts`, `src/core/player-script.ts`) or the captions editor fetch, from a Kaltura host.
- [ ] Every URL built from props encodes its values and starts from a fixed Kaltura host.
- [ ] The KS never appears in props, the data model, logs, error text, `setErrorHandler` messages or a URL.
- [ ] Error text is fixed. It holds no prop value and no remote error text.
- [ ] A new host option is a function the host calls. It is never a prop an agent can set.
- [ ] A new iframe has the smallest `allow` list it needs.
- [ ] The web component bundle stays under its `size-limit` budget.
- [ ] Sensitive detail (payloads, steps) goes to a private advisory, not to the repo. See [SECURITY.md](SECURITY.md).

## Commits and PRs

- Keep a PR to one change. Fill in the PR template.
- Commit messages: a short subject, then a dash list on why. Release commits are made by maintainers.
- CI (`ci`, `e2e` and `security` workflows) must be green.

## Releases

Maintainers only. Run the `Release` workflow (`.github/workflows/release.yml`) from `main` with `dry_run=true` first.
