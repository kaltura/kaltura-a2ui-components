# 0004. Distribution: jsDelivr from git tags, no npm

Status: accepted, live since v0.2.0. Kaltura distributes this package through jsDelivr only, not npm.

Test IDs: SEC-09, QA-09, SEC-19. Code: `.github/workflows/release.yml`. Consumer checks: [SECURITY.md](../../SECURITY.md#releases).

## Context

- The package is not published to npm.
- jsDelivr `gh/<repo>@<tag>/` serves the whole repo tree at the tag, resolves the tag as semver, caches a hit for a year and sends `access-control-allow-origin: *`. A 404 is not cached.

## Decision

- `dist/` is never committed to `main`. CI fails if it is tracked.
- `release.yml` runs by hand from the head of `main` with a `version` input, `dry_run` on by default. The build job is read-only, runs `npm ci --ignore-scripts` and stamps the tag URLs and SRI into the catalog in its workspace.
- Only the `release` job (environment `release`) can write. It checks the artifact, makes one release commit on top of the `main` commit with `git add -f dist` and the stamped catalog, tags it `vX.Y.Z` and pushes only the tag. It never pushes a branch or forces.
- jsDelivr serves the tag. Catalog and README URLs use `cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@vX.Y.Z/...`. ESM hosts install `github:kaltura/kaltura-a2ui-components#vX.Y.Z` plus the peers.
- `package.json` is `"private": true`, so `npm publish` refuses to run.
- The GitHub Release carries `dist.tar.gz`, the stamped catalog, `hashes.json`, `SHA256SUMS` and a CycloneDX SBOM. The bundles, the catalog and `dist.tar.gz` get a GitHub build provenance attestation. A last job compares the jsDelivr bytes with `hashes.json`.

## Consequences

- No registry provenance. The proof is the GitHub attestation and the SRI hashes ([SECURITY.md](../../SECURITY.md#releases)). Consumers get no registry update or advisory alerts for it.
- Tags are immutable. jsDelivr caches a file at a tag for a year, so a moved tag would serve mixed bytes. A wrong release is fixed by a new version, never by moving the tag.
- Release commits are on no branch. `git log main` does not show them. `git fetch --tags` brings them in, and GitHub keeps them because a tag points to them. The attestation names the `main` commit the release was built from.
- jsDelivr serves only files in the tagged tree, with a per-package size limit. A large new asset needs a check against that limit.
- `npm i github:...#tag` installs the tagged tree, filtered by `files`. There is no `prepare` script, so nothing builds on the host.
