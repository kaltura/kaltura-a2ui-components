# Changelog

Newest first. 0.2.0 is the first release since v0.1.4. It holds the hardening work for SECF-30837 that this file listed before as "0.1.5 (not tagged)" (Phase 1, security), "0.1.6 (not tagged)" (Phase 2, robustness) and "Unreleased" (Phase 3). How each finding is closed and tested: [docs/security/SECF-30837.md](docs/security/SECF-30837.md). Upgrade steps: [docs/migration-0.2.md](docs/migration-0.2.md). Releases up to v0.1.4: [GitHub Releases](https://github.com/kaltura/kaltura-a2ui-components/releases).

## Unreleased

### Added

- **SRI for the SSR stub in the catalog.** `x-kaltura-adapters.react` has `stubCdn` and `stubIntegrity` for `dist/html-element-stub.mjs`, which `kaltura-react.mjs` imports. Before, a client that loaded the module from the catalog had no SRI for that second file. The release stamps and checks them, and `verify-cdn` compares `stubIntegrity` with the served stub. Catalogs of 0.3.0 and older have no stub keys. See [docs/host-integration.md](docs/host-integration.md#server-imports-ssr).

### Security

- **Only maintainers create release tags.** A new tag ruleset limits creation of `v*` tags to the Admin and Maintain roles and one write deploy key. The release job pushes the tag with that key (environment secret `RELEASE_TAG_KEY`), not with the job token. Update, delete and force-push stay blocked for everyone. See [docs/release.md](docs/release.md).

## 0.3.0 - 2026-10-12

### Breaking changes for hosts

- **`KalturaAvatar` runs on the Unisphere embeds API** (`genieAvatar`). The old avatar web SDK script is gone, which closes SEC-08. New props: `partnerId` and `serverUrl` (required), `autoConnect`, `openingPhrase`, `captions` and `theme`. `avatarId`, `projectId`, `language`, `allowInterrupt` and `autoStart` are removed. The KS comes from `setKsProvider` (widget `avatar`) only. Steps: [docs/migration-0.3.md](docs/migration-0.3.md).
- **CSP:** drop `https://static.avatar.us.kaltura.ai` from `script-src`.
- **Peers move to the A2UI 0.13 line.** `@a2ui/react ^0.13.0` and `@a2ui/web_core ^0.13.0`. 0.11 is no longer supported. Steps: [docs/migration-a2ui-0.13.md](docs/migration-a2ui-0.13.md).
- **0.13 changes upstream that hosts see.** `basicCatalog` comes from `@a2ui/web_core/v0_9/basic_catalog`. The basic components are Lit custom elements, and every component renders inside an `<a2ui-react-<name>>` element (`display: contents`). The guarded basic Image, Video, AudioPlayer and Text use the tags `kaltura-a2ui-image`, `kaltura-a2ui-video`, `kaltura-a2ui-audioplayer` and `kaltura-a2ui-basic-text`. The v0.9 basic catalog drops `add`, `subtract`, `multiply`, `divide`, `equals`, `notEquals`, `greaterThan`, `lessThan`, `contains`, `startsWith` and `endsWith`.

### Added

- **Opt-in player sandbox** (SEC-14). `setPlayerSandbox(tokens)` sets a `sandbox` on player and flashcard clip iframes that mount after the call. `PLAYER_SANDBOX_PRESET` keeps playback, fullscreen, downloads, Cast/Presentation and share pop-ups, and blocks top navigation. Unknown tokens, `allow-top-navigation` and `allow-top-navigation-to-custom-protocols` throw. Both the React adapter and `window.KalturaA2UIWebComponents` have it. The default is unchanged: no sandbox. Tested against a stub player page only, not the real player, Cast, DRM or mobile. Test your players before you turn it on. See [docs/host-api.md](docs/host-api.md#player-sandbox).
- **`avatar-disconnected` event** for `setEventHandler`, with `{ reason, instanceId }`. `KalturaEvent` is now a union, so TypeScript hosts check `event.type` before they read `detail`.

### Changed

- **Regions** (REG-01). `setRegion` now maps the player, flashcard clips, analytics and recorder hosts too. The player and recorder use the regional API host (for example `https://api.eu.kaltura.com`). Analytics uses the regional KMC host (for example `https://kmc.de.kaltura.com`). Add the hosts you use to `frame-src` in your CSP. Details: [docs/host-api.md](docs/host-api.md#regions).

### Fixed

- **The ESM imports in Node** although `@a2ui/react` 0.13.0 throws `HTMLElement is not defined` there ([a2ui#3158](https://github.com/a2ui-project/a2ui/issues/3158)). A one-file stub runs first and is removed after the imports. In Node, import `@kaltura/a2ui-react` before `@a2ui/react`. See [ADR 0007](docs/adr/0007-ssr-html-element-stub.md).

### Security

- The basic Image, Video, AudioPlayer and Text guards work on the 0.13 Lit elements: same URL rules, same markdown filter, also for a renderer from a Lit context provider.
- A basic Button `openUrl` action now runs in the browser (0.13). It goes through the package's safe `openUrl`.
- `@a2ui/markdown-it` 0.2.1 still pins `dompurify` 3.4.11. Keep the host override.
- `kaltura-react.mjs` imports a second file, `dist/html-element-stub.mjs`. It is in `hashes.json`, the Release notes and the build provenance attestation.

## 0.2.0 - 2026-10-12

Security and robustness release. Components check every prop and URL, follow prop changes and clean up after themselves. Shared libraries are now peers. **Distribution is jsDelivr only**, from the git tag `v0.2.0`. The package is not on npm. Each release has SRI hashes, an SBOM and a build provenance attestation. Hosts must change their install line or script URL: see [Breaking changes for hosts](#breaking-changes-for-hosts).

### Security

Phase 1 fixes. Each one has a regression test named after its finding ID.

- **Unisphere `serverUrl` allowlist** (SEC-01). `serverUrl` must be `https` on `unisphere.{nvp1,irp2,frp2,cap2,syp2}.ovp.kaltura.com`. The loader URL is rebuilt from the origin, and there is one `import()` site for all Unisphere widgets. Anything else throws before an import. See [ADR 0001](docs/adr/0001-server-url-allowlist.md).
- **Load errors are plain text** (SEC-06). Media Manager, the Unisphere widgets and the avatar share one helper that uses `textContent`.
- **Flashcards** (SEC-04, SEC-11, SEC-12). Markdown is sanitised before render. Entry ids are checked, `partnerId` and `uiconfId` must be positive integers, and a clip thumbnail must come from a Kaltura CDN host.
- **Markdown images** (SEC-05). An `<img>` loads only from Kaltura hosts.
- **Recorder** (SEC-03). The iframe is built with DOM APIs, and the ids must be positive integers.
- **Runtime prop validation** (SEC-03, SEC-07). Every component checks its resolved props with the zod schema. A bad value shows a plain-text error and never the widget.
- **Captions, analytics and player URLs** (SEC-07). Ids are validated and values encoded.
- **Avatar** (SEC-08). The SDK script loads once per URL, a failed tag is removed, and errors are plain text. The SDK version pin and SRI hash are not done: the versioned SDK URL returns 404 (vendor-blocked).
- **`ks` in the catalog** (SEC-05). `ks` can be a bound value, and the descriptions say that the host supplies it and agents never write it.
- **Dependencies** (SEC-02, SEC-23). `@a2ui/react` 0.9.1 to 0.11.1, `@a2ui/web_core` 0.9.2 to 0.11.0, `@a2ui/markdown-it` 0.0.3 to 0.1.2. `overrides` pin `dompurify` ^3.4.17, `markdown-it` and `linkify-it`. `npm audit --omit=dev` reports 0.
- **Web component bundle boots on a bare page** (E2E-01). `process.env.NODE_ENV` is defined at build time.
- **Basic media URLs and markdown images are checked** in the Kaltura catalog and in the shared `basicCatalog`. Details under [Breaking changes for hosts](#breaking-changes-for-hosts).
- **No npm package.** `package.json` is `"private": true`, so `npm publish` refuses to run. A package on npm under the same name is not from this project.

### Breaking changes for hosts

- **Install from the git tag or load from jsDelivr.** ESM: `npm i github:kaltura/kaltura-a2ui-components#v0.2.0` plus the peers. Script tag: `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/dist/kaltura-wc.js` with the SRI hash from the Release. Catalog: `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/src/catalog/kaltura_catalog.json`. The import name stays `@kaltura/a2ui-react`.
- **Catalog adapters:** `x-kaltura-adapters.react.npm` is replaced by `react.install`, the install line for the tag.
- **Shared libraries are peers (install contract change).** `kaltura-react.mjs` no longer bundles `@a2ui/react`, `@a2ui/web_core` or `zod`. Install them next to the package: `@a2ui/react ^0.11.1`, `@a2ui/web_core ^0.11.0` and `zod ^3.25.76`, plus `react` and `react-dom`. The host now has one copy of each, so its `Catalog` class, React context and zod match ours (before, `kalturaReactCatalog instanceof Catalog` was `false` in the host). npm 7+ installs missing peers and stops with `ERESOLVE` on a conflicting version. The ESM drops from 202 kB to 162.46 kB gzip (`npm run size`). The `kaltura-wc.js` script-tag bundle is unchanged and still self-contained.
- **Basic Image, Video and AudioPlayer load only safe URLs.** In `buildKalturaCatalog` and `kalturaReactCatalog` the `url` must be `https` on a Kaltura host or an origin from the new `setExtraMediaOrigins`, and must not point at the API or carry a `ks`. Bound and `formatString` values are checked after they resolve. Otherwise nothing renders. The `ks` check goes by name, so keep the KS out of the data model. See [docs/host-api.md](docs/host-api.md).
- **Basic Text markdown shows only allowed images.** The Kaltura catalog runs the output of the host's `MarkdownContext` renderer through the package sanitiser. Images follow the basic Image URL rules. Flashcards markdown follows the same rules, so `setExtraMediaOrigins` origins now load there too.
- **Importing the package guards the shared `basicCatalog` in place.** 0.1.x told hosts to register `basicCatalog` next to the Kaltura catalog, and an agent could pick it by id. Its Image, Video, AudioPlayer and Text now carry the same checks. A catalog the host builds from the raw basic exports is not guarded. Register the Kaltura catalog only.
- **Numeric-string ids are rejected.** `partnerId: "123"` is invalid. Use a number. Ids, `ks`, urls, `serverUrl` and enums stay strict.
- **`openUrl` is https-only.** Absolute `https:` URLs only.
- **Removed props that did nothing.** Media Manager `contextType` and `userId`, and Recorder `category`, `entryName`, `allowScreen` and `allowCamera`, are gone from the schemas and the catalog. The components never read them.

### Added

- `buildCaptionsEditorUrl` is exported from the package entry, like the other URL builders.
- **Conformance suite** in `test/conformance/`: the catalog is validated against the A2UI meta-schema, message-stream fixtures run all 12 components through the real `MessageProcessor`, the catalog props must equal what the zod schemas generate, the Kaltura guide tables are fixtures, and a public API snapshot fails on any export change (`UPDATE_API_SNAPSHOT=1` updates it). Tests run on the lowest allowed `@a2ui/react` and `@a2ui/web_core` versions.
- **`npm run gen:catalog`** checks that the catalog JSON matches the zod schemas. `-- --write` rewrites it. Structure comes from zod, prose stays by hand ([ADR 0006](docs/adr/0006-catalog-generation.md)).
- **`examples/`**: plain HTML and React pages that run against `dist/`. `npm run check:examples` builds them and the README snippets, then runs them in Chromium.
- **Docs:** [host-integration.md](docs/host-integration.md) (host functions, KS, origins, region, media URLs, errors, CSP), [ks-privileges.md](docs/ks-privileges.md) (per widget, checked against the Kaltura guides), [host-api.md](docs/host-api.md), [migration-0.2.md](docs/migration-0.2.md) and [CONTRIBUTING.md](CONTRIBUTING.md). The PR template has a security checklist.
- **[SECURITY.md](SECURITY.md)**: private reporting, the trust model and a CSP recommendation. `e2e/csp.spec.ts` runs Chart, Flashcards and Player under that exact policy and checks that a script from an unlisted host is blocked.
- **[ADRs](docs/adr/README.md) 0001 to 0004 and 0006** (accepted, 2026-10-12): `serverUrl` allowlist, KS handling, peer dependencies, distribution (0004, revised the same day: jsDelivr only, no npm) and catalog generation. 0005 (Analytics and recorder integration) is proposed.
- **[docs/verify-release.md](docs/verify-release.md)**: check a release with the SRI hash, `gh attestation verify` and `SHA256SUMS`.
- `setKsProvider(provider)` for the host to supply the Kaltura Session. The provider receives the widget name as its argument. Agents must never set `ks`. See [docs/security/ks.md](docs/security/ks.md).
- `setExtraAllowedOrigins` for private clouds (host-set, https origins only).
- **`setRegion(code)`** picks the Kaltura region (`nvp1`, `irp2`, `frp2`, `cap2`, `syp2`). It changes the captions editor `serviceurl` and the flashcard thumbnail host. The player, clip, analytics and recorder hosts stay on the US hosts until regional hosts are confirmed. US URLs are unchanged.
- **`setErrorHandler(fn)`** gets `{ code, widget, message }` for each error state. Codes: `invalid-props`, `invalid-ks`, `origin-not-allowed`, `load-failed`, `url-rejected`, `render-failed`. `message` never holds a prop value, the KS or a remote error text.
- **`setEventHandler(fn)`** gets `entry-selected` from Media Manager with the same `detail` as the DOM event, which still fires.
- **`UnisphereWidgetCore` has an optional `widget` prop** (default `unisphere`) that names the widget in error reports.
- The web component bundle has no `setExtraMediaOrigins`, since it has no basic media components.

### Changed

Install contract and docs (Phase 3):

- **`@a2ui/markdown-it` and DOMPurify stay inlined in the ESM.** `@a2ui/markdown-it` 0.1.2 pins DOMPurify 3.4.11, which has published advisories. Inlined, our own sanitiser runs on 3.4.17. This does not change the host's tree: `@a2ui/react` 0.11.1, a required peer, already brings in 3.4.11. Add a `dompurify` override (`^3.4.17`), see [docs/host-integration.md](docs/host-integration.md#dompurify-override). Revisit when upstream raises the pin. Making it external would save about 62 kB gzip.
- **Source maps** keep their mappings but no longer embed `sourcesContent`.
- **`exports["./catalog"]`** is a condition object (`default`). The `package.json` description matches the package.
- **README** has the current peers, a plain-HTML example that runs, one `MessageProcessor` snippet, the tag names and a link to the host guide. `npm run check:examples` runs its code in a browser.
- **Catalog and `.gitignore` comments** describe the `release.yml` flow: `dist/` and the stamped catalog are committed only in the release commit a tag points to, never on `main`.
- **The bundle size budget** for `kaltura-react.mjs` is 164 kB gzip (was 218 kB).
- **Internal signature changes.** `renderLoadError` and `withValidatedProps` take a widget name as their last argument. `LoadError` takes a `widget` prop and a string child.

Robustness (Phase 2):

- **Catalog and schemas match.** A test diffs the zod keys and the catalog properties for all 12 components. The catalog now lists Player `entryName` and `entryDescription`, Flashcards `partnerId`, `uiconfId` and `ks` (catalog-valid Flashcards payloads no longer fail, so clips render) and Media Manager `multiSelect`. The Media Manager `mode` default is `select` and `theme` has no fixed default.
- **`loadKalturaCatalog`** keys the catalog by the descriptor's `catalogId`, then `$id`, then the canonical id. It read `id` before, so it always returned the default.
- **Unisphere widgets and Media Manager follow their props.** A new `ks`, `serverUrl`, id or setting re-inits the widget and kills the old workspace. Unmount kills the workspace, also when the load is still running. A remote module without `loader` or `createWorkspace` shows the plain-text alert. The hard-coded `appVersion: '0.3.0'` is no longer sent.
- **`kaltura-entry-selected` is scoped.** It fires on the `<kaltura-media-manager>` element with `detail.instanceId`, and bubbles and is composed. `legacyDocumentEvents` (config, default `true`) keeps the bubble to `document` for one more release. Set it to `false` and the event bubbles up to the element only, never to `document`. Agents cannot set it: the React adapter always passes `true`. The flag and the `document` delivery are removed in the next release. `name` in the detail is untrusted text.
- **Iframe permissions.** Player, flashcards clips and the captions editor no longer allow camera, microphone or display capture. Only the recorder keeps them. Player and clip iframes have no `sandbox` attribute: any sandbox breaks downloads and Cast/Presentation. A sandbox with `allow-downloads` and `allow-presentation` is not added yet.
- **Styles use internal `--kaltura-*` tokens.** The old `--x: var(--x, fallback)` rules were self-referencing, so neither the fallback nor the host value applied. The host variables (`--ds-*`, `--surface-*`, `--page-text*`, `--border-*`) now take effect on the component or any ancestor.
- **Styles are readable on any page.** With no host tokens, surfaces are transparent, text inherits the page colour and borders are neutral grey. Under `data-theme="dark"` the old dark values are the fallback. Before, text defaulted to `#f0f0f0`, which failed contrast on a light page. The chart tooltip is portalled to `<body>`, so it reads the host tokens directly and always has an opaque surface. The source data row count no longer uses opacity.
- **Unisphere containers get their tokens.** The CSS targeted `.kaltura-genie-container`, but the class is `.kaltura-kaltura-genie-container` (same for content lab, agents and VOD avatar), so border, background and radius were lost. The dead selectors are gone.
- **Charts show at most 500 rows.** Longer `data` is cut and a "Showing first 500 of N rows." note appears under the chart. The source data table and CSV still list every row (the table shows the first 100).
- **Chart error boundary resets on new `data`**, not only on a new chart type. The source data table has its own boundary, so a table error no longer hides the chart.
- **Chart keys are unique.** Duplicate labels (pie, funnel, treemap, word cloud) and repeated `yKeys` no longer share a React key.
- **Geo map country matching is exact.** A data key matches a country by its normalised name or its ISO code (names such as "South Sudan" and "Dem. Rep. Congo" are in the alias table). The substring fallback is gone, so "niger" no longer colours Nigeria and "sudan" no longer colours South Sudan. Rows for unknown names are ignored.
- **Geo map data is pinned** to `world-atlas@2.0.2` on jsDelivr (was `@2`). A non-OK response shows an empty map. The result is cached for the page, a failed load is retried on the next mount, and the request is aborted on unmount. The legend gradient id is unique per map, and any CSS colour works for `colors[0]`.
- **CSV download neutralises formulas.** A text cell or header that starts with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`, also after leading whitespace and for the fullwidth forms of `=`, `+`, `-` and `@`. A cell with a comma, quote, semicolon, CR or LF is quoted. Numbers keep their sign.
- **Web components follow `config`.** Setting `el.config` at any time re-renders, so a late config replaces the missing-prop alert with the widget. The first render still shows the alert when a required prop is missing. Removing an element unmounts its React root one microtask later, and only if it is still disconnected, so moving an element keeps its widget and a React host that removes it logs no warning. Adding it again mounts a new root. A `config` that is not an object (text, number, array) shows the plain-text alert. The first render runs in a microtask, not inside `connectedCallback`. All 12 elements share one `defineKalturaElement` helper. Tags and the `config` property are unchanged.

Behaviour (Phase 1):

- **Web components validate config.** Props go through the same schema as the A2UI path. Invalid values show a plain-text error with `role="alert"`.
- **Missing required props.** In React, a required top-level prop that is still `undefined` renders nothing until it arrives. A web component shows the plain-text alert for a missing required value, and renders again when `el.config` is set. Nested invalid data (one bad flashcard clip) shows an alert or the per-clip message, never a silent blank.
- **`ks` is optional in the schemas** and removed from the `required` lists in the catalog. Hosts supply it with `setKsProvider`.
- **Schemas are less strict where the components cope.** Chart annotation `x` accepts a string or a number. Flashcard clip `entryId` is checked per clip, so one bad clip shows "This clip cannot be shown." and the rest of the deck works.
- **Captions and analytics URLs** keep the pre-hardening format. Only variable values are encoded with `encodeURIComponent` (spaces become `%20`).
- **Avatar** sets `crossorigin` only when an `integrity` hash is present.
- **Error states.** Chart errors use `ChartErrorBoundary` with `role="alert"`. Plain-text load errors share the `kaltura-load-error` class and one theme-safe style (light and dark). The inline colour is gone.
- **`ChartErrorBoundary` resets** when the chart type changes.
- **Numeric chart annotation `x`** is matched by its string form.
- **Flashcards** use `box-sizing: border-box`, so cards no longer overflow their container.
- **ESLint banned-pattern rules are now errors**, not warnings. They also catch `dangerouslySetInnerHTML` and `srcdoc` set through object props, computed member assignment and `setAttributeNS`.
- **Rejected `serverUrl` is never shown** in the UI or the thrown message. The console gets a warning with the value cut to 100 characters.
- **Flashcards** show the card text as plain text while markdown renders, then swap to sanitised HTML. Empty sanitised output falls back to plain text.
- **Markdown** keeps `language-*` classes on `code`. A removed non-Kaltura image leaves its alt text as plain text.
- **Package manifest.** `LICENSE` file (AGPL-3.0-only), `sideEffects`, `engines.node >=22.12.0`, a `types` condition on `./webcomponent`, a `./package.json` export, stable `@visx/*` ranges and a description that lists all 12 components.

### Dependencies

- **Chart libraries are `devDependencies`.** `@visx/*` and `topojson-client` are inlined in both bundles, so the package has no runtime `dependencies`. A host install of the tarball plus peers drops from 111 to 27 packages. `check:consumer` fails if a bundle or a reachable `.d.ts` imports a package that is not a dependency or a peer.
- **CI audit covers the full tree** (`npm audit --audit-level=high`). The libraries inlined in the bundles (DOMPurify, markdown-it, `@a2ui/*`) are dev-only in the lockfile, so `--omit=dev` checked none of them.
- **`@react-spring/web` stays out of `peerDependencies`.** `@visx/xychart` asks for it, but no bundle contains or imports it (the animated parts are tree-shaken out).
- **Tooling:** vitest and `@vitest/coverage-v8` 4.1.11 to 5.0.4, `vite-plugin-css-injected-by-js` 3.5.2 to 5.0.2 and, through `npm update`, `typescript-eslint` 8.71.1 to 8.71.2 and `postcss` 8.5.29 to 8.5.30. Bundle output is the same apart from one moved newline in the injected CSS.
- **Not upgraded:** `@a2ui/*` 0.13 (see [Not done and known limits](#not-done-and-known-limits)). TypeScript 7 (`typescript-eslint` 8.71.2 supports `<6.1.0` and stops with "does not support TS 7.0", and TS 7 has no compiler API for the API snapshot test). jsdom 30 needs Node `^24.15.0`. CI resolves `.nvmrc` 24 to 24.21.0, but it was not gated on a local Node 24.13. zod 4 (`@a2ui/*` 0.11 and 0.13 need zod `^3.25.76`). `@types/node` 26 (Node 24 is the supported runtime).
- **CI:** unit tests run on Node 24 (required) and Node 26 (not required). The check names are now `unit tests (node 24)` and `unit tests (node 26)`. Update the branch rules, see [docs/release.md](docs/release.md#required-checks).

### Release pipeline

- **`release.yml` replaces `build-and-release.yml`.** It runs by hand from `main` with a `version` input and `dry_run` (on by default). It checks that the run is on the head of `main`, the version equals `package.json`, `CHANGELOG.md` has a dated section and the tag does not exist yet. CI and e2e run again. The build job is read-only and runs `npm ci --ignore-scripts`. Steps: [docs/release.md](docs/release.md).
- **Release commit.** `dist/` stays out of `main`. The `release` job (environment `release`) adds the CI-built `dist/` and the stamped catalog (tag URLs and SRI) in one commit on top of the `main` commit, tags it and pushes only the tag. The commit is on no branch. Tags never move: a tag ruleset blocks updates and deletion.
- **jsDelivr serves the tag.** After the push, `verify-cdn` fetches both bundles and the catalog from `cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@<tag>` and compares the bytes (sha384 SRI) with the build. The run fails on a mismatch.
- **The GitHub Release** carries `dist.tar.gz`, `kaltura_catalog.json`, `hashes.json`, `SHA256SUMS` and a CycloneDX SBOM. Its notes are this CHANGELOG section plus the install lines and SRI hashes. A prerelease version (`X.Y.Z-rc.1`) makes a prerelease Release that is never marked Latest. The bundles, the catalog and `dist.tar.gz` have a GitHub build provenance attestation.
- **No npm.** The npm trusted publishing planned earlier was dropped: no `publish` job, no `NPM_PUBLISH` variable, no registry check. [ADR 0004](docs/adr/0004-npm-first-distribution.md) records the decision.
- **`nightly-live.yml`** checks once a day that jsDelivr still serves the bytes listed in the latest Release's `hashes.json`, and that the Unisphere loader endpoints answer. It is read-only and opens no issues. Until a Release has `hashes.json`, it prints a notice and passes.
- **All actions are pinned by commit SHA.** CI fails if `dist/` is tracked. `ci.yml` and `e2e.yml` can be called from other workflows.
- New npm scripts: `release:check`, `release:stamp`, `release:hashes`, `release:notes`, `release:verify`, `release:smoke`.
- **`CODEOWNERS`** names `@zoharbabin`.

### Not done and known limits

- **`@a2ui/*` 0.13 is blocked.** `@a2ui/react` 0.13.0 throws `HTMLElement is not defined` when imported in Node, which breaks server-rendered hosts. This release stays on 0.11 until upstream fixes it.
- **Avatar SDK** has no version pin and no SRI hash: the versioned SDK URL returns 404 (vendor-blocked).
- **Player and clip iframes have no `sandbox`**: any sandbox breaks downloads and Cast/Presentation.
- **Regions:** `setRegion` moves the captions editor and flashcard thumbnails only. Player, clip, analytics and recorder stay on the US hosts until regional hosts are confirmed.
- **`legacyDocumentEvents`** and the `document` delivery of `kaltura-entry-selected` are removed in the next release.
- **The README script tag has no `integrity` value**, since the hash exists only after the CI build. Copy the full tag from the Release notes.
- **Distribution is jsDelivr only.** There is no npm package and no other CDN. A host that needs its own copy can download `dist.tar.gz` from the Release and check it against `SHA256SUMS`.
