# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.4.x | Yes, from its first release |
| 0.3.x | Yes, until 0.4.0 is released |
| 0.2.x and older | No. Upgrade with [docs/migration-0.3.md](docs/migration-0.3.md) and [docs/migration-0.4.md](docs/migration-0.4.md) |

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
| Kaltura services | The Analytics page in its iframe, the Player script, the Captions editor page, the Express Recorder script and the Unisphere modules. All but Analytics run in your page origin | |

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
- The KS is not in the script or iframe URL of the Player, flashcard clips, recorder, Analytics or Unisphere widgets. The Player, flashcard clips, Captions editor and recorder get it in JavaScript and run in your page origin ([ADR 0008](docs/adr/0008-in-page-player-and-captions-editor.md)). The Captions editor's own player requests a `playManifest` URL with the KS in its path, so redact CSP reports ([host-integration.md](docs/host-integration.md#rollout)).
- Remote Kaltura code: the recorder is pinned to `/apps/expressrecorder/v2.2.10/` and the Captions editor to `/apps/captionstudio/v1.3.10/`. The editor also gets `integrity` on its page (`embed.php`), `main.js` and `main.css`. The recorder has no SRI yet, because Kaltura sends no CORS header for it. The Player version is the uiConf the customer admin picks in KMC. Pins cover the first hop only. SRI is out of scope while all remote code comes from Kaltura ([host-integration.md](docs/host-integration.md#remote-code-from-kaltura)). The Unisphere runtime list can change, and WebKit does not enforce import-map integrity: you trust Kaltura there.
- The Captions editor frame is a same-origin blob frame, so your page's Permissions-Policy decides what it may use. Send `camera=(), microphone=(), display-capture=()` if it must not ask for them. The recorder is a script in your page. It asks the browser for camera and microphone itself.
- CSV downloads neutralise spreadsheet formulas.

Which finding each control answers, and which test proves it: [docs/security/SECF-30837.md](docs/security/SECF-30837.md).

## Content Security Policy

[docs/host-integration.md](docs/host-integration.md#content-security-policy) has a starting policy. `e2e/csp.spec.ts` runs the Chart, Flashcards, the Player, recorder and avatar loader (stubbed) and the captions editor page under that exact text, and checks that a script, a media URL and a worker from unlisted places are blocked. Each widget needs only some of its hosts: check every reported host against the per-widget table, and roll out in report-only mode first ([Rollout](docs/host-integration.md#rollout)). Do not add a host just because the browser reported it. `'unsafe-inline'` needs your security team's approval. Trusted Types are not supported. Send `frame-ancestors` as a header.

A CSP is a second layer. It does not make agent output trusted.

## Releases

Releases come only from [`release.yml`](.github/workflows/release.yml) on `main`. jsDelivr serves each release from its git tag. There is no npm package: a package on npm with this name is not ours. Each GitHub Release has SRI hashes, `SHA256SUMS`, an SBOM and a GitHub build provenance attestation ([docs/release.md](docs/release.md), [ADR 0004](docs/adr/0004-npm-first-distribution.md)).

Verify a release before you use it ([docs/verify-release.md](docs/verify-release.md)):

- Pin the full tag (`@v0.3.0`) in the jsDelivr URL and set the `integrity` value from the Release notes, with `crossorigin="anonymous"`.
- Check a downloaded file with `gh attestation verify <file> --repo kaltura/kaltura-a2ui-components`.
