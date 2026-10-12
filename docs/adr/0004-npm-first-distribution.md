# 0004. npm-first distribution

Status: accepted (2026-10-12). Pipeline written and tested offline. Not yet run live (see Consequences).

Findings: SEC-09, QA-09, SEC-19. Code: `.github/workflows/release.yml`. Runbook: [release.md](../release.md).

## Context

- The old workflow (`build-and-release.yml`) committed `dist/` onto the tag commit and force-moved the tag, so published bytes could differ from the tagged commit. It had `contents: write` for the whole job and its actions were not pinned by SHA.
- jsDelivr serves `gh/...@tag` from the tagged commit, and it caches a 404 if the file is not there yet.
- `npm view @kaltura/a2ui-react` returned E404 on 2026-10-12: the package was never published.

## Decision

- `dist/` is never committed and a tag is never moved. CI guards both.
- A `v*` tag from `main` runs `release.yml`. The build job is read-only, runs `npm ci --ignore-scripts` and stamps the CDN URL and SRI into the catalog in the workspace only. Only the `publish` job has `id-token: write`.
- The package is published to npm with trusted publishing (OIDC) and `--provenance`. There is no `NPM_TOKEN`.
- jsDelivr serves the npm package. Catalog and README URLs use `cdn.jsdelivr.net/npm/@kaltura/a2ui-react@<version>/dist/...`. Pin the exact version.
- A verify job compares the CDN bytes and the registry integrity to the build hashes. The GitHub Release carries `dist.tar.gz`, the tarball, `hashes.json`, `SHA256SUMS` and a CycloneDX SBOM.
- Old `gh/...@v0.1.x` URLs keep working, because those tags are immutable.

## Consequences

- The published bytes link to a commit and a workflow run.
- A cached 404 cannot happen: the npm path only exists after publish.
- Needs admin work that code cannot do: the `@kaltura` scope, a trusted publisher entry, the `release` environment and a tag ruleset. Until `NPM_PUBLISH` is `true`, the pipeline falls back to the `gh` path and the catalog URLs do not resolve.
- No live release has run. The first tag will test the pipeline for real.
