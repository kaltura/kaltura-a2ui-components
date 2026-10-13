# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| 0.1.x and older | No. Upgrade with [docs/migration-0.2.md](docs/migration-0.2.md) |

Fixes ship in a new patch release of the latest minor. A released tag never changes.

## Report a vulnerability

Report it privately: <https://github.com/kaltura/kaltura-a2ui-components/security/advisories/new> (Security tab, **Report a vulnerability**).

Do not open public issues, pull requests or discussions for vulnerabilities. Do not put exploit steps in commits, tests or docs.

## Disclosure timeline

Targets, on a best-effort basis:

| Step | Target |
|---|---|
| We confirm we got the report | 5 business days |
| We tell you if we accept it, and the severity | 15 business days |
| Fix released | 90 days after the report, sooner for high or critical |
| Public advisory (GitHub Security Advisory, with a CVE if it applies) | When the fix is released, or at 90 days if we agree on that with you |

We credit reporters in the advisory unless they ask us not to. Please keep the details private until the advisory is public.

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
- Register the Kaltura catalog alone. Importing the package guards the shared `basicCatalog` in place, so an agent that picks it by id gets the same checks. A catalog you build yourself from the raw basic components, or from a second copy of `@a2ui/web_core`, is not guarded.

What the package does on its own:

- Unisphere `serverUrl` loads only from an allowed origin ([ADR 0001](docs/adr/0001-server-url-allowlist.md)).
- Every component validates its resolved props. A bad value shows a fixed, plain-text message. It never echoes a prop value, the KS or a remote error.
- Markdown is sanitised in Flashcards and in the basic Text. The basic Text uses the renderer you put in `MarkdownContext`, then our sanitiser. Images in markdown load only from the hosts the basic Image allows. `openUrl` opens `https:` URLs only.
- The basic Image, Video and AudioPlayer load only Kaltura URLs and `setExtraMediaOrigins` origins. They refuse URLs with `api_v3`, `partnerservices2` or a `ks` parameter or path segment. This check goes by name: a KS under another name passes. The real control is that agents never get the KS, because it stays out of the data model. Hosts must not put a KS into the data model or into URLs on an extra origin.
- Player, flashcard clip and captions iframes carry no camera, microphone or display-capture permission. Only the recorder does.
- CSV downloads neutralise spreadsheet formulas.

Which finding each control answers, and which test proves it: [docs/security/internal-review.md](docs/security/internal-review.md).

## Content Security Policy

[docs/host-integration.md](docs/host-integration.md#content-security-policy) has a starting policy. `e2e/csp.spec.ts` runs the Chart, Flashcards, Player and the avatar loader (stubbed) under that exact text and checks that a script from an unlisted host is blocked. Widgets that load Kaltura-hosted code need more hosts. Add the ones the browser reports.

A CSP is a second layer. It does not make agent output trusted.

## Releases

Releases come only from [`release.yml`](.github/workflows/release.yml) on `main`. jsDelivr serves each release from its git tag. There is no npm package: a package on npm with this name is not ours. Each GitHub Release has SRI hashes, `SHA256SUMS`, an SBOM and a GitHub build provenance attestation ([docs/release.md](docs/release.md), [ADR 0004](docs/adr/0004-npm-first-distribution.md)).

Verify a release before you use it ([docs/verify-release.md](docs/verify-release.md)):

- Pin the full tag (`@v0.3.0`) in the jsDelivr URL and set the `integrity` value from the Release notes, with `crossorigin="anonymous"`.
- Check a downloaded file with `gh attestation verify <file> --repo kaltura/kaltura-a2ui-components`.
