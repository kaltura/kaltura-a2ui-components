# Release

Push a `v*` tag. [`release.yml`](../.github/workflows/release.yml) does the rest. Nothing is committed, no tag is moved, and `dist/` is never tracked.

```
tag on main? → ci + e2e → build and stamp → npm publish → jsDelivr check → GitHub Release
```

| Job | Does | Token scope |
|---|---|---|
| `verify-tag` | Tag commit must be an ancestor of `origin/main`. Tag must equal `v<package.json version>`. `git ls-files dist` must be empty. | `contents: read` |
| `ci`, `e2e` | The normal suites, run again on the tag. | as in `ci.yml`, `e2e.yml` |
| `build` | `npm ci --ignore-scripts`, build, bundle and size checks. Stamps the CDN URL and both SRI hashes into the catalog (workspace only), then checks the result with `release-verify-stamp.mjs`. Packs the tarball, SBOM, `dist.tar.gz`, hashes. Uploads one artifact. | `contents: read` |
| `publish` | Environment `release`. Publishes the built tarball with `--provenance`. No checkout, no repo code. | `id-token: write` only |
| `verify-cdn` | Fetches the three CDN files and the registry entry. Bytes and integrity must equal the build hashes. | `contents: read` |
| `release` | Creates the GitHub Release with the artifact files. | `contents: write` only |

A prerelease tag such as `v1.2.0-rc.1` publishes under the npm tag `next` and creates a prerelease. Other tags use `latest`.

## Release steps

1. Bump `version` in `package.json` and `CHANGELOG.md` on `main`.
2. `git tag v<version>` on that commit, then `git push origin v<version>`.
3. Approve the `publish` job when GitHub asks (required reviewer).

If any job fails after the tag exists, do not move or reuse the tag. Fix on `main`, bump the version and tag again. A version already on npm is skipped by `publish`, so a re-run is safe.

## Dry run

Run `release.yml` by hand (Actions, Run workflow) and pick the **tag** as "Use workflow from". Leave `dry_run` on. It runs every check, builds, stamps and uploads the `release` artifact. It never publishes and never creates a Release. Use it to test the pipeline before the first real tag.

## One-time admin setup

Not code. The workflow cannot do these. Do them in this order.

1. **GitHub, Settings, Environments:** create `release`. Add required reviewers. Limit deployment to `v*` tags. Do this first: GitHub creates an unprotected environment on first use, so a job that names `release` before this step runs without approval.
2. **GitHub, Settings, Rules:** tag ruleset for `v*`: block deletion, updates and non-admin creation.
3. **GitHub, Settings, Branches:** protect `main` (pull request, the [required checks](#required-checks)). `verify-tag` trusts that everything on `main` was reviewed.
4. **npm:** own the `@kaltura` scope. Add a trusted publisher for `@kaltura/a2ui-react`: repo `kaltura/kaltura-a2ui-components`, workflow file `release.yml`, environment `release`. Needs npm 11.5.1 or later (the job checks this).
5. **GitHub, Settings, Variables:** set repo variable `NPM_PUBLISH` = `true`. Only after steps 1 to 4.

The workflow does not check step 1 itself. Reading the environment rules would need more token scope on `publish`, which should hold `id-token: write` only. Check it by hand.

### Required checks

Branch protection matches checks by job name. A matrix job reports one check per leg.

| Workflow | Required | Not required |
|---|---|---|
| `ci.yml` | `lint and types`, `unit tests (node 24)`, `bundle and package checks`, `npm audit`, `dependency review` | `unit tests (node 26)` |
| `e2e.yml` | `e2e (chromium)`, `e2e (firefox)`, `e2e (webkit)` | |
| `security.yml` | `CodeQL`, `actionlint and zizmor`, `gitleaks` | |

`unit tests (node 26)` has `continue-on-error`, so a red run does not fail the workflow. The old single check `unit tests` no longer exists: replace it in the branch rules. When `.nvmrc` moves to a new major, update the matrix in `ci.yml` and this table.

## Fallback: `NPM_PUBLISH` is not `true`

The pipeline still checks, builds and attaches the files to a GitHub Release. Nothing reaches npm or a CDN.

- `publish` and `verify-cdn` are skipped. The build prints a warning.
- The Release is always a **prerelease** and never Latest (`--prerelease --latest=false`). The notes say it is not on npm or a CDN. This also holds when the Release already exists.
- The catalog is stamped with the gh path `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@<tag>/...`. `dist/` is not committed, so those URLs return 404. They only keep the stamped file valid.
- Tags made before this pipeline keep working on the gh path.

## Nightly before the first npm release

`verify-cdn.mjs --latest` reads the newest version from the npm registry. If the package is not there yet, it prints a notice, checks nothing and exits 0. Once a version exists, any mismatch exits 1.

## CDN check timing

jsDelivr caches a 404 on a new npm path for 10 minutes, and a new version can take a few minutes to show up. `verify-cdn` tries 20 times, 60 seconds apart.

## Nightly

[`nightly-live.yml`](../.github/workflows/nightly-live.yml) runs daily and by hand. It is read-only and opens no issues. A red run is the signal.

- `verify-cdn.mjs --latest`: the live jsDelivr bundle, ESM and catalog match each other (npm path). Passes with a notice while the package is not on npm.
- `release-unisphere-smoke.mjs`: each Unisphere region serves a loader with status 200, a JavaScript type, CORS and the `loader` and `createWorkspace` exports.

It does not mount a widget or use a partner.

## Local commands

`release:stamp` rewrites `src/catalog/kaltura_catalog.json`: run it only in a throwaway checkout. `release:hashes` writes `hashes.json` and `SHA256SUMS` into `--out`. The rest only read.

| Command | Use |
|---|---|
| `npm run release:check -- v1.2.3` | Tag vs `package.json`. Prints `version=` and `npm_tag=`. |
| `npm run release:stamp -- --mode npm --tag v1.2.3` | Stamp catalog URLs and both SRI hashes from `dist/`. |
| `node scripts/release-verify-stamp.mjs --mode npm --tag v1.2.3` | Check the stamped catalog against `dist/`. Fails on any left-over placeholder. |
| `npm run release:hashes -- --version 1.2.3 --out DIR` | `hashes.json` and `SHA256SUMS` for the one `.tgz` in `DIR`. |
| `npm run release:verify -- --version 1.2.3 --hashes DIR/hashes.json` | Compare CDN and registry with the hashes. |
| `npm run release:verify -- --latest` | Nightly check. |
| `npm run release:smoke` | Unisphere loader check. |

Tests: `test/release/`. Workflow lint: `actionlint` and `zizmor` in `security.yml`.

## Actions

Every action is pinned by commit SHA with a version comment. To update one, resolve the tag to a SHA, check it with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (read-only), and change both. `test/release/workflows.test.ts` fails on an unpinned action.
