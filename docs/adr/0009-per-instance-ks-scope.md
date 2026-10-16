# 0009. Per-instance KS scope

Status: accepted (2026-10-15). Phase 0 and Phase 1 are implemented (0.5.0). Phase 2 is implemented for `region`, the Captions editor `assetId` and the Player `playlistId` (section 9). The other Phase 2 props wait for tests against the hosted backends. Builds on [ADR 0002](0002-ks-handling.md).

Code today: `src/core/ks.ts`, `src/core/validate-props.ts`, `src/adapters/react/agent-action.tsx`, `src/schemas/*.ts`.

## Context

- A host can show many widgets in one view, each with its own scope: three players on three entries, a flashcards deck, a Genie on one category. Each needs its own KS, minted by the host backend after it checks what the end user may see.
- `setKsProvider(widget => ks)` gets only the widget name. Three players give three identical calls, so the host cannot tell them apart.
- The provider runs once per mount. If `entryId` changes later, the player restarts with the old KS (`src/core/player.tsx`). New flashcards may be outside the KS.
- `withKs` runs the provider before the props are validated. A refused `partnerId` or `uiconfId`, bad Analytics props and a refused recorder partner all reach the provider.
- A2UI does not give a component a unique identity. The agent chooses `surfaceId` and every component `id`. Every item of a template shares one `componentId`.
- The widgets accept far more parameters than our schemas expose. Each parameter falls into one of three groups, and only some can be enforced by a KS:
  1. **Scope** parameters name data: entries, categories, playlists, events, users.
  2. **Config** parameters change look or behaviour: theme, autoplay, time window.
  3. **Host-only** parameters choose identity, persona, cost or write rights.
