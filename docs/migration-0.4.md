# Migrate from 0.3.x to 0.4.0

0.4.0 changes `KalturaAnalytics` (`<kaltura-analytics>`). It now uses the documented `postMessage` handshake of the Kaltura Analytics app. The full list is in [CHANGELOG.md](../CHANGELOG.md).

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts with analytics | Return an ADMIN KS (type=2) for the `analytics` widget from `setKsProvider`. Stop sending a `ks` prop | The KS is no longer a prop. See [KS](#ks) |
| 2 | Hosts with analytics | Mint that KS for an admin user that has a role | Without a role the app fails with "Invalid object id [0]" |
| 3 | Hosts and agents | Check `reportType`, `fromDate` and `toDate` | Bad values now show an error. See [Props](#props) |
| 4 | Hosts that call `buildAnalyticsUrl` | Call it with no arguments | It returns a fixed URL. See [URL](#url) |
| 5 | Hosts with a CSP | Keep the KMC host of your region in `frame-src` | See [host-integration.md](host-integration.md#content-security-policy) |

## KS

Before, the KS went in the iframe URL (`ks=`). Now the component sends it in a `postMessage` to the Analytics origin only, and accepts messages only from that origin and from its own iframe.

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

- A `ks` prop is dropped, as on the avatar.
- `session.adminKs` must belong to an admin user that has a role. How to pick one: [security/ks.md](security/ks.md#what-to-put-in-a-ks).
- Renewal: the provider is read once at mount. To use a new KS, remount the component.

## URL

| 0.3 | 0.4 |
|---|---|
| `https://kmc.kaltura.com/index.php/kmcng/analytics?ks=…&partnerId=…&…` | `https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html` |
| `buildAnalyticsUrl({ partnerId, ks, … })` | `buildAnalyticsUrl()` |

The region sets the host, as before (`setRegion`). No KS, partner or filter is in the URL.

## Props

`partnerId`, `entryId`, `reportType`, `fromDate` and `toDate` stay. They now travel in messages (`init`, `navigate`, `updateFilters`).

| Prop | Rule |
|---|---|
| `entryId` | Opens the entry view. Wins over `reportType` |
| `reportType` | One of `engagement`, `content-interactions`, `technology`, `geo-location`, `contributors`, `overview`, `publisher`, `enduser`, `live`. Default `engagement` |
| `fromDate`, `toDate` | `YYYY-MM-DD`, both or none. Default: the last 30 days |

Before:

```json
{ "id": "a", "component": "KalturaAnalytics", "partnerId": 1234567, "ks": "…", "reportType": "top" }
```

After:

```json
{ "id": "a", "component": "KalturaAnalytics", "partnerId": 1234567, "reportType": "geo-location", "fromDate": "2026-01-01", "toDate": "2026-03-31" }
```
