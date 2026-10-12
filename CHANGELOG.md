# Changelog

Newest first. Versions 0.1.5 and 0.1.6 are not tagged: they group the security fixes (Phase 1) and the robustness fixes (Phase 2) of the hardening work for SECF-30837. The last release is v0.1.4. If the work ships as one release, read 0.1.5, 0.1.6 and Unreleased as that release. How each finding is closed and tested: [docs/security/SECF-30837.md](docs/security/SECF-30837.md). Upgrade steps: [docs/migration-0.2.md](docs/migration-0.2.md).

## Unreleased (planned 0.2.0)

Install contract, host API, release pipeline and docs. Breaking for hosts that rely on the old bundled libraries or the old CDN path.

### Changed

- **Shared libraries are peers (install contract change).** `kaltura-react.mjs` no longer bundles `@a2ui/react`, `@a2ui/web_core` or `zod`. Install them next to the package: `@a2ui/react ^0.11.1`, `@a2ui/web_core ^0.11.0` and `zod ^3.25.76`, plus `react` and `react-dom`. The host now has one copy of each, so its `Catalog` class, React context and zod match ours (before, `kalturaReactCatalog instanceof Catalog` was `false` in the host). npm 7+ installs missing peers and stops with `ERESOLVE` on a conflicting version. The ESM drops from 202 kB to 162.46 kB gzip (`npm run size`). The `kaltura-wc.js` script-tag bundle is unchanged and still self-contained.
- **`@a2ui/markdown-it` and DOMPurify stay inlined in the ESM.** `@a2ui/markdown-it` 0.1.2 pins DOMPurify 3.4.11, which has published advisories. Inlined, our own sanitiser runs on 3.4.17. This does not change the host's tree: `@a2ui/react` 0.11.1, a required peer, already brings in 3.4.11. Add a `dompurify` override (`^3.4.17`), see [docs/host-integration.md](docs/host-integration.md#dompurify-override). Revisit when upstream raises the pin. Making it external would save about 62 kB gzip.
- **Source maps** keep their mappings but no longer embed `sourcesContent`.
- **`exports["./catalog"]`** is a condition object (`default`). The `package.json` description matches the package.
- **README** has the current peers, a plain-HTML example that runs, one `MessageProcessor` snippet, the tag names and a link to the host guide. `npm run check:examples` runs its code in a browser.
- **Catalog and `.gitignore` comments** describe the `release.yml` and npm flow, not the old committed `dist/`.
- **The bundle size budget** for `kaltura-react.mjs` is 164 kB gzip (was 218 kB).

### Added

- `buildCaptionsEditorUrl` is exported from the package entry, like the other URL builders.
- **Conformance suite** in `test/conformance/`: the catalog is validated against the A2UI meta-schema, message-stream fixtures run all 12 components through the real `MessageProcessor`, the catalog props must equal what the zod schemas generate, the Kaltura guide tables are fixtures, and a public API snapshot fails on any export change (`UPDATE_API_SNAPSHOT=1` updates it). Tests run on the lowest allowed `@a2ui/react` and `@a2ui/web_core` versions.
- **`npm run gen:catalog`** checks that the catalog JSON matches the zod schemas. `-- --write` rewrites it. Structure comes from zod, prose stays by hand ([ADR 0006](docs/adr/0006-catalog-generation.md)).
- **`examples/`**: plain HTML and React pages that run against `dist/`. `npm run check:examples` builds them and the README snippets, then runs them in Chromium.
- **Docs:** [host-integration.md](docs/host-integration.md) (host functions, KS, origins, region, media URLs, errors, CSP), [ks-privileges.md](docs/ks-privileges.md) (per widget, checked against the Kaltura guides), [host-api.md](docs/host-api.md), [migration-0.2.md](docs/migration-0.2.md) and [CONTRIBUTING.md](CONTRIBUTING.md). The PR template has a security checklist.
- **[SECURITY.md](SECURITY.md)**: private reporting, the trust model and a CSP recommendation. `e2e/csp.spec.ts` runs Chart, Flashcards and Player under that exact policy and checks that a script from an unlisted host is blocked.
- **[ADRs](docs/adr/README.md) 0001 to 0004 and 0006** (accepted, 2026-10-12): `serverUrl` allowlist, KS handling, peer dependencies, npm-first distribution and catalog generation. 0005 (Analytics and recorder integration) is proposed.

### Release pipeline