- What the KS can enforce (Kaltura Session Guide https://kaltura.md/KALTURA_SESSION_GUIDE/, developer docs "Authentication and Security"):
  - Per entry: `sview`, `edit`, `download`. Pairs are separated by commas without spaces. Repeated keys (`sview:1_a,sview:1_b`) do not work: `session.start` keeps only the last one (sandbox test, 2026-10-15). Several entries need one `sview` key with a list value. The separator the server enforces is untested.
  - Per manual playlist: `sviewplaylist`, `editplaylist`.
  - Per user, role and limits: `userId`, `setrole`, `expiry`, `actionslimit`, `iprestrict`, `urirestrict`.
  - A category only indirectly: `enableentitlement` plus `privacycontext:<label>`.
  - Custom, app-read privileges such as `genieid:<id>`. The platform ignores them. Only the app that reads them enforces them.
  - Nothing for a metadata profile, a metadata field or a category ID. `list` supports only `list:*`.
  - A slash joins values inside one privilege (`edituser:a/b`). Documented only for `edituser`.

## Decision

### 1. The provider gets the instance and its scope

```ts
/** Scope per widget. Every value has passed its format check. Arrays are sorted and unique. */
interface KsScopeByWidget {
  // Every entry below also has `region: KalturaRegion`, resolved as in section 9.
  player: { partnerId: number; entryId: string };
  flashcards: { partnerId: number; entryIds: readonly string[] };
  'captions-editor': { partnerId: number; entryId: string };
  recorder: { partnerId: number };
  analytics: { partnerId: number; entryId?: string; reportType?: AnalyticsReportType; fromDate?: string; toDate?: string };
  'media-manager': { partnerId: number; contextId?: string };
  genie: { partnerId: number; categoryId?: string };
  'content-lab': { partnerId: number; entryId: string };
  'agents-widget': { partnerId: number };
  'vod-avatar': { partnerId: number };
  avatar: { partnerId: number };
}

type KsWidget = keyof KsScopeByWidget;

// A union on `widget`: narrow it to read the matching `scope`.
type KsRequest<W extends KsWidget = KsWidget> = {
  [K in W]: {
    widget: K;
    /** Bumped when a widget gains a scope key. Backends reject unknown versions and keys. */
    version: 1;
    /** Deep-frozen. Untrusted: the agent chose every value. */
    scope: Readonly<KsScopeByWidget[K]>;
    /** A2UI only. Chosen by the agent. Logs and correlation only. */
    surfaceId?: string;
    /** A2UI only. Chosen by the agent. Shared by every item of a template. Logs and correlation only. */
    componentId?: string;
    /** A2UI only. The data path of this instance, for example `/items/0`. Changes when a list reorders. */
    dataPath?: string;
    /** Aborted when the scope changes again or the widget unmounts. */
    signal: AbortSignal;
  };
}[W];

type KsProvider = (widget: KsWidget, request: KsRequest) => string | undefined | Promise<string | undefined>;
```

- A provider that throws or rejects denies the request. The widget shows `Invalid ks` and the library does not retry.
- A provider that returns `undefined` or `''` supplies no KS. On the web component path the widget then uses its `ks` setting, if any. On the A2UI path there is no fallback: no KS means `Invalid ks`.
- No id is a cache key or a trust key. A host that caches keys by `(user, widget, scope)` is safe. A host that caches by `componentId` is not.
- The web component passes `widget`, `version`, `scope` and `signal` only.
- Existing one-argument providers keep working at run time and stay type-compatible: `KsRequest` is a union on `widget`, and the provider type takes `(widget, request)`. It ships as 0.5.0 with a migration note ([migration-0.5.md](../migration-0.5.md)).

### 2. Three classes of parameter

| Class | Meaning | In `scope` | Who sets it | Re-mints on change |
|---|---|---|---|---|
| **R** requestable | Names data. The agent asks through a prop, the backend validates | yes | agent, checked by the backend | yes |
| **H** host-only | Identity, persona, cost, write rights, KS type, region | no | host, usually inside the KS | n/a |
| **C** config | Look or behaviour | no | agent | no |

A C change never re-mints a KS. It can still restart the widget with the same KS: a Recorder restart loses a running recording, and an Avatar restart opens a new session.

Each R parameter also has an **enforcement** level, and the docs must say it:

| Enforced by | Meaning |
|---|---|
| **KS** | A privilege in the KS limits it. The backend must mint it |
| **UI** | Only the widget's own UI limits it. A user can leave it, and a holder of the KS can bypass it. A hint, not a boundary |
| **none** | The widget ignores it today |

For an ADMIN KS (Analytics, Content Lab, Agents Widget) scope cannot narrow the KS. It is a yes/no input to the mint. The KS it returns can do everything the role allows.

### 3. Scope dimensions

| Dimension | Format check in the library | Cap |
|---|---|---|
| `partnerId` | positive integer, plus the existing allowlist | |
| `region` | a code from the closed region list, plus the host allowlist (section 9) | |
| `entryId`, `assetId` | `isEntryId` (caption asset ids look like entry ids) | |
| `entryIds` | `isEntryId` each, unique, sorted | provisional 20 |
| `categoryId`, `contextId`, `ancestorCategoryId` | digits only | 12 characters |
| `playlistId`, `virtualEventId` | `[A-Za-z0-9_]{1,64}` (confirm per widget) | |
| `reportType` | the existing enum | |
| `fromDate`, `toDate` | real `YYYY-MM-DD`. Both or neither. `fromDate <= toDate`. The check never throws | |

- The library checks shape and length only. It never judges access.
- An empty string means unset. It is removed before the scope is built.
- A value that fails its check never reaches the provider. The widget shows `invalid-props` with the prop name.
- Scope is built from an explicit list of known props per widget. Unknown props, `ks` and H parameters never enter it.

### 4. Parameters per widget

"Phase" says when the library supports it (see Phases). "Source" says where it exists today. Items marked UNVERIFIED need a sandbox test.

#### Player

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `entryId` | prop | R | KS `sview:<id>` | 1 |
| `playlistId` | prop, exactly one of `entryId` and `playlistId`. The widget asks the player bundle to load the playlist by id. `startTime` and `clipTo` do not apply | R | KS `sviewplaylist:<id>`, manual playlists only. Tested: it implies view of the playlist entries. With neither id the widget waits (A2UI) or shows `Invalid entryId` (web component), as before | 2 (implemented) |
| category, as a label | none | H, backend derives it | KS `enableentitlement` + `privacycontext:<label>` | |
| `partnerId`, `uiconfId` | props | allowlist | KS partner. A uiConf runs code in the page | |
| `startTime`, `clipTo` | props | C | none. `sview` covers the whole entry, so the window is not a boundary | |
| `autoplay`, `muted`, `aspectRatio`, `entryName`, `entryDescription` | props | C | | |
| `userId`, `setrole`, `appid`, `widget:1`, `actionslimit`, `iprestrict`, expiry | KS | H | KS | |

#### Flashcards

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `entryIds` | derived from `cards[].clips[].entryId` | R | KS one `sview` per entry | 1 |
| category, as a label | none | H | KS entitlement | |
| `startTime`, `endTime` per clip | props | C | none, same as the player | |
| `thumbnail` | prop | C | none. Thumbnails carry no KS, so protected entries may not show one | |
| `title`, `summary`, card text | props | C | | |
| `partnerId`, `uiconfId` | props | allowlist | | |

Rules:

- The scope holds the valid, unique clip ids. A bad id is dropped from the scope, and the clip already shows "This clip cannot be shown".
- No valid id, or no `partnerId` or `uiconfId`: no mint.
- More ids than the cap: `invalid-props` on `cards`, no mint.
- The KS is minted for a set of ids. A later set that is a subset of it reuses the KS with no request.

#### Captions editor

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `entryId` | prop | R | KS `edit:<id>` + `sview:<id>`. A USER KS needs a role that can add captions | 1 |
| `assetId` | prop (`data-assetid`, read by the pinned editor page v1.3.10). Optional | R | the editor. It must belong to the entry | 2 (implemented) |
| `uiconfId` | prop | allowlist | | |
| `userId`, expiry (about 2 hours) | KS | H | KS | |

#### Recorder

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| none: it creates the entry | | | | |
| `entryName`, `allowVideo`, `allowAudio`, `allowScreenShare` | props | C | none | |
| `maxRecordingTime` | prop, up to 24 hours | C. No host cap exists until the "Later" channel | none | |
| `conversionProfileId`, `showUploadUI`, `allowUpload` | Kaltura options, not exposed | H if ever added | | |
| category, owner, tags of the new entry | not supported by the recorder | | | |
| `userId`, `editadmintags:*`, `actionslimit`, expiry | KS | H | KS | |

The new entry's ID comes back in `recorder-upload-ended`. A later widget for that entry (player, captions editor) makes a new scope request. The backend should confirm the entry was created by this user.

#### Analytics (ADMIN KS)

Entry, category, user and date scope are UI-level only. The KS can only limit the role and the virtual event.

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `entryId` | prop | R | UI | 1 |
| `reportType` | prop, 9 views | R | role permissions, `setrole` | 1 |
| `fromDate`, `toDate` | props | R | UI. The user can change them | 1 |
| `categoryId` | prop. Route `/analytics/category` | R | UI. Entitlements: UNVERIFIED | 2, implemented |
| `playlistId` | prop. Route `/analytics/playlist` | R | UI | 2, implemented |
| `userId` (report subject) | none. Route `/analytics/user` | H until a host opts in | UI only. One wrong backend check shows another user's data | 2, opt-in |
| `virtualEventId` | prop. Route `/analytics/virtual-event` | R | UI. A KS `virtualeventid:<id>` limited nothing on 8 report types | 2, implemented |
| owner filter (`predefinedFilter.ownerIdsIn`) | init option, not sent | H | UI | |
| `customData.metadataProfileId` | init option, not sent | H | none. Only picks the metadata shown | |
| `multiAccount`, `hostAppName`, `previewUIConfV7`, `viewsConfig` edits | init options, not sent | H | | |
| thumbnail-with-KS option | init option | never | would put the KS in URLs | |
| role, `setrole`, `iprestrict`, `actionslimit`, `sessionid` | KS | H | KS | |

An `entryId` change after the handshake navigates in place with no new check today. Phase 1 re-gates first, then calls `updateConfig` and navigates in place.

#### Media Manager

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `contextId` (category and descendants) | prop | R | UI. An eSearch client filter. The user can open child folders | 1 |
| own media (`myMedia`, used when `contextId` is unset) | runtime | H | whether it filters by KS user: UNVERIFIED | |
| entries, metadata, MD profile | not supported by the runtime | | | |
| `mode`, `multiSelect`, `theme` | props | C | none. `mode` only removes the select button. Write rights come from the KS role | |
| visible categories | KS entitlement privileges | H | KS | |
| upload, delete, category-entry write | KS role | H | KS | |
| `apiFilters`, `interceptors`, `header`, `pageSize`, `rowActions` | runtime settings, not set | H if ever added | | |
| `serverUrl` | prop | allowlist | | |

#### Genie

The runtime reads its scope from KS privileges, not from the `categoryId` setting. That setting is ignored by runtime 1.86.14 (bundle, UNVERIFIED live).

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `categoryId` | prop, ignored by the runtime | R | KS `geniecategoryid`. The prop is only a hint | 1 |
| `ancestorCategoryId` | none | R | KS `genieancestorid` (category and descendants) | 2 |
| `virtualEventId` | none | R | KS `virtualeventid` | 2 |
| `entryId` | none. The chat builds `context_type: entry` itself | R | UI. Whether the server checks it: UNVERIFIED | 2 |
| `genieId` | none | H, selects the Genie config. R only with a host allowlist, and only in Phase 2 | KS `genieid` | |
| `privacycontext` + `enableentitlement` | none | H, backend derives it | KS | |
| `searchcontext` | none | H | KS | |
| `language` | prop | C | none in 1.86.14 (UNVERIFIED) | |
| `uiconfId` | prop | allowlist | | |
| `sview`, `setrole` | KS | H | KS | |

The backend minting and the widget setting must match. One without the other gives no scope.

#### Content Lab

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `entryId` | prop. Only opens the entry. A change after open is ignored today | R | UI. The KS cannot narrow an ADMIN KS to one entry | 1 |
| `publishCategoryId` | runtime setting, not sent | H. It is a write target and the KS is ADMIN, so the backend cannot enforce it | write needs the KS | |
| `reachProfileId` | runtime setting, not sent | H. It decides who is charged | account and KS | |
| `reachConfig`, `postSaveActions`, `clipsOverride` | runtime settings | H | | |
| `hidePlaylists`, `hideTags` | runtime settings | C | none | |
| thumbnail-with-KS option | runtime setting | never | would put the KS in URLs | |
| KS type (ADMIN or USER), AI consent rights | KS | H | KS. Our docs and the Kaltura guide disagree | |

#### Agents Widget

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| `categoryId` | runtime setting in the guide, not sent. Live acceptance: UNVERIFIED | R | UI. A filter and the default category for new agents | 2 |
| agent id | removed in 0.4 | | | |
| everything else (create, change, delete, REACH spend) | KS type and role | H | KS. An unscoped ADMIN KS is the main risk | |

#### VOD Avatar

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| user | KS `userId` | H | the service isolates by user | |
| `additionalEsearchFilters` (category, entry restrictions in the media picker) | runtime setting, not sent | R | UI | 2 |
| `allowedProjectTypes` | runtime setting, not sent | H. It limits what the user can create | | |
| `initialView` | runtime setting | C | | |
| `entryLink`, `handleShare` | runtime functions | never from the agent | | |
| thumbnail-with-KS option | runtime setting | never | would put the KS in URLs | |
| `avatarId`, source entry | chosen in the UI. The service checks account membership | | UI | |

#### Avatar

| Parameter | Source | Class | Enforced by | Phase |
|---|---|---|---|---|
| agent persona | KS claim `agentid:<id>`. Live: `application/appInit` answers `AGENT_NOT_FOUND` for an unknown id and `AGENT_ID_NOT_FOUND_IN_KS` for a KS without the claim, an ADMIN KS included. `geniegpcid:<id>` is a conversation token and does not select the agent. A widget session path is not used | H | KS | |
| `widgetId` session path | the loader supports it | never. It bypasses the KS | | |
| `autoConnect` | prop | H, or a host opt-in. It opens the microphone and starts billing time. Whether it needs a user gesture: UNVERIFIED | none | |
| `openingPhrase` (500 characters, spoken) | prop | C, agent-controlled. A change rebuilds the embed and starts a new session | none | |
| `captions`, `theme` | props | C | | |
| knowledge scope (entries, categories) | set on the agent server-side | H | server | |

### 5. Order

1. **Pre-check.** Check the props without `ks`: the field rules, the allowlists, and for Analytics the report type and dates. The recorder gets the same check, outside its effect. A bad value shows the usual error and the provider is not called. A prop that is still undefined waits.
2. **Mint.** Build `scope` from the known R props and call the provider from an effect, not from a `useState` initialiser.
3. **Full check.** Run the usual check with the returned `ks`.

`ks` is optional in the Player and Flashcards schemas and required in the others. The pre-check drops it so the provider can still supply it.

### 6. Scope change

- The scope key is the JSON of `scope` with sorted arrays. When it changes, the instance keeps rendering the last good `{props, ks}` pair. When the new KS arrives it renders the new props with it. Props B never run with KS A.
- Every widget already restarts when `ks` changes, so no React `key` is needed. Analytics gates again, then updates its config and navigates in place.
- A failed mint fails closed: the widget shows `Invalid ks`.
- A reply for an earlier key is ignored. A StrictMode double effect is deduplicated by key.
- Flashcards: the key is the set the KS was minted for. A subset reuses the KS. The card position survives because the widget is not remounted.
- Each instance has its own KS. One `actionslimit` or expiry never couples two widgets. A host that wants to share a KS caches by `(user, widget, scope)`.
- The widget renders nothing until its first KS arrives. A new entry never plays under the old KS.

### 7. Input and timing rules

- Values are checked before the provider sees them (section 3).
- The provider gets a deep-frozen copy of `scope`. It never gets the live props, `ks` or unknown fields.
- The first mint runs at once. Later mints wait for a quiet period (300 ms in the sketch). An agent can bind a prop to a text field, so without this every keystroke is a mint.
- One mint is in flight per instance. A newer key aborts the older one through `signal`.
- The library cannot limit the number of instances an agent renders. The backend must rate-limit per user.
- A rejected or throwing provider shows `Invalid ks`, never the error text, and is not retried.

### 8. Host backend contract

The backend treats `scope`, `surfaceId`, `componentId` and `dataPath` as untrusted input. It:

1. Checks that the end user may access each entry, category, playlist or event.
2. Rejects unknown versions and unknown scope keys. A backend that ignores a new key mints a wider KS than the widget asked for.
3. Builds the privilege string itself and mints the least KS that works (`setrole`, short expiry, `actionslimit` where it fits).
4. Never grants privileges from a key like `componentId`.
5. Decides only whether to mint, and with which role, for UI-level scope and for an ADMIN KS.
6. Rate-limits per user.

A host UI that lets a user approve a wider scope should show the real ids, not the agent's description.

### 9. Region

Today only the six Unisphere widgets take a per-widget setting (`serverUrl`, checked against the Unisphere hosts of five regions). The Player, Flashcards, Captions editor, Analytics and Recorder have none. They read the global `setRegion` value when they build a URL (`kalturaHosts()` in `src/core/region.ts`), so one page cannot show two accounts from two regions.

| Rule | Detail |
|---|---|
| Prop | Every widget gets an optional `region` prop. The value is a region code from `KALTURA_REGIONS` or the name of a host-registered environment (see "Local and custom hosts"). It is an optional new prop, so it ships on the existing `v2` catalog id (see the deviation note below) |
| Resolution | `region` prop, else the region in `serverUrl`, else the `setRegion` default. If the prop and `serverUrl` disagree, the widget shows `origin-not-allowed` |
| Host limit | `setAllowedRegions(rule)`, with the same rule shape as `setAllowedPartners`. It checks the default region as well. Default: every known code and every registered environment |
| Class | R. The agent asks by name, the library resolves the name, the backend checks that the partner lives in that region |
| In the request | `scope.region` always holds the resolved region or environment name. The backend mints against that region's API and rejects a partner from another region. No partner-to-region map exists, so the backend cannot infer the region |
| Hosts | Computed per instance from the resolved region, never from a global read at render time |
| No capability gating | The library does not know which widget runs in which region. A widget in a region that lacks it fails with that region's own error. New regions and capabilities then need no library change. This includes `sgp2`. One exception: the Captions editor page runs in the host origin, so it needs a pinned hash per host (`EDITOR_PAGE_INTEGRITY`). It fails closed in `sgp2` and in every environment |
| EU | `irp2` is the EU region. No separate `eu2` code |
| New codes | Adding a region is a data change in `region.ts`. `sgp2` is the first: API `api.sgp2.ovp.kaltura.com`, VOD `cfvod.sgp2.ovp.kaltura.com`, KMC `kmc.sg.kaltura.com`. It runs no microservices, so it has no Unisphere host and the Unisphere widgets refuse it |
| Deviation | The ADR planned a new catalog id for Phase 2. `region` is optional and additive, and `v2` consumers ignore props they do not know, so the id stays `v2`. Player `playlistId` also keeps it: `entryId` stops being required, and a `oneOf` rule keeps one of the two ids required, so every earlier valid Player message stays valid. A new id comes with the first breaking catalog change |
| Where it is checked | `gateProps` (`src/core/validate-props.ts`) checks it for every widget that has a provider. The Recorder without a provider is checked when it resolves the script URL instead (`recorderScriptUrl`). A refused region gives `origin-not-allowed` with fixed text before the provider, a script, a fetch or an iframe |

#### Local and custom hosts

Any base URL must work, including `localhost`, IP addresses, private cloud and on-premises hosts (API guide, section 4.6). The host app registers them. The agent never sends a URL.

```ts
setEnvironments({
  local: { serviceUrl: 'http://localhost:8080', unisphere: 'http://127.0.0.1:3000' },
});
```

The agent then sends `region: 'local'`. The host app owns the name table. Only `serviceUrl` is required: `cdn`, `vod`, `kmc` and `recorder` default to it. Values are origins only. A Unisphere widget needs `unisphere`, which is also added to the Unisphere origin allowlist.

| Why not a raw URL from the agent | |
|---|---|
| KS exposure | The library sends the KS to the API host. An agent-chosen host receives a live KS |
| Remote code | Unisphere and Player load scripts from the host. An agent-chosen host runs its code in the page |
| Fit with the rest | `serverUrl` already works this way: Kaltura hosts plus `setExtraAllowedOrigins`. Environments extend the same rule to the other widgets |

| Also note | |
|---|---|
| CSP | The page's CSP must list the registered hosts. The library cannot do that |
| `http:` | A clear-text host sends the KS in clear text. Allow it for `localhost` and private IPs only, and log a warning |
| Request | `scope.region` holds the environment name, so the backend can map it to its own host and refuse unknown names |

Fixed on branch `mixed-region-hosts`: Genie, Content Lab, VOD Avatar and Agents Widget took the `serverUrl` of one region but read `kalturaServerURI` from the global region. They now derive it from `serverUrl`. Avatar and Media Manager already did.

### 10. A2UI conformance

| Point | Position |
|---|---|
| Does the spec allow a host-side provider? | Yes. v0.9 has no text on host-held credentials, so this rests on its general rule that the agent is untrusted. |
| Where does the provider run? | Inside the host app. No credential enters a message, the data model or an action. |
| Instance identity | `surfaceId` and `componentId` are public, typed fields of the React renderer. They are agent-chosen, reused after `deleteSurface` and shared by template items. They are for logs only. |
| Same-id `updateComponents` | The renderer re-renders the same node. It does not remount. Section 6 handles this. |
| `deleteSurface` | The React renderer keeps rendering the surface until the host removes it. Hosts must remove the surface on `onSurfaceDeleted`. The docs must say so. |
| Unknown props | The renderer accepts them and passes them on, so the closed catalog is not enforced at run time. Scope uses an explicit list of keys. |
| Catalog | New R props are a schema change. A breaking one needs a new catalog id. |
| v1.0 | Our root key `x-kaltura-adapters` and custom `$defs` helpers break the v1.0 candidate's rules. `metadata.extensions` (names like `com_kaltura_*`) could carry scope hints, never credentials. Plan a migration separately. |

## Phases

| Phase | What | Catalog | Release |
|---|---|---|---|
| 0 | Ships first, before the rest of this ADR is relied on. Hardening with no API change. The A2UI path takes the KS only from the provider. The docs fixes. | no change | patch |
| 1 (implemented) | The pre-check before the provider (it needs the mint to move into an effect), the provider request, scope change, timing rules and the size limit bump. Uses the props that exist today: `entryId`, flashcards `entryIds`, Genie `categoryId`, Media Manager `contextId`, Analytics and Content Lab `entryId`, `partnerId` | no change | 0.5.0 |
| 2 (`region` implemented) | `region` on every widget except Chart (section 9), `setEnvironments`, `setAllowedRegions`, `sgp2`. `assetId`, Player `playlistId` and Analytics `categoryId`, `playlistId` and `virtualEventId` are implemented. Not added, because no test shows that the hosted widget or the KS uses them: `ancestorCategoryId`, Genie `entryId`, Agents Widget `categoryId`, VOD Avatar filters. Each is added only after such a test. Analytics `userId` and Avatar `autoConnect` only as host opt-ins | `region` added to `v2`, no new id | 0.5.0 |
| Later | A way for the host to supply H runtime settings (`reachProfileId`, `genieId`, `allowedProjectTypes`), for example a provider that returns `{ ks, settings }` with a fixed allowlist of setting names per widget. Not decided here. Also the A2UI v1.0 migration | | |

## Consequences

- Several widgets of the same type in one view each get their own KS and scope.
- A scope change no longer leaves a stale KS, and view state survives it.
- One mint call per instance, after a quiet period. The host batches or caches. The player and flashcards show a short blank during the first mint.
- Docs must label every UI-level parameter as a hint. An agent that asks for a category on Analytics gets no boundary.
- Scope limits what each KS can do at Kaltura. It does not hide one widget's KS from another script on the page, because all widget code runs in the host origin.
- Size: the bundles sit within 108 B (React) and 84 B (web component) of the limits in `.size-limit.json`. A Phase 1 sketch measured +626 B and +711 B gzip. The real change is likely 0.7 to 1 kB. Phase 1 raises both limits in the same PR, with the measurement in the PR body. Phase 2 raised the React limit from 170.5 to 171 kB (`assetId`) and the web component limit from 230.5 to 231 kB (`playlistId`).
- The KS still expires and the library does not renew it ([security/ks.md](../security/ks.md#when-the-ks-expires)).
- Host-only runtime settings have no channel yet. Until "Later" lands, only the KS carries H parameters.

## Open before implementation

These need a sandbox partner. They set the entry cap (provisional 20) and decide which Phase 2 props are worth adding.

- Length limit of the privilege string, and the KS size where URLs break. Done: `session.start` kept 500 ids in one `sview` value (5.5 kB of privileges, an 8.8 kB KS) without truncation. The cap of 20 entries gives a 464 character KS, so size is not the limit. The real limit of any one service (player, CDN URL) is untested.
- `sview:a/b` (slash) against repeated keys. Done with a KS-protected entry: repeated keys collapse to the last one. The slash list `sview:a/b` works. `,`, `|` and `;` do not.
- Captions editor: done. The pinned editor page (v1.3.10) reads `data-assetid`. Live, in three browsers: with `assetId` the editor opens that asset, without it the first one (`e2e/live`, LIVE-06 and LIVE-07). A USER KS needs a role that can add captions.
- Player `playlistId`: done. Live, in three browsers: a manual playlist loads and plays (LIVE-05). The KS rule is tested at the API: with a KS-protected entry, `sviewplaylist` lets `playManifest` answer for the playlist entries and no privilege does not.
- Analytics `categoryId`, `playlistId`, `virtualEventId`: done as route navigations, like `entryId`. Live (LIVE-08): the playlist view opens for the playlist. The category and virtual event routes answer with their own views (an unknown id gives the app's own "not found" box). They are UI-level: a KS with `virtualeventid:<id>` returned the same totals as one without it on eight report types, so no limit was seen. At most one of the four subjects is allowed. The embed's `predefinedFilter` is a UI filter, and this library does not send it.
- Whether Genie privileges narrow results, and whether the server checks the client `context_id`. Tried on the NVP1 partner: the Genie server answers, but says it has no tool to list videos, with or without a category context, so no scope effect could be seen. It needs a partner with a Genie set up for its content.
- Whether Avatar `autoConnect` needs a user gesture. The agent claim is settled: `agentid:<id>` (LIVE-16).
- ADMIN or USER KS for Content Lab and Agents Widget. Content Lab: a USER KS of an admin user, minted by the provider for the scope, loads the widget and shows its UI (LIVE-13). The Agents Widget could not be fully tried live: its UI loads, but its backend (`agents-manager`) answers 403 without CORS headers from the network of the test machine, curl included, so the agent list never loads.
- Hosted widgets with a scoped provider: done for Genie, Media Manager, Content Lab, VOD Avatar and Recorder. The provider gets the expected `{ widget, scope }`, the widget shows its UI and no request URL holds the KS (LIVE-11 to LIVE-15, three browsers; the Recorder in Chromium with a fake camera). Genie `ancestorCategoryId`, `virtualEventId` and `entryId`, Agents Widget `categoryId` and VOD Avatar filters stay out: no live check shows the widget or a KS uses them.
- Second partner with agents (US region, LIVE-16 to LIVE-18, three browsers): the Avatar starts with a USER KS that has `agentid:<id>` and `appInit` answers 200. Genie loads with the guide's `setrole:PLAYBACK_BASE_ROLE,sview:*`. VOD Avatar needs an administrator role: with `PLAYBACK_BASE_ROLE`, `avatar/list` answers 403, with `Publisher Administrator` it answers 200. Roles are per partner, so a host must pick its own role for the VOD Avatar.
- `widget:1` for the player, and AppToken `sessionPrivileges` behaviour.
- Whether entitlement privileges limit Analytics and the Media Manager list by category.
- Whether `sviewplaylist` implies entry view. Done: it does.
- Whether the live Agents Widget and VOD Avatar runtimes accept the settings the guides list.
- Why Genie sends the `cdn` host as `kalturaServerURI` while Content Lab and VOD Avatar send `serviceUrl`.
- Why two timing tests failed in the Phase 1 sketch (a timer the test helper does not flush, or a real ordering bug).

## Docs to fix in the same change

Phase 1 docs are done: `docs/security/ks.md`, `docs/host-api.md`, `docs/host-integration.md`, `docs/ks-privileges.md`, `docs/troubleshooting.md` and `docs/migration-0.5.md`. Still open:

- `docs/ks-privileges.md`: replace the Genie scope privileges and the chaining rule with verified text after the sandbox test. The repeated-key text is already fixed.
- Media Manager `mode: 'manage'` only removes the select button. The "full content manager" claim is fixed in the schema description (done in Phase 2).
- Agents Widget KS type, after a test from an allowed origin.
- `docs/host-api.md` and `docs/host-integration.md`: the per-widget `region` prop, the region allowlist and the precedence rule. Done in Phase 2.

## Tests

- Two players with different `entryId`s give two provider calls with the right `scope`.
- Two template items on one surface give two requests that differ only by `dataPath` and `scope`.
- Two surfaces with the same `componentId` give different requests.
- A changed R prop calls the provider again. A changed C prop does not.
- Until the new KS arrives, the widget keeps the last good props and KS. No render pairs new props with the old KS.
- A late reply for an old scope is ignored. A newer scope aborts the older request.
- A burst of changes gives one mint after the quiet period.
- Flashcards: a subset keeps the KS and the card position. A new entry mints again. No valid ids gives no call. Too many ids gives `invalid-props`.
- Analytics: a scope change does not reload the iframe.
- StrictMode: one call per key.
- A refused partner, a bad Analytics prop and a recorder with a refused partner give no provider call.
- A bad ID, or too many `entryIds`, never reaches the provider.
- H parameters, `ks` and unknown props never appear in `scope`.
- The provider cannot change the live props.
- A one-argument provider still works at run time.
- Rejected and throwing providers show `Invalid ks` with no retry.
- The web component passes `scope` without `surfaceId`, `componentId` and `dataPath`.
- Two widgets with different `region` values in one view build different hosts and give different requests.
- `region` and `serverUrl` that disagree show `origin-not-allowed`. A region outside the region allowlist is refused before any script, fetch or iframe.
- An unknown region name never reaches the provider. A registered environment name does, and resolves to its hosts.
- `http:` hosts other than `localhost` and private IPs are refused.
