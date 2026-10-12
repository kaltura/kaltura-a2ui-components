# Changelog

## Unreleased

### Changed

- **Web components validate config.** Props go through the same schema as the A2UI path. Invalid values show a plain-text error with `role="alert"`.
- **Missing required props.** In React, a required top-level prop that is still `undefined` renders nothing until it arrives. A web component shows the plain-text alert for a missing required value, and renders again when `el.config` is set. Nested invalid data (one bad flashcard clip) shows an alert or the per-clip message, never a silent blank.
- **`ks` is optional in the schemas** and removed from the `required` lists in the catalog. Hosts supply it with `setKsProvider`.
- **Numeric-string ids are rejected.** `partnerId: "123"` is invalid. Use a number. Ids, `ks`, urls, `serverUrl` and enums stay strict.
- **Schemas are less strict where the components cope.** Chart annotation `x` accepts a string or a number. Flashcard clip `entryId` is checked per clip, so one bad clip shows "This clip cannot be shown." and the rest of the deck works.
- **`openUrl` is https-only.** Absolute `https:` URLs only.
- **Captions and analytics URLs** keep the pre-hardening format. Only variable values are encoded with `encodeURIComponent` (spaces become `%20`). The `buildCaptionsUrl` alias is removed.
- **Avatar** sets `crossorigin` only when an `integrity` hash is present.
- **Error states.** Chart errors use `ChartErrorBoundary` with `role="alert"`. Plain-text load errors share the `kaltura-load-error` class and one theme-safe style (light and dark). The inline colour is gone.
- **`ChartErrorBoundary` resets** when the chart type changes.
- **Numeric chart annotation `x`** is matched by its string form.
- **Flashcards** use `box-sizing: border-box`, so cards no longer overflow their container.
- **ESLint banned-pattern rules are now errors**, not warnings. They also catch `dangerouslySetInnerHTML` and `srcdoc` set through object props, computed member assignment and `setAttributeNS`.
- **Rejected `serverUrl` is never shown** in the UI or the thrown message. The console gets a warning with the value cut to 100 characters.
- **Flashcards** show the card text as plain text while markdown renders, then swap to sanitised HTML. Empty sanitised output falls back to plain text.
- **Markdown** keeps `language-*` classes on `code`. A removed non-Kaltura image leaves its alt text as plain text.
- **Catalog and schemas match.** A test diffs the zod keys and the catalog properties for all 12 components. The catalog now lists Player `entryName` and `entryDescription`, Flashcards `partnerId`, `uiconfId` and `ks` (catalog-valid Flashcards payloads no longer fail, so clips render) and Media Manager `multiSelect`. The Media Manager `mode` default is `select` and `theme` has no fixed default.
- **Removed props that did nothing.** Media Manager `contextType` and `userId`, and Recorder `category`, `entryName`, `allowScreen` and `allowCamera`, are gone from the schemas and the catalog. The components never read them.
- **`loadKalturaCatalog`** keys the catalog by the descriptor's `catalogId`, then `$id`, then the canonical id. It read `id` before, so it always returned the default.
- **Unisphere widgets and Media Manager follow their props.** A new `ks`, `serverUrl`, id or setting re-inits the widget and kills the old workspace. Unmount kills the workspace, also when the load is still running. A remote module without `loader` or `createWorkspace` shows the plain-text alert. The hard-coded `appVersion: '0.3.0'` is no longer sent.
- **`kaltura-entry-selected` is scoped.** It fires on the `<kaltura-media-manager>` element with `detail.instanceId`, and bubbles and is composed. `legacyDocumentEvents` (config, default `true`) keeps the bubble to `document` for one more release. Set it to `false` and the event bubbles up to the element only, never to `document`. Agents cannot set it: the React adapter always passes `true`. The flag and the `document` delivery are removed in the next release. `name` in the detail is untrusted text.
- **Iframe permissions.** Player, flashcards clips and the captions editor no longer allow camera, microphone or display capture. Only the recorder keeps them. Player and clip iframes have no `sandbox` attribute: any sandbox breaks downloads and Cast/Presentation. A sandbox with `allow-downloads` and `allow-presentation` is a Phase 3 item.
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

### Added

- `setKsProvider(provider)` for the host to supply the Kaltura Session. The provider receives the widget name as its argument. Agents must never set `ks`. See [docs/security/ks.md](docs/security/ks.md).
- `setExtraAllowedOrigins` for private clouds (host-set, https origins only).