- **`release.yml` replaces `build-and-release.yml`.** A `v*` tag must point at a commit on `main`. CI and e2e run again on the tag. The build job is read-only and runs `npm ci --ignore-scripts`. `dist/` is never committed and tags are never moved: the catalog is stamped (CDN URL and SRI) in the build workspace only.
- **npm trusted publishing.** Only the `publish` job has `id-token: write`. It runs in the `release` environment, takes the built tarball and uses `--provenance`. There is no `NPM_TOKEN`. Prerelease tags publish under `next`. Setup steps are in [docs/release.md](docs/release.md).
- **Catalog URLs use the npm path:** `cdn.jsdelivr.net/npm/@kaltura/a2ui-react@<version>/dist/...`. Old tags keep the `gh` path.
- **The release is checked against the CDN.** The registry integrity and the jsDelivr bytes must equal the build hashes (sha384 SRI) before the GitHub Release is created. The Release carries `dist.tar.gz`, the tarball, `hashes.json`, `SHA256SUMS` and a CycloneDX SBOM.
- **Fallback.** If the repo variable `NPM_PUBLISH` is not `true`, npm publish and the CDN check are skipped and the catalog gets the `gh` path.
- **`nightly-live.yml`** checks the live jsDelivr bundle and the Unisphere loader endpoints once a day. It is read-only and opens no issues.
- **All actions are pinned by commit SHA.** CI fails if `dist/` is tracked. `ci.yml` can be called from other workflows.
- New npm scripts: `release:check`, `release:stamp`, `release:hashes`, `release:verify`, `release:smoke`.

### Host API

- **Basic Image, Video and AudioPlayer load only safe URLs.** In `buildKalturaCatalog` and `kalturaReactCatalog` the `url` must be `https` on a Kaltura host or an origin from the new `setExtraMediaOrigins`, and must not point at the API or carry a `ks`. Bound and `formatString` values are checked after they resolve. Otherwise nothing renders. The `ks` check goes by name, so keep the KS out of the data model. See [docs/host-api.md](docs/host-api.md).
- **Basic Text markdown shows only allowed images.** The Kaltura catalog runs the output of the host's `MarkdownContext` renderer through the package sanitiser. Images follow the basic Image URL rules. Flashcards markdown follows the same rules, so `setExtraMediaOrigins` origins now load there too.
- **Importing the package guards the shared `basicCatalog` in place.** 0.1.x told hosts to register `basicCatalog` next to the Kaltura catalog, and an agent could pick it by id. Its Image, Video, AudioPlayer and Text now carry the same checks. A catalog the host builds from the raw basic exports is not guarded. Register the Kaltura catalog only.
- **`setRegion(code)`** picks the Kaltura region (`nvp1`, `irp2`, `frp2`, `cap2`, `syp2`). It changes the captions editor `serviceurl` and the flashcard thumbnail host. The player, clip, analytics and recorder hosts stay on the US hosts until regional hosts are confirmed. US URLs are unchanged.
- **`setErrorHandler(fn)`** gets `{ code, widget, message }` for each error state. Codes: `invalid-props`, `invalid-ks`, `origin-not-allowed`, `load-failed`, `url-rejected`, `render-failed`. `message` never holds a prop value, the KS or a remote error text.
- **`setEventHandler(fn)`** gets `entry-selected` from Media Manager with the same `detail` as the DOM event, which still fires.
- **`UnisphereWidgetCore` has an optional `widget` prop** (default `unisphere`) that names the widget in error reports.
- **Internal signature changes.** `renderLoadError` and `withValidatedProps` take a widget name as their last argument. `LoadError` takes a `widget` prop and a string child.
- The web component bundle has no `setExtraMediaOrigins`, since it has no basic media components.

## 0.1.6 (not tagged): robustness

Phase 2. Components follow their props, clean up after themselves and match the catalog.

### Changed

- **Catalog and schemas match.** A test diffs the zod keys and the catalog properties for all 12 components. The catalog now lists Player `entryName` and `entryDescription`, Flashcards `partnerId`, `uiconfId` and `ks` (catalog-valid Flashcards payloads no longer fail, so clips render) and Media Manager `multiSelect`. The Media Manager `mode` default is `select` and `theme` has no fixed default.
- **Removed props that did nothing.** Media Manager `contextType` and `userId`, and Recorder `category`, `entryName`, `allowScreen` and `allowCamera`, are gone from the schemas and the catalog. The components never read them.
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

## 0.1.5 (not tagged): security fixes

Phase 1. Mostly behaviour fixes. Each fix has a regression test named after its finding ID.

### Security

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

### Changed

- **Web components validate config.** Props go through the same schema as the A2UI path. Invalid values show a plain-text error with `role="alert"`.
- **Missing required props.** In React, a required top-level prop that is still `undefined` renders nothing until it arrives. A web component shows the plain-text alert for a missing required value, and renders again when `el.config` is set. Nested invalid data (one bad flashcard clip) shows an alert or the per-clip message, never a silent blank.
- **`ks` is optional in the schemas** and removed from the `required` lists in the catalog. Hosts supply it with `setKsProvider`.
- **Numeric-string ids are rejected.** `partnerId: "123"` is invalid. Use a number. Ids, `ks`, urls, `serverUrl` and enums stay strict.
- **Schemas are less strict where the components cope.** Chart annotation `x` accepts a string or a number. Flashcard clip `entryId` is checked per clip, so one bad clip shows "This clip cannot be shown." and the rest of the deck works.
- **`openUrl` is https-only.** Absolute `https:` URLs only.
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

### Added

- `setKsProvider(provider)` for the host to supply the Kaltura Session. The provider receives the widget name as its argument. Agents must never set `ks`. See [docs/security/ks.md](docs/security/ks.md).
- `setExtraAllowedOrigins` for private clouds (host-set, https origins only).
