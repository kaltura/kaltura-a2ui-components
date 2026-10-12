# Changelog

## Unreleased

### Changed

- **Web components validate config.** Props go through the same schema as the A2UI path. Invalid values show a plain-text error with `role="alert"`.
- **Missing required props.** In React, a required top-level prop that is still `undefined` renders nothing until it arrives. Web components never receive later updates, so they show the plain-text alert for a missing required value. Nested invalid data (one bad flashcard clip) shows an alert or the per-clip message, never a silent blank.
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

### Added

- `setKsProvider(provider)` for the host to supply the Kaltura Session. The provider receives the widget name as its argument. Agents must never set `ks`. See [docs/security/ks.md](docs/security/ks.md).
- `setExtraAllowedOrigins` for private clouds (host-set, https origins only).
