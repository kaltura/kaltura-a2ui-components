# Plan: upgrade to A2UI protocol 1.0

Maintainer plan, written 2026-11-12. Covers this repo and `kaltura/a2ui` (the catalog host). No compatibility layer: 0.7.0 is the first release for outside use, so only A2UI 1.0 is supported. Forward work is in [roadmap.md](roadmap.md).

## Summary

- A2UI 1.0 was announced on 2026-11-11. **No npm package is numbered 1.0.0.** Protocol 1.0 ships inside `@a2ui/web_core@0.15.0` and `@a2ui/react@0.15.0` as entry points.
- A throwaway spike ran our 12 widgets on 1.0 messages with the `0.15.0` peers. Rendering, examples and the consumer check work.
- The reworked catalog generator was run in the spike. Its 1.0 catalog validates against upstream `catalog_definition.json`, all 12 stream fixtures validate against the 1.0 message schema, and the official Python Agent SDK loads the file and accepts the streams (F16, F17).
- The move is a wire-format break. Agents, the catalog JSON, tests and docs all change.
- All design questions are decided in [Decisions](#decisions). D3 and D4 are confirmed ([Owner decisions](#owner-decisions)). Everything that cannot be tested today is a named gate with a command ([Gates](#gates)).
- The plan also covers what it takes to be the reference third-party catalog: theming, accessibility, conformance, examples as tested files, an agent sample and a public demo ([Showcase](#showcase)).
- One security bug exists only on 1.0 (S1). It is a release blocker. Its fix is written and passes red/green in the spike.

## How this was checked

| Source | Used for |
|---|---|
| `0.15.0` tarballs of `@a2ui/web_core`, `@a2ui/react`, `@a2ui/markdown-it` (read, nothing executed) | Exports, runtime behaviour, published code paths |
| Upstream repo at 8bf644a (read only, nothing executed) | 1.0 spec, schemas, reference catalogs, unreleased changes (HEAD) |
| Spike worktree on top of `eval-a2ui-0.15`, 1.0 imports and messages | Every row marked "spike" below. Nothing was committed |
| Probe scripts run against `0.15.0` | Function enforcement, mixed catalogs, envelope keys, guard mutability, `accessibility` delivery |
| Reworked `gen-catalog.mjs` in the spike, then ajv (2020-12) against upstream `catalog_definition.json` and `agent_to_renderer_list.json` | F16 |
| Official `a2ui-agent-sdk` 0.11.0 from PyPI, in an isolated venv run with `python -I`, fed our generated catalog | F17 |
| Upstream docs, samples and conformance YAML at 8bf644a, read as text (second pass) | F18 to F22, D19 to D22, Showcase |

"HEAD" means unreleased upstream code. We never code against HEAD without a release.

## Verified facts

| # | Fact | Verified by |
|---|---|---|
| F1 | `web_core@0.15.0` exports `./v1_0`, `./catalogs/basic/v1`, `./universal` and still exports `./v0_9`, `./v0_8` | `package.json` `exports` of the tarball |
| F2 | `@a2ui/react@0.15.0` root is version-agnostic. It has no `./v1_0`. It still exports `./v0_9` | `exports` of the tarball |
| F3 | One `MessageProcessor` can hold v0.9 and 1.0 catalogs. It picks by message `version` and `catalogId` | Upstream explorer `App.tsx:352`. Spike probe with mixed catalogs |
| F4 | A v0.9 payload sent to a 1.0 catalog is rejected with a clear error | Spike probe |
| F5 | Agent calls to `openUrl`, `copyToClipboard`, `formatString` are refused with `INVALID_FUNCTION_CALL`. Unknown functions are refused. A `rendererOrAgent` function works. `window.open` ran 0 times | Spike probe |
| F6 | The basic catalog `components` map is a plain mutable `Map`. The in-place guard works. The guarded tag is `kaltura-a2ui-video` | Spike probe. Upstream `prepare_catalogs.ts` mutates the same map |
| F7 | `0.15.0` rejects `@accessibility`, `@metadata`, `@checks`, `@catalogId` on components. Bare `catalogId` works | Spike probe |
| F8 | A one-message `createSurface` with `components` and `dataModel` renders | Spike probe |
| F9 | The 1.0 Lit `Video` renders `posterUrl` as `<video poster>` | Tarball `Video.js`. Spike test (S1) |
| F10 | A 1.0 Kaltura catalog (flat components, no root `oneOf`, no `theme`, `protocolVersion`, closed root keys) is valid against upstream `catalog_definition.json`. A bad enum and an extra prop are rejected | Superseded by F16 (the generator now produces the file). The first proof used a hand-built file |
| F11 | `getRendererCapabilities({ versions: ['1.0'], includeInlineCatalogs: true })` returns an object keyed `'1.0'` whose inline catalog equals `catalog.toJson()` | `0.15.0` unit test, read |
| F12 | `@a2ui/markdown-it@0.2.2` is the latest and peers `web_core ^0.14.0`. `@a2ui/react@0.15.0` needs `^0.15.0` | `npm view`, tarball `package.json` |
| F13 | `@a2ui/react` still fails to import in Node (`class extends HTMLElement`), at 0.15.0 and HEAD. Our stub stays | Tarball `chunk-H4D2JAR7.js:98`. HEAD `react_host_element.ts:40` |
| F14 | The `Catalog` constructor's 5th slot takes `CatalogOptions` for 1.0. Passing `themeSchema` is for v0.9 only | Upstream `catalog/types.ts` |
| F15 | The 1.0 basic catalog components are flat: `{type, properties:{component:{const}, ...}, required}`, with relative refs like `common_types.json#/$defs/DynamicString`. They do not wrap `ComponentCommon` and are not closed. The message envelope adds `ComponentCommon` and closes the object (`agent_to_renderer.json`, `Component`: `allOf` + `unevaluatedProperties: false`). The catalog schema also bans `oneOf`/`anyOf` at a component root | `catalogs/basic/catalog.json` and `agent_to_renderer.json` in the `0.15.0` tarball. `catalog_definition.json` `ComponentDefinition.not` |
| F16 | Generator rework run in the spike: output has 30 components (18 basic, 12 Kaltura), 15 functions (14 basic, `copyToClipboard`), `$defs` = `anyComponent`, `anyFunction`, `Weight`. The file is 76 KB. It validates against `catalog_definition.json`. All 12 converted stream fixtures validate against `agent_to_renderer_list.json` with our catalog loaded. An extra prop and a bad enum are rejected. A `copyToClipboard` action message passes | `node scripts/gen-catalog.mjs --write` in the spike, then ajv: `kaltura true`, `basic true`, `streams 12 bad 0`, `extra prop rejected true`, `bad enum rejected true`, `ok fn true` |
| F17 | The official Python Agent SDK (`a2ui-agent-sdk` 0.11.0, `a2ui-core` 0.6.0) loads the v3 file with `CatalogConfig.from_path`, builds a processor for `{"1.0": {supportedCatalogIds: [v3 id]}}` (prompt snippet 68,322 chars), and `parse_response` accepts all 12 streams. It rejects a missing required prop, a bad enum and an unknown component. It **accepts an unknown extra prop**, even on basic `Text`: the SDK leaves props open, as upstream catalogs do. Closing happens in the envelope schema and in our renderer | Script run with `python -I` in a fresh venv, outside the upstream clone |
| F18 | `tooltip` and `visible` (v2 `CatalogComponentCommon`) are declared in the v2 catalog but **no code reads them**. 1.0 has no such def | `grep -w` over `src/adapters` and `src/core` (only unrelated chart hits). ADR 0006 says the same |
| F19 | On `0.15.0` a bare `accessibility` on a widget is accepted, but its label never reaches the DOM (0 `aria-label` matches). `@accessibility` is rejected: "Unrecognized reserved protocol directive" | Probe test on the spike (KalturaChart with `accessibility: {label}`) |
| F20 | The Chart reads dark mode only from `data-theme="dark"` on the root element. No Kaltura widget reads `--a2ui-*` tokens, `a2ui-dark`/`a2ui-light` or `prefers-color-scheme`. The basic catalog in `0.15.0` defines `--a2ui-color-primary`, `-border`, `-surface`, `-on-surface`, `-background`, `-on-background` and the `a2ui-dark` class | `src/core/charts/theme.ts`. `web_core` `universal/basic_catalog/styles/default.js` and the `react/styles` bundle |
| F21 | `x-kaltura-adapters` is read by the release chain, not only by docs: `scripts/stamp-catalog.mjs`, `release-verify-stamp.mjs`, `verify-cdn.mjs`, `check-consumer.mjs`, `.github/workflows/release.yml`, `docs/host-integration.md`, `SECURITY.md`, `test/catalog.test.ts`, `test/release/*` (3 files), `test/conformance/{docs-content,components-doc,catalog-schema,webcomponent-types,helpers}`, `test/conformance/snapshots/public-api.json` | `grep -rl` over the spike |
| F22 | Upstream rules our catalog meets by design: `$id` equals `catalogId`, self-contained refs, UAX #31 names, no `Surface`, `requiresUserActivation` only with `rendererOnly`. Rules we do not yet meet: `instructions`, a parity test against the client catalog, examples as tested files, axe checks, `--a2ui-*` token fallbacks | Upstream `defining-a-catalog.mdx`, `conformance/core/catalog.yaml`, `specification/v1_0/test/` (read) |

## Spike results

| Step | Result |
|---|---|
| Imports to `v1_0`, `catalogs/basic/v1`, `universal`, `@a2ui/react`. Catalog version `'1.0'`. Test messages `version: '1.0'`, `@path`, `@call` | All 12 widgets render through `A2uiSurface` |
| `tsc` | 2 errors in `captions-editor.tsx` and `content-lab.tsx` (`DynamicString` infers `any`, so props become optional). Fixed with `entryId={props.entryId}`. `tsc` clean |
| `lint`, `build:react`, `build:wc`, `check:bundle` | Pass (`check-bundle.mjs` specifiers changed to v1 paths) |
| `size` | WC 232.4 kB gzip, cap 232 kB. React 171.79 kB, cap 172 kB |
| `check:examples` | 4 pages pass after converting `examples/react/main.tsx` and the README snippet to 1.0 |
| `check:consumer` | passed |
| Unit suite | 19 failed, 2729 passed (2748). See [Known red tests](#known-red-tests-in-the-spike) |
| e2e (`npm run e2e`) | 522 passed, 0 failed (Chromium, Firefox, WebKit) |

### Known red tests in the spike

| Test | Count | Cause | Fixed in |
|---|---|---|---|
| `conformance/message-streams` | 12 | Committed catalog is still the v0.9 file | Phase 2 (regenerate) |
| `conformance/client-messages` | 4 | Needs `renderer_to_agent.json` rules for `toClientError` | Phase 1 and T1 |
| `conformance/components-doc` | 1 | `docs/components.md` follows the catalog | Phase 2 |
| `adapter.test.ts` (F9 function names) | 1 | `@index` added to the function list | Phase 3 |
| `agent-action.test.tsx` F29 | 1 | `toClientError` still returns `version: 'v0.9'` | Phase 1 |

## Decisions

All decided and confirmed by the owner on 2026-11-12.

| # | Decision | Why |
|---|---|---|
| D1 | **One release, protocol 1.0 only.** No separate "v0.9 on 0.15 peers" release | Both need the same peer fix (G1). Two releases double the test and docs work and give hosts a state nobody asked for. The `eval-a2ui-0.15` branch is not merged |
| D2 | **1.0 only.** No v0.9 support, recipe or test | The project had no outside users before 0.7.0 (owner, 2026-11-12). Keeping two protocols would double the tests and docs for nobody |
| D3 | **New catalog id `https://kaltura.github.io/a2ui/v3/catalog.json`.** Keep `v2` published and untouched. Ship `v3/common_types.json` next to it | The catalog JSON shape changes (`@call`, `protocolVersion`, no root `oneOf`). Relative `common_types.json#/$defs/...` refs need the file beside the catalog. `v1/` already ships `common_types.json` |
| D4 | **Our next version is `0.7.0`** with a breaking-change note. Not named 1.0 | Our 1.0 should mean API stability, not protocol version |
| D5 | **Peers `@a2ui/react ^0.15.0` and `@a2ui/web_core ^0.15.0`** | For `0.x` a caret holds the minor. We bump on purpose, after the pin test (T8) passes on the new minor |
| D6 | **Do not wait for upstream releases.** Ship on the `0.15.0` wire: bare `accessibility`, `checks`, `catalogId`, `metadata`. Adopt `@` envelope keys in a follow-up minor (F1 in [Follow-ups](#follow-ups)) | F7: `0.15.0` rejects `@` keys. The spec says renderers tolerate bare keys during the transition. Our fixtures use none of them, so no payload of ours is affected |
| D7 | **`@a2ui/markdown-it` conflict: ship `overrides` guidance, not a fork.** Document the override in README and `check-consumer.mjs`. Help upstream with #4059 | `check:consumer` passes with the override. SEC-05 markdown tests pass in the spike (unit run) |
| D8 | **Catalog is flat.** Drop the `oneOf` on `KalturaPlayer`. Keep "set exactly one of entryId and playlistId" in the property descriptions. The runtime still refuses both and neither | F15: no root `oneOf`/`anyOf` in components. In v2 the `oneOf` sat inside the component's own `allOf` block, so it would now sit at the root. F16 shows the flat shape validates |
| D9 | **Move `x-kaltura-adapters` to `metadata.extensions.com_kaltura_adapters`** at the catalog root. Update every reader in F21 in the same change | Spec closes root keys. Extension names must be UAX #31 identifiers, and `x-kaltura-adapters` is not one. `v2` keeps the old key. The stamp and verify scripts are release-critical, so T3 and the release dry run (Phase 5) must pass before a tag |
| D10 | **Set `allowedCallers: 'rendererOnly'` explicitly** on `copyToClipboard` and `SafeOpenUrl`, and in the catalog JSON | The spec requires it for `requiresUserActivation: true`. No Kaltura function is `agentOnly` or `rendererOrAgent` |
| D11 | **Ship catalog `protocolVersion: "1.0"` and `instructions`** (text in [Catalog `instructions`](#catalog-instructions)) | Spec: 1.0 catalogs must declare the version. Agent SDKs build prompts from descriptions and `instructions` |
| D12 | **Leave `allowedParents` and `allowedChildren` undeclared** for all 12 widgets | Spec: omitted means all parents are allowed, including the surface root. The SDK accepts all 12 widgets as root (F17). All 12 are leaf widgets |
| D13 | **Honour `accessibility` in the 12 widgets** (`label`, `description`, `live`, `hidden`) through one shared helper that sets `aria-label`, `aria-description`, `aria-live` and `hidden` on the widget root. Do not redeclare `accessibility` in the catalog (it is in `ComponentCommon`) | Spec: renderers MUST plumb accessibility. F19: today the label is lost. On HEAD the same data arrives via `accessibilityRef` (follow-up F2). Gate: the helper reads `props.accessibility`. If the adapter does not pass it on `0.15.0`, T10 fails first and Phase 1 adds the read from the component context |
| D14 | **Raise the WC size cap from 232 kB to 233 kB now.** Keep React at 172 kB. Re-measure after Phase 2. Raise further only by the measured excess, rounded up to 1 kB, with the reason in the PR | Spike: WC is 403 B over. React has 0.21 kB left |
| D15 | **Examples use `{ name, description, messages }`** in `kaltura/a2ui/v3/examples/` and in our fixtures | Upstream format (`catalogs/basic/v1/examples/*.json`). v2 examples are bare arrays |
| D16 | **Do not use `catalog.toJson()` as the catalog source.** Keep `gen-catalog.mjs`, reworked for 1.0. Revise ADR 0006 | `toJson()` drops our descriptions (ADR 0006: `.describe()` costs bundle size) and `.positive()` becomes draft-4 `exclusiveMinimum`. Use `.int().min(1)` |
| D17 | **No npm package.** Keep jsDelivr-only. Reword the README so `npm i github:...` is not confused with a package named like ours | Not a listing criterion upstream. Publishing needs a scope the owner controls (open question O3) |
| D18 | **Theme.** Drop the 5th `Catalog` argument (F14). The widgets keep their own palette. They must follow the host's light/dark choice in this order: `data-theme`, an ancestor `a2ui-dark` or `a2ui-light` class, then `prefers-color-scheme`. Chart surface, text and border colours read `--a2ui-color-surface`, `--a2ui-color-on-surface` and `--a2ui-color-border`, with today's values as the fallback (F20) | Upstream: theming belongs to the catalog. Leaf widgets must not hardcode colours, and hosts switch modes with `a2ui-dark`/`a2ui-light`. Series colours (`CHART_COLORS`) stay fixed. Test T16 |
| D19 | **v3 includes the 18 basic components and 14 basic functions**, copied by the generator from `web_core`, as v2 does | A surface binds one `catalogId`, and `kalturaReactCatalog` serves the basics. Agents then need one id (F16, ADR 0006) |
| D20 | **Drop `tooltip` and `visible` from the Kaltura components** | F18: they were declared and never read. 1.0 has no such def. An agent that sets them now gets a validation error |
| D21 | **Examples are files, each run by a test** (`kaltura/a2ui/v3/examples/*.json`, vendored into this repo's fixtures). Docs snippets link to the file | Upstream MCP pattern. Docs cannot drift from tested payloads (Phase 3, T17) |
| D22 | **Parity test against the client catalog** (T18): the catalog the React adapter builds has the same ids, version, component names and function names, `allowedCallers` and `returnType` as the JSON | Upstream `defining-a-catalog.mdx` asks for this and warns against raw string compare |

## Gates

Each gate has a check command and a decision for both outcomes.

| Gate | State on 2026-11-12 | Check | If clear | If not clear |
|---|---|---|---|---|
| G1 markdown-it peer | 0.2.2 peers `^0.14.0`. Upstream #4059 open | `npm view @a2ui/markdown-it peerDependencies version` | Remove the `overrides` guidance | Ship with the override (D7) |
| G2 envelope keys | `0.15.0` rejects `@` keys. PRs #4170 (core dual-read) and #4171 (emit `@child`, `@action`, `@functionCall`) open | `gh pr view 4170 --repo a2ui-project/a2ui --json state` (same for 4171) and `npm view @a2ui/web_core version` | Plan follow-up F1 | Ship on bare keys (D6) |
| G3 light DOM and HEAD breaking changes | Unreleased. Light-DOM `A2uiLitElement`, `element.context` removal, a11y markup moved, `TextField.value` required, unknown functions route to the agent | Pin test T8, then the full Phase 4 matrix on the new minor | Adopt per follow-up F2 | Stay on `0.15.x` |
| G4 public IDs | Confirmed 2026-11-12 | Done | Proceed | Not applicable |
| G5 repo visibility | Repo went internal once and the CDN returned 404 (0.6.1 held). See project memory | `gh repo view kaltura/kaltura-a2ui-components --json visibility` and `curl -I` on a jsDelivr file for the tag | Release | Do not release |
| G6 Zod audit exception | Dated exception for `zod ^3.25.76` | `npm audit` at release | Release | Renew or fix first |
| G7 upstream tools | **Run 2026-11-12** in throwaway Docker containers, upstream `main` at `8bf644a`: `validate.py` passed; `a2ui lint --fatal-warnings` passed on our catalog (and fails on a broken copy); our 27 example messages pass the upstream `agent_to_renderer.json` schema once `accessibility` is renamed `@accessibility` (F1). Rerun before the listing PR | Run in a throwaway CI job in `kaltura/a2ui`, pinned to a commit SHA | Paste output in the listing PR | Fix the catalog, rerun |
| G8 live suites | `e2e:live` not run in the spike (needs the live account) | `npm run e2e:live` on a quiet machine (Phase 7) | Release | Do not release |

Run G1, G2 and G5 at the start of each phase and before the tag. `npm run check:upstream` covers G1, G2, the SSR issue and zod 4 in one table. The `upstream-watch` workflow runs it weekly.

## Security

Alert the owner at once if any check below fails. S1 to S3, S9 and S10 block the release.

| # | Item | Status | Action and check |
|---|---|---|---|
| S1 | Basic `Video` accepts `posterUrl`. The 1.0 Lit element renders it (F9). Our guard checked `url` only, so `<video poster="https://evil.example/p.png">` loaded a foreign image | **Fix verified in spike.** 71 pass with the fix, 3 fail without it. Not in shipped code: the v0.9 schema refuses `posterUrl` | Port the fix from the spike (`basic-media.tsx`). Tests: Kaltura CDN poster renders `poster`; foreign poster renders nothing; poster with `?ks=` renders nothing and leaks no KS; foreign poster reports `url-rejected` |
| S2 | Agents can send `callRendererFunction` | **Verified (F5).** Renderer refuses `rendererOnly` and activation functions | Add tests T4 and T5 to the repo (agent-sent calls to `openUrl` and `copyToClipboard`; unknown function) |
| S3 | `requiresUserActivation` forces `allowedCallers: rendererOnly` in the catalog | Decided (D10) | CONF test: generated catalog validates against `catalog_definition.json` (T2) |
| S4 | Guard replaces entries in a host-owned `basicCatalog` map | **Verified (F6).** Map is mutable | T6: guarded tag is used, original element is not |
| S5 | Markdown images in `Text` | Unit run on spike: SEC-05 markdown tests pass | Keep. Re-run on every peer bump |
| S6 | Markdown sanitiser path | **Verified.** Our guard wraps the host renderer with `sanitizeMarkdownHtml` (`basic-media.tsx`). The SEC-05 markdown tests (bound KS image, agent-chosen basic catalog id, CDN image, extra origin) pass on the spike | Keep T7 (the existing SEC-05 markdown tests) green on every peer bump |
| S7 | Zod audit exception | G6 | `npm audit` at release |
| S8 | `.env` and local plan files | Untracked and ignored; never committed on any branch (`git log --all`). The exclude is in `.git/info/exclude`, per clone only | Add those patterns to `.gitignore` (Phase 6) |
| S9 | Media URL rules for every URL a widget loads or opens (upstream "Mandatory" list): trim whitespace and control characters; allow only `http:`, `https:`, `data:` and relative paths; `https:host` is rejected; a relative path starting `//` (or `\\`) is rejected, after tabs and newlines are dropped; check only the prefix | Our policy (SEC-05) is stricter: Kaltura hosts only | T19: table-driven test with `https:host`, `ht\ttps://host`, `/\t/host`, `//host`, `javascript:`, `data:` on every URL prop of the basic and Kaltura components. Any hole is a release blocker |
| S10 | `openUrl` rules: only `http`/`https`, user activation, `noopener,noreferrer`. Failure is an execution error | `SafeOpenUrl` is ours. F5 shows agents cannot call it | T20: activation missing gives `EXECUTION_ERROR`; the opened window has `noopener,noreferrer`; `javascript:` is refused |
| S11 | Message lists are processed in order. A failed message is reported and the rest still run. No repaint until the list ends | Upstream A2A extension spec | T21: a list with a bad middle message renders the others and sends one error |

## Work plan

Each phase ends with a check. Stop after 3 failed rounds on one check and report.

### Phase 0: confirm and prepare

| Task | Check |
|---|---|
| D3 and D4 confirmed (G4) | Done 2026-11-12 |
| Run G1, G2, G5, G6 | Results pasted in the PR |
| Branch from `main`, not from `eval-a2ui-0.15`. Port only the pieces listed below | `git log main..HEAD` shows the intended commits |
| Port from the spike: S1 fix and tests, the two `tsc` fixes, `check-bundle.mjs` paths, the example and README conversions | `git diff main --stat` matches the spike list |

### Phase 1: imports and runtime (this repo)

| Area | Files | Change |
|---|---|---|
| Imports | `src/adapters/react/*.tsx`, `index.ts`, `agent-action.tsx`, `basic-media.tsx`, `html-element-stub.ts`, `src/catalog/client-functions.ts`, `src/schemas/*.ts` (12 files), `src/core/validate-props.ts` | `v0_9` entry points to `v1_0`, `catalogs/basic/v1`, `universal`, `@a2ui/react` root |
| Catalog build | `src/adapters/react/index.ts` | `new Catalog(id, '1.0', components, functions)`. Drop the theme argument (D18). `KALTURA_CATALOG_ID` becomes the v3 URL |
| Client errors | `src/core/host-hooks.ts` `toClientError`, `KalturaClientError` | `version: '1.0'`. Follow `renderer_to_agent.json`: exactly one of `surfaceId` or `functionCallId`; validation codes need `path` |
| Functions | `src/catalog/client-functions.ts` | D10 |
| Media guard | `src/adapters/react/basic-media.tsx` | S1 |
| Accessibility | one helper under `src/core/`, used by the 12 widget adapters | D13. Test T10 per widget |
| SSR stub | `src/adapters/react/html-element-stub.ts` | Keep (F13). Re-test with the Node import check in `check:bundle` |
| Web component bundle | `src/adapters/webcomponent/*` | Rebuild. Tags and `.config` API do not change |
| Peers and externals | `package.json`, `vite.config.*`, `scripts/check-bundle.mjs`, `scripts/check-consumer.mjs` | D5, D7. Fix the error text that still says `v0_9` |

Check: `npx tsc --noEmit` and `npm run lint` clean. Unit tests outside the catalog and docs areas pass.

### Phase 2: catalog generator

`scripts/gen-catalog.mjs` needs a real rework (a path-only change wrote `"ComponentCommon": undefined`). The spike did it. The change list below is what worked (F16).

| Task | Detail |
|---|---|
| Inputs | `UPSTREAM_SCHEMAS` to `src/v1_0/schemas`. Read only `catalogs/basic/catalog.json`: its refs are already relative, so copy it as it is. Drop `common`, `BasicComponentCommon`, `theme` and the `COMMON_TYPES_ID` rewrite |
| Dynamic types | `BINDING` probe becomes `{ '@path': '/a' }`. Refs written as `common_types.json#/$defs/DynamicString`, `DynamicNumber`, `DynamicBoolean` and `Action` |
| Component shape | Kaltura components are `{ type, description, properties, required }`. Read and write `properties` and `required` on the component, not on an `allOf` block. One-time conversion of the committed v2 file is a throwaway script, not part of the repo |
| Header and defs | Header: `$schema, $id, protocolVersion, title, description, catalogId, metadata, instructions, components, functions, $defs`. `$id` equals `catalogId`. `$defs` = copied `Weight`, rebuilt `anyComponent` (`oneOf` of `#/components/X` plus `discriminator: component`) and `anyFunction` |
| Docs generator | `renderComponentsDoc` reads `metadata.extensions.com_kaltura_adapters.webcomponent.customElements`. `resolveBindings` matches `@path`. The `@path` text in the intro line is updated |
| Intentional differences | Reword the Player entry: the catalog cannot carry the `oneOf` rule (F15). The conformance test pins this list |
| Output shape | Flat components. `protocolVersion: "1.0"`. `instructions`. `metadata.extensions.com_kaltura_adapters`. Function schemas with `@call` and `args`. `allowedCallers` and `requiresUserActivation` per D10. `$defs` only `anyComponent`, `anyFunction` and leaf defs. Relative `common_types.json#/$defs/<allowed>` refs only |
| Player | No root `oneOf` (D8). Descriptions carry the rule |
| Functions | `copyToClipboard`: `@call`, `args` with `unevaluatedProperties: false`, `returnType: void`, `allowedCallers: rendererOnly` (D10) |
| Positive integers | `.int().min(1)` (D16) |
| Outputs | `src/catalog/kaltura_catalog.json`, `docs/components.md`, fixtures. Review the diff by hand |
| ADR | Revise [0006-catalog-generation.md](adr/0006-catalog-generation.md). New ADR 0010: D1 to D3 (1.0 only, v3 id) |

Check: `npm run gen:catalog` in check mode is clean. The spike run is the reference: F16 numbers (30 components, 15 functions, 12 streams valid). The generated file passes the F10 proof script's assertions, now as a repo test (T2). `common_types.json` is copied into the release assets (T3).

### Phase 3: tests

Count tests before and after. The number must not drop.

| ID | Test | Area |
|---|---|---|
| T1 | Conformance helper uses `agent_to_renderer*.json` and `renderer_to_agent.json`. Ajv keyword for `com_kaltura_adapters` | `test/conformance/helpers.ts` |
| T2 | Generated catalog validates against upstream `catalog_definition.json`; good stream passes; bad enum and extra prop fail; function message passes (the F10 proof as a test) | `test/conformance/` |
| T3 | Release assets include `common_types.json` and every relative `$ref` in the catalog resolves in the asset folder | `test/conformance/` |
| T4 | Agent-sent `callRendererFunction` to `openUrl` and `copyToClipboard` returns `INVALID_FUNCTION_CALL`; no `window.open` | `test/security/` |
| T5 | Agent-sent call to an unknown function is refused | `test/security/` |
| T6 | Guard identity: guarded tag in the basic catalog, in-place map edit works | `test/security/media-url.test.tsx` |
| T7 | Existing SEC-05 markdown tests stay green on 1.0 (no new test needed) | `test/security/media-url.test.tsx` |
| T8 | Pin test: on the installed minor, bare `accessibility` is accepted and `@accessibility` is rejected (F7). When a bump changes this, the test fails and forces F1 | `test/conformance/envelope-keys.test.tsx` |
| T10 | Each widget sets `aria-label`, `aria-description`, `aria-live`, `hidden` from `accessibility` | `test/` per widget |
| T11 | `toClientError` output validates against `renderer_to_agent.json` for each error code we emit | `test/security/agent-action.test.tsx` |
| T12 | `@path` and `@call` round trip through a live `MessageProcessor` (binding updates the widget) | `test/` |
| T13 | `getRendererCapabilities({ versions: ['1.0'] })` lists the v3 catalog id | `test/` |
| T14 | Fixtures converted to `version: '1.0'` and `@path`/`@call` (do not blanket-replace: only binding and call positions) | `test/conformance/fixtures/` |
| T15 | Poster tests from S1 | `test/security/media-url.test.tsx` |
| T16 | Chart and other themed widgets follow `data-theme`, then an ancestor `a2ui-dark`/`a2ui-light` class, then `prefers-color-scheme` (D18) | `test/charts/` |
| T17 | Every file in `test/conformance/fixtures/examples/` (vendored from `kaltura/a2ui/v3/examples/`) validates against the 1.0 message schema with our catalog loaded, and renders through `A2uiSurface` (D21) | `test/conformance/` |
| T18 | Parity: the catalog built in `src/adapters/react/index.ts` has the same id, `protocolVersion`, component names and function names, `allowedCallers` and `returnType` as the JSON (D22). Round trip: parse the JSON with the SDK-style loader and compare fields, not strings | `test/conformance/` |
| T19 | Media URL table (S9), on every URL prop | `test/security/media-url.test.tsx` |
| T20 | `openUrl` rules (S10) | `test/security/` |
| T21 | Message list order and error isolation (S11) | `test/conformance/` |
| T22 | Axe check (`button-name`, `aria-valid-attr-value`, `aria-allowed-attr`, `aria-hidden-focus`) on each widget with `accessibility` set | `test/` per widget |
| T23 | An unknown component type and a cycle render a safe placeholder and send `UNKNOWN_COMPONENT_TYPE` or `CYCLIC_REFERENCE`, not a crash | `test/conformance/` |
| T24 | A type change under the same component id resets the widget's state | `test/lifecycle/` |
| T25 | Capability negotiation: with no `"1.0"` key, nothing in this repo's helpers sends A2UI; with it, the v3 id is listed (T13). Key is `a2uiRendererCapabilities` | `test/` |

Also run: `test/adapter.test.ts` (F9 `@index`), `docs` parity tests, and `e2e/agent-action.spec.ts`, `e2e/media-url-policy.spec.ts`.

Check: `npm test` green. `npm run e2e` green in Chromium and WebKit. T10 and T22 may expose widgets that drop `accessibility`; fixing them is in scope (D13).

### Phase 4: full test run

| Run | Command | Result on the spike |
|---|---|---|
| Unit | `npx vitest run` | 19 failed, 2729 passed (2748), all in [Known red tests](#known-red-tests-in-the-spike) |
| e2e | `npm run e2e` | 522 passed in 1.3 min across Chromium, Firefox and WebKit, 0 failed |
| Live | `npm run e2e:live` on a quiet machine | Not run (needs the live account). Run in Phase 7 |

### Phase 5: size, packaging

| Task | Check |
|---|---|
| D14 cap change in `.size-limit.json`, reason in the PR | `npm run size` green |
| `check:bundle`, `check:package`, `check:consumer`, `check:examples`, `build:notices` | All green |
| Release chain after D9: `stamp-catalog`, `release-verify-stamp` and `verify-cdn` read the new `metadata.extensions.com_kaltura_adapters` path | `test/release/*` green, plus one dry run of the release workflow steps on a scratch tag in a fork or with the workflow's own dry-run mode, if it has one. If neither exists, run the three scripts by hand on a built tree and paste the output |

### Phase 6: docs and hygiene (this repo)

| Task | Detail |
|---|---|
| Wire examples | `README.md`, `docs/agent-guide.md`, `docs/host-api.md`, `docs/host-integration.md`, `docs/security/ks.md`, `docs/troubleshooting.md`, `examples/` (`@path`, `@call`, `version: '1.0'`, capabilities key `a2uiRendererCapabilities`, MIME `application/a2ui+json`) |
| Support statement | README, first screen: "Built for A2UI 1.0 (`@a2ui/web_core` and `@a2ui/react` 0.15.x)." Upstream asks for this |
| Release notes | `docs/release-notes/0.7.0.md`, hand-written: wire changes, v3 id, error `version`, peers, S1 |
| `SECURITY.md` | Fix the supported-versions table (it still lists `0.4.x`) |
| `.gitignore` | Add `.env`, `SECF-*`, `.audit/` (S8) |
| Repo metadata | Topics (`a2ui`, `kaltura`, `generative-ui`), homepage URL, enable Discussions, version and jsDelivr badges |
| README shape (VegaChart pattern) | A schemas table (catalog id, protocol, file), an entry-points table (import path or CDN file, protocol, exports), a property table per component (already in `docs/components.md`), a "Rendering behavior" section, a hooks table (`setKsProvider`, error handler, markdown renderer hook) and a styling table (D18). Each example links to its tested file (D21) |
| Theming doc | `docs/theming.md`: light/dark order (D18), the `--a2ui-*` tokens the Chart reads with fallbacks, and what stays fixed |
| Agent skill | `skills/kaltura-a2ui/SKILL.md` in `kaltura/a2ui`, in the upstream shape: trigger description, "do not write A2UI from memory", install table, minimal render. Content comes from the catalog `instructions` and `docs/agent-guide.md`, not new prose |
| Stale-text sweep | `a2uiClientCapabilities`, `application/json+a2ui`, `v0.9`, `{ path` in any doc or example (grep returns none) |

Check: `npx vitest run test/conformance/docs-content.test.ts`, QA-16 and the docs parity tests pass. `npm run check:examples` runs every snippet.

### Phase 7: live checks

| Task | Check |
|---|---|
| `npm run e2e:live` | ENV-01 to ENV-04 and WebKit player LIVE-01 to LIVE-21 pass (LIVE-15 skips outside Chromium by design) |
| One agent run against the v3 catalog | All 12 widgets render |

### Phase 8: release

Follow the existing jsDelivr-only flow.

| Step | Detail |
|---|---|
| Pre-flight | G1, G2, G5, G6 re-run. `npm audit` read |
| Tag and publish | As in earlier releases. Include `common_types.json` in the assets |
| Catalog copy | Copy `kaltura_catalog.json` to `kaltura/a2ui` as `v3/catalog.json`, with `v3/common_types.json` and `v3/examples/` |
| Verify | `curl -I https://kaltura.github.io/a2ui/v3/catalog.json` returns 200 with `access-control-allow-origin: *`. The file's `catalogId` equals its URL |

## The `kaltura/a2ui` repo

| Task | Detail | Check |
|---|---|---|
| `v3/` folder | `catalog.json`, `common_types.json`, `examples/*.json` in `{name, description, messages}` | `deploy-pages.yml` passes |
| CI: schema | Validate the catalog against upstream `catalog_definition.json` with ajv (2020-12), as in F10 | Job fails on a bad catalog |
| CI: examples | Validate each example against `agent_to_renderer.json` with the catalog loaded | Job fails on a bad example |
| CI: upstream tools | Run upstream `validate.py` and `a2ui lint --catalog` pinned to a commit SHA, in a throwaway job. **Not run yet** (they need `yarn dlx` and a Dart toolchain, which the spike did not install) | Run once before the listing PR. Paste output in the PR |
| CI: pins | `actions/checkout` by SHA, not tag | `zizmor` clean |
| README | Version table (catalog version, protocol, renderer release). Supported A2UI versions. Do not link any private repo | Link check |
| Hygiene | Description, topics (`a2ui`, `catalog`), Discussions on, `SECURITY.md`, `CONTRIBUTING.md`, issue templates | Settings read back with `gh api` |
| Python SDK check | CI job installs `a2ui-agent-sdk` from PyPI at a pinned version in a venv, loads `v3/catalog.json` with `CatalogConfig.from_path`, and runs `parse_response` on every example (the F17 script, kept as `scripts/sdk-check.py`, run with `python -I`) | Job fails on a bad catalog or example |
| Example agent (H2) | `samples/adk-agent/`: loads the catalog, keeps examples in a folder per catalog id, builds the processor per request from `a2uiRendererCapabilities`, advertises the catalog id in the AgentCard, uses Direct JSON first. README ends with a security note: agent output is untrusted | Runs from a clean clone with a fake model (no key needed) and prints validated messages |
| Source of truth | Today v2 is a manual copy and v1 syncs from a private repo. Decide one flow: release asset in, PR to `kaltura/a2ui` out (script in the release workflow) | One written flow in README |

## Catalog `instructions`

Draft text for D11 (short, written for the model):

- Use one Kaltura component per user need. Do not rebuild a widget from basic components.
- Never invent IDs, URLs or keys. Take `partnerId`, `uiconfId`, `entryId` from the user, the host or earlier tool results.
- Media URLs must be on the host's allowed Kaltura domains. Anything else renders nothing.
- Never put a Kaltura Session (KS) in a message. The host adds it.
- Components marked "Needs a KS" fail without a host-supplied KS. Say so to the user instead of retrying.
- To play a manual playlist use `playlistId`. Set exactly one of `entryId` and `playlistId`.
- Reply in plain text when the client does not list this catalog id.

Check: each statement matches a rule in `docs/agent-guide.md` and `docs/security/ks.md` (review in Phase 2).

## Showcase

What upstream asks of a listed catalog, and what we do. Source: `ecosystem/renderers.mdx` and `CONTRIBUTING.md` upstream.

| Upstream criterion | Our state after this plan |
|---|---|
| Open-source repo, Apache 2.0 or MIT | Apache-2.0, both repos public (G5) |
| Docs state supported protocol versions | Support statement in both READMEs (Phase 6) |
| Install steps and a minimal runnable example | README plain-HTML snippet, run by `check:examples` |
| Active maintenance | Release 0.7.0 on 1.0. Only two of 19 listed renderers show v1.0 |

| # | Deliverable | Owner action? | Done when |
|---|---|---|---|
| H1 | Hosted live demo (GitHub Pages) with a recorded GIF, linked from README, repo homepage and the PRs | No | URL returns 200; GIF in README |
| H2 | Public example ADK agent that vendors the v3 catalog and examples | No | `README` run steps work from a clean clone |
| H3 | Upstream docs PR: one row in "Catalogs and component libraries" (`docs/site/src/content/docs/ecosystem/renderers.mdx`), versions `v1.0`, status Active, demo links | **Yes: Google CLA, opens a PR upstream** | PR open. Do not open without the owner's go-ahead |
| H4 | Discussions "Show and tell" post with a demo video of 4 minutes or less | **Yes: posts publicly** | Post live |
| H5 | Adapter harness that feeds upstream `conformance/` YAML cases to our widgets, with the pass rate in the README. Upstream has no shared runner or badge | No | A new test script prints N of M cases passed and the README quotes it |
| H6 | Help on upstream #4059, #3158, #3812 (bugs that hit our users) | **Yes: comments or PRs upstream** | Merged PRs show in release notes |
| H8 | Hooks table and security notes in both READMEs (the catalog is a risky surface: KS, media URLs, iframes). Mirror the upstream rizzcharts disclaimer: treat agent output as untrusted | No | Reviewed against `docs/security/` |
| H9 | Static-payload demo with its own test (the `samples/vegachart` pattern): no model, no key, runs from a clean clone, lists what each part exercises | No | Test runs in CI |
| H10 | A short comparison table in the README: what we do beyond the basic catalog (KS handling, URL policy, error reporting to the agent, size budget, SSR stub) | No | Every row links to a test |
| H7 | Copyright or SPDX headers on `src/` (88 of 88 files have none) | No | Optional. Add only if the owner wants Google-style headers |

Not found upstream: any application process for "Built with A2UI", or a call for third-party catalogs. H3 and H4 are the documented route; the showcase is curated, so quality and relationships decide it. No claim on outcome.

## Owner decisions

On 2026-11-12 the owner accepted every default below and told me to proceed with my recommendations. O6 to O8 are those recommendations.

| # | Question | Answer |
|---|---|---|
| O1 | D3: catalog id `.../v3/catalog.json` | Yes |
| O2 | D4: release number `0.7.0` | Yes |
| O3 | Publish to npm | No. jsDelivr-only (D17) |
| O4 | H3, H4, H6: act upstream (listing PR, Discussions post, comments) | Wait for a separate go for each action. The owner signed the Google CLA. Upstream PR [#3197](https://github.com/a2ui-project/a2ui/pull/3197) (import `@a2ui/react` without a DOM, fixes #3158) is rebased onto upstream `main` and waits for review |
| O5 | H7: SPDX headers | No |
| O6 | Older versions | None supported. Only the latest minor gets fixes ([SECURITY.md](../SECURITY.md#supported-versions)) |
| O7 | `accessibility.hidden` mechanism (D13) | `aria-hidden`, per the spec's "hides from assistive technologies" |
| O8 | Avatar and Genie theme default (D18) | Follow the page theme: `data-theme`, an `a2ui-dark` or `a2ui-light` class, then the system setting |

## Follow-ups

| # | Item | Trigger |
|---|---|---|
| F1 | Switch to `@accessibility`, `@metadata`, `@checks`, `@catalogId` envelope keys and add `@child`, `@action`, `@functionCall` if #4171 lands | New `web_core` release that accepts them. T8 fails on the bump |
| F2 | Move to `accessibilityRef` and `validationErrorsRef`, drop `element.context` use, retest light-DOM guard styles | HEAD changes released (G3) |
| F3 | Drop the markdown-it override | G1 clear |
| F4 | Re-check the Node import of `@a2ui/react` and remove the stub if fixed | #3158 closed |

## Done list

All must hold before "done":

1. G1 to G6 checked on the release day. D3 and D4 confirmed.
2. S1 to S8 closed, each with a test or a written answer.
3. `tsc`, `lint`, `npm test`, `build`, `size`, `check:bundle`, `check:package`, `check:consumer`, `check:examples`, `e2e` green. Test count not lower than before.
4. Live suites pass.
5. Docs match code: release notes, regenerated `docs/components.md`, support statement.
6. `kaltura/a2ui` serves `v3` with CI green (schema, examples, SDK check).
7. G7 run once and its output kept. T1 to T25 exist and pass.
8. Every item in [Owner decisions](#owner-decisions) is answered.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Upstream envelope keys land in a release that changes behaviour | Fixtures or catalog need rework | T8 pins today's behaviour. Peers hold the minor (D5) |
| Upstream Agent SDKs emit `@` envelope keys that `0.15.0` rejects | Agents built on the SDK fail on `accessibility` and `checks` | State the web_core range in the agent guide. Our fixtures avoid those keys |
| Markdown-it override confuses hosts | Install errors | Document in README. `check:consumer` covers it |
| Size cap | CI blocks release | D14 |
| Repo goes internal again | CDN 404 | G5 before every tag |
| Showcase does not happen | No visibility gain | H1 to H5 stand on their own: they help adopters either way |

## Not covered

- Lit and Angular surfaces. We ship React and a web component bundle. The basic Lit elements we guard come from `@a2ui/web_core`, so Phase 3 still tests them.
- A2UI Express, Agent SDKs and MCP Apps. Not used here.
- Eval datasets upstream are encrypted. Whether outside contributors can use them is unverified.
- Not run, by design: upstream `validate.py` and `a2ui lint` (G7), `e2e:live` (G8), the TypeScript Agent SDK and the Express format (the SDK notes say Express skips components a catalog does not declare, so Direct JSON is the supported path for us), and the unreleased HEAD changes (G3).
- Verified only on the spike worktree, not on a committed branch: F16, F17, F19. The plan ports them in Phases 0 to 3.

## Status (2026-11-12)

Merged to `main` in PR 61. Released as `v0.7.0`.

| Phase | State |
|---|---|
| 0 Decisions | Done (D3 `v3`, D4 `0.7.0`) |
| 1 Code | Done: imports, `Catalog` call, `toClientError`, S1 poster check, D10, D13 (`aria-hidden` is the hidden mechanism, per the spec's "hides from assistive technologies"), D18 |
| 2 Catalog | Done: generator, `v3` catalog, `common_types.json` copy (T3) |
| 3 Tests | Done: T1 to T25 (T1, T6, T14, T15, T19, T20 are covered by `helpers.ts`, `media-url.test.tsx`, `open-url.test.ts` and the converted fixtures). T17 reads `examples/a2ui/` (12 files, one demo each) instead of a vendored copy. H5, the upstream YAML suite, is a deliberate non-goal: it tests SDK internals and uses the unreleased `@accessibility` key. T18, CONF-01 and T2 cover the catalog checks that matter here |
| 4 e2e | `npm run e2e`: 657 passed on Chromium, Firefox and WebKit, including the demo (axe in both themes) |
| 5 Build | `size`, `check:bundle`, `check:package`, `check:consumer`, `check:examples` green. Stamp and verify dry run clean |
| 6 Docs | Done: README, agent guide, host API, host integration, KS, theming, troubleshooting, examples README, release notes, SECURITY, ADR 0006 update, ADR 0007 note, ADR 0010. Repo metadata, topics and Discussions set on both repos (2026-11-12) |
| 7 Live | Demo app (`npm run demo`) with e2e on three browsers and axe in both themes. `npm run e2e:live`: 61 passed, 29 skipped in the default run. The 27 ENV tests (non-default region) pass on three browsers after `.env` references (`$NAME`) are expanded |
| 8 Release | Done 2026-11-12. `v0.7.0` is live. `verify-cdn` passes, the SHA256SUMS and attestations check out. `kaltura/a2ui` serves `v3` (PR 7) with the same bytes and CORS `*`. The demo is hosted on Pages (PR 64) |

### Showcase deliverables (2026-11-12)

| # | State |
|---|---|
| H1 | Done: https://kaltura.github.io/kaltura-a2ui-components/ and a GIF in the README |
| H2 | Done: [`samples/adk-agent/`](https://github.com/kaltura/a2ui/tree/main/samples/adk-agent) and `scripts/sdk-check.py` in `kaltura/a2ui` (PRs 10 and 11, with an A2A server), both run in CI |
| H3 | Open: upstream PR a2ui-project/a2ui#4208 |
| H4 | Done: upstream Show and tell post, discussion 4207 |
| H6 | Drafted 2026-11-12: needs the owner's go to post |
| 0.7.1 | Released 2026-11-12. Attests `common_types.json`. The v3 catalog on `kaltura.github.io/a2ui` is the 0.7.1 asset |
| 0.7.2 | Released 2026-11-12. Fixes three accessibility bugs a real-model run found (flashcards controls, Slider name, error tokens). The v3 catalog on `kaltura.github.io/a2ui` is the 0.7.2 asset |
| 0.7.3 | Released 2026-11-13. Renames the player wrapper class to `kaltura-a2ui-player`: the Kaltura Player styles `kaltura-player-container`, which turned our wrapper black once a video played. Found by a live run with the Haiku 5.5 demo. The v3 catalog on `kaltura.github.io/a2ui` is the 0.7.3 asset |
