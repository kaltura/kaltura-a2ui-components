# Verify a release

Every release since 0.2.0 has three proofs. Examples use `v0.3.0`. Use the tag you install. All commands only read.

| Proof | Answers | Where |
|---|---|---|
| SRI hash | Did the browser get the bytes we built? | Release notes, `hashes.json` |
| Build provenance attestation | Did `release.yml` on `main` build this file? | GitHub attestations |
| `SHA256SUMS` | Are the downloaded Release assets intact? | Release asset |

## 1. SRI in the page

Copy the script tag from the [Release notes](https://github.com/kaltura/kaltura-a2ui-components/releases/tag/v0.3.0). It pins the full tag and carries `integrity`:

```
<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

The browser refuses the file if one byte differs. To check the hash by hand:

```bash
curl -sL https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js | openssl dgst -sha384 -binary | base64
```

It must equal the `dist/kaltura-wc.js` value in the Release's `hashes.json`, after `sha384-`.

The same holds for `kaltura-react.mjs`. It imports `html-element-stub.mjs`, so pin that file too. From 0.4.0, the catalog `x-kaltura-adapters.react` has `integrity` for the bundle and `stubIntegrity` for the stub, next to `cdn` and `stubCdn`. Each equals the `hashes.json` value of its file. Catalogs of 0.3.0 and older have no stub keys: take the stub hash from `hashes.json`.

## 2. Build provenance

Needs the GitHub CLI, logged in (`gh auth login`).

```bash
curl -sLO https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js
gh attestation verify kaltura-wc.js --repo kaltura/kaltura-a2ui-components \
  --signer-workflow kaltura/kaltura-a2ui-components/.github/workflows/release.yml \
  --source-ref refs/heads/main --deny-self-hosted-runners
```

`kaltura-react.mjs`, `kaltura_catalog.json`, `dist.tar.gz`, `THIRD_PARTY_NOTICES.txt`, `sbom.cdx.json`, `hashes.json` and `SHA256SUMS` are attested too (the last four from 0.4.0). Releases from 0.3.0 also attest `html-element-stub.mjs`, which `kaltura-react.mjs` imports ([ADR 0007](adr/0007-ssr-html-element-stub.md)). The attestation names the `main` commit the release was built from. The tag points to a release commit on top of it, which adds only `dist/` and the stamped catalog.

**SLSA level: Build L2.** `release.yml` runs on GitHub-hosted runners and signs provenance with `actions/attest-build-provenance`. The provenance is signed by the platform, not by our build steps, and names the workflow, the `main` commit and the run. It is not Build L3: the workflow is not a reusable workflow with an isolated build.

## 3. Release assets

```bash
gh release download v0.3.0 --repo kaltura/kaltura-a2ui-components --dir v0.3.0
cd v0.3.0 && sha256sum --check SHA256SUMS    # macOS: shasum -a 256 --check SHA256SUMS
```

`THIRD_PARTY_NOTICES.txt` has the licence of every package inlined in the bundles. The same file is in `dist/` and `dist.tar.gz`.

`sbom.cdx.json` is a CycloneDX SBOM of every locked package, dev ones too, because the bundles inline some dev dependencies.

## Not a real release

- A package on npm with this name. We do not publish to npm.
- A tag without a GitHub Release made by `release.yml`, or a file that fails step 2.
- Tags up to `v0.1.4`. They are older builds without these proofs.
