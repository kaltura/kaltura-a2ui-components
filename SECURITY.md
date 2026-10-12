# Security policy

## Supported versions

| Version | Supported |
|---|---|
| Latest minor release | Yes |
| Older releases | No |

## Report a vulnerability

Use GitHub private vulnerability reporting for this repository: open the **Security** tab and choose **Report a vulnerability**.

Do not open public issues, pull requests or discussions for vulnerabilities. Do not put exploit steps in commits, tests or docs.

Reports are handled on a best-effort basis. There is no fixed response or fix time.

## Trust model

Agent output is untrusted input. Every A2UI message and every prop value can be hostile. The host page and your server are trusted. Kaltura services are trusted at the level of the Kaltura service.

| Who | Owns | Never does |
|---|---|---|
| Host app | The Kaltura Session (KS), the `serverUrl` allowlist, the region, the media URL list, the CSP, which catalog is registered | Puts the KS in agent output or the data model. Adds an origin it does not trust to run code in its page |
| Agent | Component types and props, within the schema | Sets the KS, an origin, a region or a handler. It cannot: those are host functions, not props |
| This package | Validating every prop before use, rendering errors as plain text, blocking unlisted origins and URLs | Mints, stores, logs or renews a KS |
| Kaltura services | The pages inside the iframes (Player, Captions editor, Recorder, Analytics) and the Unisphere modules | |

The host controls are in [docs/host-integration.md](docs/host-integration.md):

- `setKsProvider`: a server-minted, least-privilege KS per widget ([docs/ks-privileges.md](docs/ks-privileges.md), [docs/security/ks.md](docs/security/ks.md)).
- `setExtraAllowedOrigins`: Unisphere origins beyond the five Kaltura regions. Each one runs code with your page origin.
- `setExtraMediaOrigins`: hosts for the basic Image, Video and AudioPlayer.
- Register the Kaltura catalog alone. Importing the package guards the shared `basicCatalog` in place, so an agent that picks it by id gets the same checks. A catalog you build yourself from the raw basic components, or from a second copy of `@a2ui/react`, is not guarded.

What the package does on its own:

- Unisphere `serverUrl` loads only from an allowed origin ([ADR 0001](docs/adr/0001-server-url-allowlist.md)).
- Every component validates its resolved props. A bad value shows a fixed, plain-text message. It never echoes a prop value, the KS or a remote error.
- Markdown is sanitised in Flashcards and in the basic Text. The basic Text uses the renderer you put in `MarkdownContext`, then our sanitiser. Images in markdown load only from the hosts the basic Image allows. `openUrl` opens `https:` URLs only.
- The basic Image, Video and AudioPlayer load only Kaltura URLs and `setExtraMediaOrigins` origins. They refuse URLs with `api_v3`, `partnerservices2` or a `ks` parameter or path segment. This check goes by name: a KS under another name passes. The real control is that agents never get the KS, because it stays out of the data model. Hosts must not put a KS into the data model or into URLs on an extra origin.
- Player, flashcard clip and captions iframes carry no camera, microphone or display-capture permission. Only the recorder does.
- CSV downloads neutralise spreadsheet formulas.

Which finding each control answers, and which test proves it: [docs/security/SECF-30837.md](docs/security/SECF-30837.md).

## Content Security Policy

[docs/host-integration.md](docs/host-integration.md#content-security-policy) has a starting policy. `e2e/csp.spec.ts` runs the Chart, Flashcards and Player under that exact text and checks that a script from an unlisted host is blocked. Widgets that load Kaltura-hosted code need more hosts. Add the ones the browser reports.

A CSP is a second layer. It does not make agent output trusted.

## Releases

Releases come from CI on a `v*` tag from `main`, with npm provenance and SRI hashes in the GitHub Release ([docs/release.md](docs/release.md), [ADR 0004](docs/adr/0004-npm-first-distribution.md)). Pin the exact version and the SRI hash when you load from a CDN.
