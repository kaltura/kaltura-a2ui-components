# Migrate from 0.4.x to 0.5.0

0.5.0 gives `setKsProvider` a second argument: the scope of one widget instance. No call site breaks. Hosts that ignore the argument keep working.

## What to do

| # | Who | Do |
|---|---|---|
| 1 | Hosts with a provider | Optional. Read `request.scope` to mint a KS for one entry or category: [The request](security/ks.md#the-request) |
| 2 | Hosts that mint from an endpoint | If you use the request, check every id on your server. Reject unknown `version` and unknown scope keys |
| 3 | Agent authors | `categoryId` and `contextId` are digits only, up to 12. `cards` in Flashcards holds at most 20 clip entries for the KS scope |

## What changed

- **Provider signature.** `(widget, request)`. The type is `KsProvider`. A one-argument provider `(widget) => ks` and a `() => ks` provider stay type-compatible. New type exports: `KsRequest`, `KsScopeByWidget`.
- **Calls.** The provider runs when a widget mounts and again when its scope changes, after a 300 ms quiet period. The first call is at once. Only one request is in flight per instance, and the earlier one gets an aborted `request.signal`. A scope change keeps the last props and KS on screen until the new KS arrives. It still never runs to renew a KS: remount to renew.
- **Check order.** With a provider, the props are validated before the provider is called. A bad prop shows its error and the provider is not called. Before 0.5 the provider ran first.
- **Recorder.** With a provider, a pre-check error shows outside the recorder container. Without a provider it stays inside.
- **Flashcards.** The provider is not called when there is no valid clip entry, or when `partnerId` or `uiconfId` is invalid or refused. The cards still render.

Details: [ADR 0009](adr/0009-per-instance-ks-scope.md).
