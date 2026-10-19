# Migrate from 0.4.x to 0.5.0

0.5.0 gives `setKsProvider` a second argument: the scope of one widget instance. No call site breaks. Hosts that ignore the argument keep working.

## What to do

| # | Who | Do |
|---|---|---|
| 1 | Hosts with a provider | Optional. Read `request.scope` to mint a KS for one entry or category: [The request](security/ks.md#the-request) |
| 2 | Hosts that mint from an endpoint | If you use the request, check every id on your server. Reject unknown `version` and unknown scope keys |
| 3 | Hosts with other regions | Optional. Agents can set `region` on every widget but Chart. Call `setAllowedRegions([...])` to keep them on your regions, and `setEnvironments` for localhost or a private cloud: [Region per widget](host-api.md#region-per-widget) |
| 4 | Agent authors | `categoryId` and `contextId` are digits only, up to 12. With a provider set, `cards` in Flashcards holds at most 20 clip entries. Analytics refuses `fromDate` after `toDate` |

## What changed

- **Regional hosts.** The regional API, CDN and recorder hosts are now the `.ovp` hosts from the Kaltura firewall guide: `api.<region>.ovp.kaltura.com` for `irp2`, `frp2`, `cap2`, `syp2` and `sgp2` (before: `api.eu`, `api.de`, `api.ca` and `api.ap`). KMC is `kmc.<region>.ovp.kaltura.com` for `irp2`, `frp2`, `cap2` and `syp2`, and `kmc.sg.kaltura.com` for `sgp2`. Update CSP and firewall allow-lists. Host table: [host-api.md](host-api.md#region-per-widget).
- **Region per widget.** `region` prop on every widget but Chart: a region code (now with `sgp2`) or an environment name. New exports: `setEnvironments`, `setAllowedRegions`, type `KalturaEnvironment`. `scope.region` can be an environment name. The catalog id stays `v2`. The Captions editor fails closed in `sgp2` and in environments, and Unisphere widgets refuse `sgp2`.
- **Player `playlistId`.** Optional. Set exactly one of `entryId` and `playlistId`. `entryId` is no longer required in the catalog schema: a `oneOf` rule checks the pair. A player with both shows `Invalid playlistId`. A player with neither waits for a binding, as before. `scope.entryId` is absent for a playlist, so a provider that reads it must also read `scope.playlistId`.
- **Analytics `categoryId`, `playlistId`, `virtualEventId`.** Optional. They open the category, playlist and virtual event view, like `entryId`. Set at most one of the four: a second one shows `Invalid <prop>`. They are in the KS scope. Mint the KS for the role you intend. `virtualEventId` is digits only, up to 12.
- **Captions editor `assetId`.** Optional. Opens that caption asset. It must belong to the entry. It is part of the KS scope.
- **Provider signature.** `(widget, request)`. The type is `KsProvider`. A one-argument provider `(widget) => ks` and a `() => ks` provider stay type-compatible. New type exports: `KsRequest`, `KsScopeByWidget`.
- **Calls.** The provider runs when a widget mounts and again when its scope changes, after a 300 ms quiet period. The first call is at once. Only one request is in flight per instance, and the earlier one gets an aborted `request.signal`. A scope change keeps the last props and KS on screen until the new KS arrives. It still never runs to renew a KS: remount to renew.
- **Check order.** With a provider, the props are validated before the provider is called. A bad prop, a refused id or a `serverUrl` that is not an allowed Unisphere origin shows its error and the provider is not called. Before 0.5 the provider ran first.
- **Recorder.** With a provider, a pre-check error shows outside the recorder container. Without a provider it stays inside.
- **Flashcards.** The provider is not called when there is no valid clip entry, or when `partnerId` or `uiconfId` is invalid or refused. The cards still render.

Details: [ADR 0009](adr/0009-per-instance-ks-scope.md).
