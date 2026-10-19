# 0009. Per-instance KS scope

Status: accepted. Builds on [ADR 0002](0002-ks-handling.md).

Code: `src/core/ks.ts`, `src/core/validate-props.ts`, `src/core/region.ts`, `src/core/allowed-ids.ts`, `src/schemas/*.ts`.

## Context

- A host can show many widgets in one view, each with its own scope: three players on three entries, a flashcards deck, a Genie on one category. Each needs its own KS, minted by the host backend after it checks what the end user may see.
- A KS provider that receives only the widget name cannot tell two players apart.
- An A2UI component has no unique identity. The agent chooses `surfaceId` and every component `id`. Every item of a template shares one `componentId`.
- A KS is a credential. The host mints it for the scope it intends. Use entitlement privileges to restrict access.

## Decision

Every widget that needs a KS asks the host's KS provider once per instance and once per scope change. The request carries the widget name and a validated scope. The host backend checks the scope and mints the least KS that works.

### The request

```ts
interface KsScopeByWidget {
  // Every entry below also has `region: string`, resolved as in "Region".
  player: { partnerId: number; entryId?: string; playlistId?: string };  // exactly one of the two ids
  flashcards: { partnerId: number; entryIds: readonly string[] };
  'captions-editor': { partnerId: number; entryId: string; assetId?: string };
  recorder: { partnerId: number };
  analytics: { partnerId: number; entryId?: string; categoryId?: string; playlistId?: string; virtualEventId?: string; reportType?: AnalyticsReportType; fromDate?: string; toDate?: string };
  'media-manager': { partnerId: number; contextId?: string };
  genie: { partnerId: number; categoryId?: string };
  'content-lab': { partnerId: number; entryId: string };
  'agents-widget': { partnerId: number };
  'vod-avatar': { partnerId: number };
  avatar: { partnerId: number };
}

type KsProvider = (widget: KsWidget, request: KsRequest) => string | undefined | Promise<string | undefined>;
```

`KsRequest` is a union on `widget`. Narrow it to read the matching `scope`.

| Field | Meaning |
|---|---|
| `widget` | The widget name, a key of `KsScopeByWidget` |
| `version` | `1`. Bumped when a widget gains a scope key |
| `scope` | The validated scope, deep-frozen |
| `signal` | Aborted when the scope changes again or the widget unmounts |
| `surfaceId`, `componentId`, `dataPath` | A2UI only. Chosen by the agent. For logs and correlation only |

Provider rules:

| Case | Result |
|---|---|
| Throws or rejects | `Invalid ks`. No retry. The error text is never shown |
| Returns `undefined` or `''` on the web component path | The widget uses its `ks` setting, if any |
| Returns `undefined` or `''` on the A2UI path | `Invalid ks`. There is no fallback |
| Web component | The request holds `widget`, `version`, `scope` and `signal` only |

No id in the request is a cache key or a trust key. A host that caches keys by `(user, widget, scope)` is safe. A host that caches by `componentId` is not.

### The scope model

Scope holds only props that name data. The library builds it from an explicit list of keys per widget. Unknown props, `ks` and config props never enter it. An empty string means unset and is removed.

| Dimension | Format check | Limit |
|---|---|---|
| `partnerId` | positive integer, plus `setAllowedPartners` | |
| `region` | lowercase letters, digits and hyphens (`^[a-z][a-z0-9-]{0,31}$`). Known and allowed names are decided as in "Region" | 32 characters |
| `entryId`, `assetId`, `playlistId` | letters, digits and underscore | 64 characters |
| `entryIds` (Flashcards) | valid clip entry ids, unique, sorted | 20 ids |
| `categoryId`, `contextId`, `virtualEventId` | digits only | 12 characters |
| `reportType` | one of the Analytics views | |
| `fromDate`, `toDate` | real `YYYY-MM-DD`. Both or neither. `fromDate` is not after `toDate` | |

- The library checks shape and length. It does not judge access.
- A value that fails its check never reaches the provider. The widget shows `invalid-props` with the prop name.
- Props that choose identity, persona, cost or write rights are not scope. The host sets them inside the KS.

### Order

