# Upstream tracking

What we sent to `a2ui-project/a2ui`, why, and how to move each item once upstream acts. State checked on 2026-11-17 with `gh` and `npm view`. Re-check before you act: the state column ages fast.

## Our contributions

| Item | Type | Why we did it | State |
|---|---|---|---|
| [#3197](https://github.com/a2ui-project/a2ui/pull/3197) | PR, fixes #3158 | `import "@a2ui/react"` throws `HTMLElement is not defined` in Node (SSR, build tools). Hosts on 0.13 to 0.15 hit it | Open. Mergeable, CLA green, no maintainer review |
| [#4208](https://github.com/a2ui-project/a2ui/pull/4208) | PR, docs | Lists the Kaltura catalog in "Catalogs and component libraries". Upstream asks listed catalogs to open this PR (plan item H3) | Open. Mergeable, one commit. Review comments answered on 2026-11-17 (Title Case fix, rebased on `main`). Waits for a maintainer review |
| [#3158](https://github.com/a2ui-project/a2ui/issues/3158) | Issue | Bug report behind #3197. Still reproduces on `@a2ui/react@0.15.0` | Open, P2, triaged |
| [#4059](https://github.com/a2ui-project/a2ui/issues/4059) | Issue | `@a2ui/markdown-it@0.2.2` peers `web_core ^0.14.0`, so a 0.15 project gets ERESOLVE or a red `npm ls` | Open, P2, triaged. `npm view` still shows 0.2.2 on 2026-11-16 |
| [Discussion 4207](https://github.com/a2ui-project/a2ui/discussions/4207) | Show and tell | Announces the catalog and the live demo. Backs the listing PR | Posted |

## Upstream items we only follow

We commented on these (status and test data). Others own them.

| Item | Why it matters to us | State |
|---|---|---|
| [#4073](https://github.com/a2ui-project/a2ui/pull/4073) | Bumps `@a2ui/markdown-it` to 0.2.3 with a `^0.15.0` peer. Fixes #4059 | Open, no human review. `@gspencergoog` was asked on 2026-11-09. The author fixed the review comments on 2026-11-16, including `satisfiesCaretRange` for a range like `^1.2` |
| [#3812](https://github.com/a2ui-project/a2ui/issues/3812) | `web_core` reads `error.errors`, which Zod 4 removed. Validation errors turn into a `TypeError`. Blocks us from moving to Zod 4 and its advisory fix | Open |
| [#3825](https://github.com/a2ui-project/a2ui/pull/3825) | Fix for #3812 | Approved by `@gspencergoog`, but conflicts with `main`. The author must rebase |
| [#4170](https://github.com/a2ui-project/a2ui/pull/4170) and [#4171](https://github.com/a2ui-project/a2ui/pull/4171) | `@child`, `@action` and `@functionCall` envelope keys. Plan gate G2 | Open. #4170 conflicts with `main` |

## What each item blocks, and what we do when it lands

| Upstream event | Do this on our side |
|---|---|
| #3197 merged and released in `@a2ui/react` | Bump the `@a2ui/react` pin. Run the full matrix. Add the Node import to the release notes as fixed |
| #4073 merged and `@a2ui/markdown-it@0.2.3` on npm | Plan gate G1: run `npm view @a2ui/markdown-it peerDependencies version`. If the peer is `^0.15.0`, remove the `@a2ui/markdown-it` entry from `overrides` in `package.json` and the README override text. Run `npm run check:consumer`. Drop the patched copy `kaltura/a2ui-markdown-it` in the demo |
| #3825 merged and released in `@a2ui/web_core` | Test `zod` 4 on a branch. If green, replace the dated Zod audit exception (plan gate G6) with the upgrade |
| #4170 and #4171 merged and released | Plan gate G2 and follow-up F1: move to `@child`, `@action`, `@functionCall` keys |
| #4208 merged | Add the upstream link to the README. Mark H3 done in the plan |

Until then we ship with `overrides` (plan decision D7). The demo uses the patched copy `kaltura/a2ui-markdown-it` at tag `v0.2.2-kaltura.1`.

## How to fast-track

Who we saw act: `Varun-S10` triages, reproduces and escalates. `gspencergoog` reviews and approves. Nobody has merged anything of ours yet.

| Item | Next step | Needs from the owner |
|---|---|---|
| #4208 | Done 2026-11-17: Title Case fix, rebased on `main`, reply posted. Next: wait for a review. Rebase again only if `main` conflicts | None |
| #3197 | Keep it mergeable. Last comment 2026-11-12. Comment again only with new facts, such as a release that still crashes. Ask `Varun-S10` who the reviewer is if nothing moves by 2026-11-26 | A go to comment |
| #4073 | Nothing to add. The author fixed the review comments on 2026-11-16. Only a maintainer review is missing. Test 0.2.3 as soon as it is on npm | None |
| #3825 | Asked the author to rebase on 2026-11-17 and offered a rebased PR that keeps their commit and credit. If there is no answer in a week, open it | None |
| #4059 and #3812 | Close automatically when #4073 and #3825 merge. Do not add more comments | None |

Rules that keep it working:

- One comment per item every one to two weeks, and only with new facts: a released version, a failing check, a test result.
- Every comment says what we tested (version, command, result). Maintainers can act on data, not on pings.
- Never ask for a private channel, a release date, or a priority change in public threads.
- Each upstream action (comment, push, rebase) needs a separate go from the owner. Do not batch them.
- Commits upstream use `z.babin@gmail.com` so the Google CLA check passes.

## How we check

| Gate | Command |
|---|---|
| G1 markdown-it peer | `npm view @a2ui/markdown-it peerDependencies version` |
| G2 envelope keys | `gh pr view 4170 --repo a2ui-project/a2ui --json state` (same for 4171), and `npm view @a2ui/web_core version` |
| #3197, #3825 | `gh pr view <n> --repo a2ui-project/a2ui --json state,mergeStateStatus,reviewDecision` |

No automatic weekly check is on `main`. A draft is in [PR 73](https://github.com/kaltura/kaltura-a2ui-components/pull/73) and is not approved for merge. Gates are in [the plan](plan-a2ui-1.0-upgrade.md).
