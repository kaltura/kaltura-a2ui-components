# Migrate from 0.1.x to 0.2.0

0.2.0 fixes security and robustness bugs and changes the install and host contract. It is served from jsDelivr and git tags only, not npm. Do the checklist, then read the details you need. The full list is in [GitHub Releases](https://github.com/kaltura/kaltura-a2ui-components/releases).

The peer versions below are those of 0.2.0. Later releases need A2UI 0.13: see [migration-a2ui-0.13.md](migration-a2ui-0.13.md).

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | ESM users | Install from the git tag with the peers ([Install contract](#install-contract)). Add a `dompurify` override ([DOMPurify](#dompurify)) | The ESM no longer bundles the peers. `@a2ui/react` brings in a DOMPurify with advisories |
| 2 | CDN users | Change the tag in the URL to `@v0.2.0` and add the SRI hash from the Release ([CDN URLs](#cdn-urls)) | Tags up to `v0.1.4` serve the old bundle |
| 3 | Everyone | Call `setKsProvider` and stop passing `ks` in agent output | The KS must not pass through the agent |
| 4 | Hosts with a private cloud | Call `setExtraAllowedOrigins([...])` | Other `serverUrl` hosts are rejected |
| 5 | Hosts with a non-US region | Call `setRegion(code)` | Captions editor and flashcard thumbnails follow it |
| 6 | Hosts using basic Image, Video, AudioPlayer or Text markdown | Register the Kaltura catalog only. Call `setExtraMediaOrigins` for your own media host | The basic media `url` and markdown images are restricted |
| 7 | Everyone | Pass ids as numbers | `partnerId: "123"` is rejected |
| 8 | Hosts listening for `kaltura-entry-selected` | Listen on the element, or use `setEventHandler` | The event is scoped to the element. The `document` copy goes away in the release after 0.2.0 |
| 9 | Hosts that pass removed props | Delete them | See [Removed](#removed) |

## Install contract

Before: React was the only peer. The ESM carried its own `@a2ui/react`, `@a2ui/web_core` and `zod`.

After:

```bash
npm i github:kaltura/kaltura-a2ui-components#v0.2.0 @a2ui/react @a2ui/web_core zod react react-dom
```

Peers: `@a2ui/react ^0.11.1`, `@a2ui/web_core ^0.11.0`, `zod ^3.25.76`, `react ^19`, `react-dom ^19`. A conflicting version stops the install with `ERESOLVE` that names the peer. With `--legacy-peer-deps`, the ESM import fails with "Cannot find package".

Your `Catalog` class and the one in `kalturaReactCatalog` are now the same class, so `instanceof` works.

The script-tag bundle (`kaltura-wc.js`) is unchanged: self-contained, no peers.

### DOMPurify

`@a2ui/react` 0.11.1 depends on `@a2ui/markdown-it` 0.1.2, which pins `dompurify` 3.4.11. That version has published advisories, all fixed by 3.4.16. Override it in your `package.json` (pnpm: `pnpm.overrides`, Yarn: `resolutions`):

```json
{ "overrides": { "dompurify": "^3.4.17" } }
```

## CDN URLs

| | Before | After |
|---|---|---|
| Script | `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.1.4/dist/kaltura-wc.js` | `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/dist/kaltura-wc.js` |

Only the tag changes. Old URLs for tags up to v0.1.4 keep working, but they serve the 0.1.4 bundle, which has none of the 0.2.0 fixes and none of the host functions. SRI: copy the script tag from the Release notes, or take the `cdn["dist/kaltura-wc.js"]` value from the Release's `hashes.json`. More checks: [verify-release.md](verify-release.md).

## Kaltura Session

Before: `ks` was a required prop. Agents wrote it, or a data binding carried it.

After: `ks` is optional. Supply it from the host ([host-integration.md](host-integration.md#kaltura-session-ks)):

```ts
setKsProvider(widget => getKsFor(widget));
```

A non-empty provider result wins over a `ks` prop. The prop still works for older hosts, but a KS in agent output is not protected. Remove it from your agent prompts and from the data model. Privileges per widget: [ks-privileges.md](ks-privileges.md).

## Validation

Props are validated at run time on both paths (A2UI and web components).

| Input | 0.1.4 | 0.2.0 |
|---|---|---|
| `partnerId: "123"` | Not checked | Rejected. Use `123` |
| Recorder id that is not a positive integer | Built into the iframe | Plain-text error |
| Web component config with a bad value | Not checked | `role="alert"` message |
| Web component config that is not an object | Not checked | Plain-text error |
| `serverUrl` outside the five Kaltura regions | Imported | Rejected. See `setExtraAllowedOrigins` |
| Required prop still `undefined` (React) | Not checked | Renders nothing until it arrives |
| Required prop missing (web component) | Not checked | Alert. Set `el.config` later and it renders |
| One bad flashcard clip | The deck failed | "This clip cannot be shown." The rest works |
| `openUrl` with a non-`https:` URL | Opened | Blocked, with a console warning |
| Markdown image (Flashcards, basic Text) from a host the basic Image refuses | Loaded | Removed. The alt text stays |

Show errors to developers with `setErrorHandler` ([host-api.md](host-api.md#errors)).

## Removed

| Item | Replace with |
|---|---|
| Media Manager `contextType`, `userId` | Nothing. The component never read them |
| Recorder `category`, `entryName`, `allowScreen`, `allowCamera` | Nothing. The component never read them |
| `appVersion: '0.3.0'` sent to Unisphere | Nothing |
| Substring country matching in the geo map | Exact names, aliases and ISO codes |

## Behaviour changes

| Area | Change |
|---|---|
| `kaltura-entry-selected` | Fires on the `<kaltura-media-manager>` element with `detail.instanceId`. It still bubbles to `document` for one more release (`legacyDocumentEvents`, default `true`). Set `false` to stop that now. `detail.name` is untrusted text |
| Iframes | Player, flashcard clips and the captions editor no longer allow camera, microphone or display capture. Only the recorder does |
| Styles | Internal `--kaltura-*` tokens read your `--ds-*`, `--surface-*`, `--page-text*` and `--border-*` variables. With none set, surfaces are transparent and text inherits |
| Charts | At most 500 rows are drawn, with a note. The source table and CSV list all rows |
| Geo map | World data is pinned to `world-atlas@2.0.2` |
| CSV download | Cells starting with `=`, `+`, `-`, `@`, tab or CR get a leading `'` |
| `loadKalturaCatalog` | Keys the catalog by the descriptor's `catalogId`, then `$id`. It always returned the default before |
| Catalog JSON | Player gained `entryName`, `entryDescription`. Flashcards gained `partnerId`, `uiconfId`, `ks`. Media Manager gained `multiSelect` and its `mode` default is `select`. `ks` is no longer in any `required` list |
| Custom elements | Setting `el.config` at any time re-renders. Removing an element unmounts it one microtask later |

## Web component only hosts

```html
<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.2.0/dist/kaltura-wc.js" integrity="sha384-…" crossorigin="anonymous"></script>
<script>
  KalturaA2UIWebComponents.setKsProvider(widget => getKsFor(widget));
</script>
```

Take the `integrity` value from the Release ([CDN URLs](#cdn-urls)).

The script-tag bundle has `setKsProvider`, `setExtraAllowedOrigins`, `setRegion`, `setErrorHandler` and `setEventHandler`. It has no `setExtraMediaOrigins`, because it has no basic media components.

## Test your upgrade

1. Open the browser console. A rejected value prints a warning, and the component shows its alert.
2. Register `setErrorHandler` and log `code` and `widget` while you test.
3. Remove a peer on purpose in a scratch install to see the error you would get.