1. **Pre-check.** The library checks the props without `ks`: field rules, host allowlists, region, and for Analytics the subject, report type and dates. A bad value shows the usual error and the provider is not called. A prop that is still undefined waits.
2. **Mint.** The library builds `scope` from the known props and calls the provider from an effect.
3. **Full check.** The library runs the usual check with the returned `ks`.

### Scope change

- The scope key is the JSON of `scope` with sorted arrays. When it changes, the widget keeps rendering the last props with the KS they were minted for. It renders the new props when the new KS arrives. New props never run with an old KS.
- The widget renders nothing until its first KS arrives.
- A widget restarts when its `ks` changes. Analytics updates its session and navigates in place instead.
- A failed mint fails closed: `Invalid ks`.
- A reply for an earlier scope is ignored. A StrictMode double effect makes one request per scope.
- Flashcards: a later set of ids that is a subset of the minted set reuses the KS and makes no request. The card position survives.
- The first request runs at once. Later requests wait for 300 ms without a scope change, and a newer scope aborts the older request through `signal`.
- Each instance has its own KS. One `actionslimit` or expiry never couples two widgets.
- The library does not renew a KS. See [security/ks.md](../security/ks.md#when-the-ks-expires).

### Host backend contract

The backend treats `scope`, `surfaceId`, `componentId` and `dataPath` as untrusted input. It:

1. Checks that the end user may access each entry, category, playlist or event.
2. Rejects unknown versions and unknown scope keys.
3. Builds the privilege string itself and mints the least KS that works (`setrole`, short expiry, `actionslimit` where it fits).
4. Never grants privileges from a key like `componentId`.
5. Mints against the API of `scope.region` and rejects a partner that does not belong to that region.
6. Rate-limits per user. The library cannot limit how many instances an agent renders.

A host UI that lets a user approve a wider scope shows the real ids, not the agent's description.

### Per-widget scope

"Reads" is the scope the library sends. "Host decides" is what the backend checks and grants. Privilege names per widget are in [ks-privileges.md](../ks-privileges.md).

| Widget | Reads | Host decides |
|---|---|---|
| Player | `entryId` or `playlistId` (exactly one). `playlistId` is a manual playlist. `startTime` and `clipTo` do not apply to a playlist | View rights for the entry or playlist |
| Flashcards | `entryIds`, from `cards[].clips[].entryId`. A bad id is dropped from the scope and its clip shows "This clip cannot be shown". More than 20 valid ids gives `invalid-props` on `cards`. No valid id, no `partnerId` or no `uiconfId`: no request | View rights for each entry |
| Captions editor | `entryId`, optional `assetId` (opens that caption asset) | Whether the user may edit captions of the entry. The KS needs a lifetime for the whole editing session |
| Recorder | `partnerId` only. The recorder creates the entry | Whether the user may record. Later widgets for the new entry make their own request |
| Analytics | `entryId`, `categoryId`, `playlistId`, `virtualEventId`, `reportType`, `fromDate`, `toDate`. At most one of the four subjects | Whether to mint, and with which role. These props choose the view. Mint the KS for the role you intend |
| Media Manager | `contextId` (opens that category) | Which categories and actions the user may use. `mode: 'manage'` only removes the select button. |
| Genie | `categoryId` | Which content the user may search |
| Content Lab | `entryId` (opens that entry) | Whether the user may use Content Lab on the entry |
| Agents Widget | `partnerId` | Whether the user may manage agents. Grant the least role that works |
| VOD Avatar | `partnerId` | The role the avatar service accepts for this user |
| Avatar | `partnerId` | The agent: the host puts the agent id in the KS. The agent never chooses it. `autoConnect` is off unless the agent sets it |

Config props are not scope and never re-mint a KS: `autoplay`, `muted`, `aspectRatio`, `theme`, `language`, `mode`, `multiSelect`, `captions`, `openingPhrase`, `initialView`, `additionalEsearchFilters`, `startTime`, `clipTo` and the recorder options. Some of them restart the widget with the same KS. A Recorder restart ends a running recording. An Avatar restart opens a new session.

`initialView` and `additionalEsearchFilters` on VOD Avatar set the first view and the entry filters of the media picker. They are UI settings. Use the KS for access control.

### Region

Every widget except Chart takes an optional `region` prop. The Unisphere widgets (Genie, Media Manager, Content Lab, Agents Widget, VOD Avatar, Avatar) also take `serverUrl`.

| Rule | Detail |
|---|---|
| Value | A code from `KALTURA_REGIONS` (`nvp1`, `irp2`, `frp2`, `cap2`, `syp2`, `sgp2`) or the name of an environment the host registered with `setEnvironments` |
| Resolution | `region` prop, else the region in `serverUrl`, else the `setRegion` default |
| Conflict | If the prop and `serverUrl` name different regions, the widget shows `origin-not-allowed` |
| Host limit | `setAllowedRegions(rule)`, same rule shape as `setAllowedPartners`. It applies to the default region too. Default: every known code and every registered environment |
| Unknown name | `origin-not-allowed` with fixed text. The provider, a script, a fetch and an iframe are never reached |
| In the request | `scope.region` holds the resolved code or environment name. The library has no partner-to-region map, so your backend checks that the partner lives in that region |
| Hosts | The library computes API, CDN, VOD, KMC and recorder hosts per instance from the resolved region |
| Capabilities | The library does not gate widgets by region |
| EU | `irp2` is the EU region |
| `sgp2` | API `api.sgp2.ovp.kaltura.com`, VOD `cfvod.sgp2.ovp.kaltura.com`, KMC `kmc.sg.kaltura.com`. It has no Unisphere host, so the Unisphere widgets refuse it |
| Captions editor | The editor page runs in the host origin. It loads only if its hash matches a pinned value for the region host. The pinned hosts are `nvp1`, `irp2`, `frp2`, `cap2` and `syp2`. It fails closed in `sgp2` and in every environment |
| Where checked | `gateProps` in `src/core/validate-props.ts`, before the provider. The Recorder without a provider is checked when it builds the script URL |

#### Environments

Register a local, private cloud or on-premises host with `setEnvironments`. The agent sends the name, never a URL.

```ts
setEnvironments({
  local: { serviceUrl: 'http://localhost:8080', unisphere: 'http://127.0.0.1:3000' },
});
```

| Key | Rule |
|---|---|
| `serviceUrl` | Required |
| `cdn`, `vod`, `kmc`, `recorder` | Optional. Default to `serviceUrl` |
| `unisphere` | Needed by the Unisphere widgets. Also joins the Unisphere origin allowlist |
| `agents` | Needed by the Agents Widget. The widget calls `<agents>/api/v1` |
| Values | Origins only. `http:` is allowed for `localhost` and private IPs only, with a console warning |
| Names | Lowercase letters, digits and hyphens. A region code is not a valid name |

A raw URL from the agent is refused by design. The library sends the KS to the API host, and Unisphere and the Player load scripts from their host. The host list is fixed by the host app.

Your CSP must list the registered hosts. The library cannot do that.

### A2UI conformance

| Point | Position |
|---|---|
| Host-side provider | The provider runs inside the host app. No credential enters a message, the data model or an action. This follows the A2UI rule that the agent is untrusted |
| Instance identity | `surfaceId` and `componentId` are agent-chosen. They are for logs only |
| Same-id `updateComponents` | The renderer re-renders the same node and does not remount it. "Scope change" covers this |
| `deleteSurface` | The React renderer keeps rendering the surface until the host removes it. Remove the surface on `onSurfaceDeleted` |
| Unknown props | The renderer passes them on. The scope uses an explicit list of keys, so they never reach the provider |
| Catalog | `region` and `playlistId` are optional and additive, so earlier valid messages stay valid. A breaking prop change needs a new catalog id |

## Consequences

- Several widgets of the same type in one view each get their own KS and scope.
- A scope change never leaves a stale KS, and view state survives it.
- The host sees one request per instance per scope, after a quiet period. Batch or cache by `(user, widget, scope)`. The player and flashcards show a short blank during the first request.
- Analytics props choose the view. Mint the KS for the role you intend.
- A widget's KS is visible to other scripts on the page, because all widget code runs in the host origin.
- The library cannot inspect a KS it receives. The host server enforces the scope. `examples/ks-server/privileges.ts` is a tested reference.
- Host-only settings have no channel except the KS.

## Verification

Unit tests cover the request, the scope checks, scope changes and region resolution. Browser tests run in Chromium, Firefox and WebKit.
