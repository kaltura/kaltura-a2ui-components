# Release

Run [`release.yml`](../.github/workflows/release.yml) by hand from `main`. jsDelivr serves the release from its git tag. There is no npm package (`package.json` is `"private": true`). Decision: [ADR 0004](adr/0004-npm-first-distribution.md).

```
inputs and main → ci + e2e → build and stamp → release commit, tag, GitHub Release → jsDelivr check
```

`dist/` is never committed to `main`. The tag points to a release commit on top of the `main` commit. That commit holds the CI-built `dist/` and the stamped catalog, and it is on no branch:

```
main:  ── A ── B            (B: version bump, merged by PR)
                \
                 R          (R: dist/ + stamped catalog)  ← tag v0.2.0
```

| Job | Does | Token scope |
|---|---|---|
| `verify-inputs` | Run must be on `main` and its commit must be the head of `origin/main`. `version` must be semver, equal `package.json`. `package.json` must be private. Tag `vX.Y.Z` must not exist, in the clone or on GitHub. `git ls-files dist` must be empty. | `contents: read` |
| `ci`, `e2e` | The normal suites, run again. | as in `ci.yml`, `e2e.yml` |
| `build` | `npm ci --ignore-scripts`, build, bundle and size checks, tests. Stamps the tag URLs, the install line and the SRI hashes of both bundles and the stub into the catalog (workspace only) and checks the result with `release-verify-stamp.mjs`. Makes `dist.tar.gz`, the SBOM, `hashes.json`, `SHA256SUMS` and the Release notes. Uploads one artifact. | `contents: read` |
| `release` | Environment `release`. Skipped on a dry run. Checks the artifact (`SHA256SUMS`, SRI with `openssl`, catalog integrity for both bundles and the stub), attests the files, makes the release commit, tags it, pushes only the tag and creates the GitHub Release. Runs no repo code. | `contents: write`, `id-token: write`, `attestations: write` |
| `verify-cdn` | Fetches both bundles, `html-element-stub.mjs` and the catalog from `cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@<tag>/`. Bytes and SRI must equal `hashes.json`. The catalog `integrity` and `stubIntegrity` must equal the served bytes (`stubIntegrity` only if the tag's catalog has it). Tries 20 times, 60 seconds apart. | `contents: read` |

The release commit is the same on every attempt: same tree, author `github-actions[bot]`, dates of the `main` commit and the run URL in the message. So a re-run finds its own tag and skips the push. A tag on any other commit fails the run. The workflow never pushes a branch and never forces.

## Cut a release

1. On a branch, bump the version: `npm version 0.3.0 --no-git-tag-version` (updates `package.json` and `package-lock.json`).
2. Check the PR titles since the last tag. GitHub turns them into the "What's changed" list, grouped by label (`.github/release.yml`). Label a breaking change `breaking` and link its migration doc in the PR.
3. Change the `v0.2.0` pins in `README.md` and the docs to `v0.3.0`. The docs test checks the README.
4. Merge the PR to `main`.
5. **Dry run.** Actions, `release`, Run workflow. Use workflow from `main`, version `0.3.0`, keep `dry_run` on. It runs every check and the build, and uploads the `release` artifact. It writes nothing.
6. **Real run.** Same, with `dry_run` off. Approve the `release` environment when GitHub asks.
7. Check that `verify-cdn` is green and the Release has `dist.tar.gz`, `kaltura_catalog.json`, `hashes.json`, `SHA256SUMS` and `sbom.cdx.json`.

A version with a suffix, such as `0.3.0-rc.1`, makes a prerelease Release that is never Latest.

### When a run fails

| Where | What to do |
|---|---|
| Before `release` | Nothing was written. Fix on `main` and run again. |
| In `release` or `verify-cdn` | Use **Re-run failed jobs**, not "Re-run all jobs": `verify-inputs` would stop on the tag that now exists. The re-run reuses the artifact and makes the same commit. |
| Tag exists on a wrong commit, or jsDelivr serves other bytes | Never move or delete the tag. Fix on `main`, bump to the next patch version and release again. |

jsDelivr caches a file at a tag for a year and has no purge for that. A wrong release stays wrong at its tag, so always release a new version.

## One-time admin setup

Not code. The workflow cannot do these, and it does not check them. Do them before the first real run.

1. **Environment.** Settings, Environments, New environment `release`. Under Deployment branches and tags, pick "Selected branches and tags" and add `main`. Do this first: GitHub creates an unprotected environment on first use.
2. **Required reviewers.** In the same environment, tick Required reviewers, add the people or teams who approve releases (up to 6) and save. Tick "Prevent self-review" to need a second person.
3. **Tag rulesets.** Two tag rulesets on the pattern `v*`. "Release tags are immutable": Restrict updates, deletions and force pushes, no bypass. "Release tags are created by maintainers": Restrict creations, bypass the repository roles Admin and Maintain and the release deploy key (step 5). Enforcement Active.
4. **Branch ruleset on `main`.** Settings, Rules, Rulesets, New branch ruleset for the default branch. Require a pull request, require the [checks below](#required-checks), block force pushes and restrict deletions. `release.yml` trusts that everything on `main` was reviewed.
5. **Release deploy key.** The job token cannot create tags under step 3. Add a write deploy key to the repository (Settings, Deploy keys, Allow write access) and add "Deploy keys" to the creation ruleset bypass list. Put its private key in the `release` environment secret `RELEASE_TAG_KEY`. The release job uses it for the tag push only, with the GitHub SSH host key pinned in the workflow. The secret is readable only by jobs that pass the environment gate (`main` and the reviewer). To rotate: add a new key, update the secret, delete the old key.

GitHub has no per-role switch for creating Releases. A Release needs a tag, and only the roles above can create one, so only they can release a new version.

### Required checks

Rulesets match checks by job name. A matrix job reports one check per leg.

| Workflow | Required | Not required |
|---|---|---|
| `ci.yml` | `lint and types`, `unit tests (node 24)`, `bundle and package checks`, `npm audit`, `dependency review` | `unit tests (node 26)` |
| `e2e.yml` | `e2e (chromium)`, `e2e (firefox)`, `e2e (webkit)` | |
| `security.yml` | `CodeQL`, `actionlint and zizmor`, `gitleaks` | |

`unit tests (node 26)` has `continue-on-error`, so a red run does not fail the workflow. When `.nvmrc` moves to a new major, update the matrix in `ci.yml` and this table.

## How consumers check a release

[verify-release.md](verify-release.md): SRI in the page, `gh attestation verify` and the `SHA256SUMS` asset.

## Nightly

[`nightly-live.yml`](../.github/workflows/nightly-live.yml) runs daily and by hand. It is read-only and opens no issues. A red run is the signal.

- `verify-cdn.mjs --latest`: reads the latest GitHub Release with the read-only job token and checks that jsDelivr serves the bytes in its `hashes.json`. A Release without `hashes.json` (before 0.2.0) or no Release at all prints a notice and passes.
- `release-unisphere-smoke.mjs`: each Unisphere region serves a loader with status 200, a JavaScript type, CORS and the `loader` and `createWorkspace` exports.

It does not mount a widget or use a partner.

## Local commands

`release:stamp` rewrites `src/catalog/kaltura_catalog.json`: run it only in a throwaway copy. `release:hashes` writes `hashes.json` and `SHA256SUMS` into `--out`. The rest only read.

| Command | Use |
|---|---|
| `npm run release:check -- 1.2.3` | Checks the version. Prints `version=`, `tag=` and `prerelease=`. |
| `npm run release:stamp -- --tag v1.2.3` | Stamps the tag and the SRI of both bundles and the stub from `dist/` into the catalog. |
| `node scripts/release-verify-stamp.mjs --tag v1.2.3` | Checks the stamped catalog against `dist/`. Fails on any left-over placeholder. |
| `npm run release:hashes -- --version 1.2.3 --out DIR` | `hashes.json` (from the working tree) and `SHA256SUMS` of every file in `DIR`. |
| `npm run release:notes -- --version 1.2.3 --hashes DIR/hashes.json` | Prints the install lines and SRI table of the Release notes. GitHub adds the change list. |
| `npm run release:verify -- --tag v1.2.3 --hashes DIR/hashes.json` | Compares jsDelivr with the hashes. Add `--cdn-origin http://127.0.0.1:PORT` for a local server with the `/gh/<repo>@<tag>/` layout. |
| `npm run release:verify -- --latest` | Nightly check. |
| `npm run release:smoke` | Unisphere loader check. |

Tests: `test/release/`. Workflow lint: `actionlint` and `zizmor` in `security.yml`.

## Actions

Every action is pinned by commit SHA with a version comment. To update one, resolve the tag to a SHA, check it with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (read-only), and change both. `test/release/workflows.test.ts` fails on an unpinned action.
