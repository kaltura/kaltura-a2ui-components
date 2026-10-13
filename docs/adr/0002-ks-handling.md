# 0002. KS handling

Status: accepted (2026-10-12)

Findings: SEC-05 (design), SEC-10 (accepted at first, resolved by [ADR 0008](0008-in-page-player-and-captions-editor.md)). Code: `src/core/ks.ts`. Details: [security/ks.md](../security/ks.md).

## Context

- The Kaltura Session Guide (https://kaltura.md/KALTURA_SESSION_GUIDE/) says: mint the KS on the server, use a USER KS (type=0) in the browser, keep it short-lived and give it least privilege. A KS in the browser is the documented model.
- The gap in this package was the path: the KS was a component prop, so it passed through the agent's output and the A2UI data model. An agent can read the data model and wire it into other components, for example an image URL.
- The player and Captions Studio guides passed the KS in the iframe URL (0.3). Analytics wants an ADMIN KS.

## Decision

- The host supplies the KS with `setKsProvider(widget => ks)`. The provider gets the widget name, so it can return a different least-privilege KS per widget.
- `ks` is optional in the schemas and the catalog. The prop stays for older hosts. A non-empty provider result wins over the prop.
- The component never mints, stores, logs or renews a KS. A bad value or a failed provider shows `Invalid ks` and never the value.
- The KS in iframe URLs (SEC-10) was accepted at first, because the guides use it. 0.4 removes it for every widget: Analytics sends it by `postMessage`, the Recorder, Player, Flashcards and Captions editor take it in JavaScript ([ADR 0005](0005-analytics-and-recorder-integration.md), [ADR 0008](0008-in-page-player-and-captions-editor.md)). Keep the expiry short, because that code runs in the page origin.
- The basic `Image`, `Video` and `AudioPlayer` refuse a URL with `api_v3`, `partnerservices2` or a `ks` parameter or path segment (see `docs/host-api.md`). The check goes by name, so a KS under another name passes. It is a second layer: the control is that the KS never enters the data model.

## Consequences

- The KS is out of LLM context as long as the host does not put it in the data model. Docs say so in a warning.
- Hosts write one function and a server endpoint. Renewal is a remount.
- Flashcards take the KS from the provider first, with the `ks` prop as fallback.
