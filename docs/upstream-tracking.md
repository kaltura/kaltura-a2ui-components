# Upstream tracking

What we sent to `a2ui-project/a2ui`, why, and how to move each item once upstream acts. State checked on 2026-11-25 with `gh` and `npm view`. Re-check before you act: the state column ages fast.

## Our contributions

| Item | Type | Why we did it | State |
|---|---|---|---|
| [#3197](https://github.com/a2ui-project/a2ui/pull/3197) | PR, fixes #3158 | `import "@a2ui/react"` threw `HTMLElement is not defined` in Node (SSR, build tools) | **Merged** 2026-11-20. In `@a2ui/react` 0.16.x |
| [#3158](https://github.com/a2ui-project/a2ui/issues/3158) | Issue | Bug report behind #3197 | Closed 2026-11-20 |
| [#4208](https://github.com/a2ui-project/a2ui/pull/4208) | PR, docs | Lists the Kaltura catalog in "Catalogs and component libraries" | Closed 2026-11-25 by triage ("submit to a2ui.org/ecosystem/renderers"). That page's steps are this same PR flow. We asked on the PR whether a separate form exists, or if it can be reopened |
| [#4059](https://github.com/a2ui-project/a2ui/issues/4059) | Issue | `@a2ui/markdown-it@0.2.2` peered `web_core ^0.14.0` | Fixed by `@a2ui/markdown-it` 0.2.3 and 0.2.4 (npm, 2026-11-23). Asked to close |
| [Discussion 4207](https://github.com/a2ui-project/a2ui/discussions/4207) | Show and tell | Announces the catalog and the live demo | Posted, no replies |

## Upstream items we only follow

| Item | Why it matters to us | State |
|---|---|---|
| [#4073](https://github.com/a2ui-project/a2ui/pull/4073) | Bump of `@a2ui/markdown-it` to 0.2.3 | Open, conflicts with `main`. Redundant: 0.2.3 and 0.2.4 are published. We said so on the PR |
| [#3812](https://github.com/a2ui-project/a2ui/issues/3812) | `web_core` reads `error.errors`, which Zod 4 removed. `web_core` 0.16.1 still does in `validation/payload-validator.js` and `catalog/types.js`. Blocks Zod 4 and its advisory fix | Open |
| [#3825](https://github.com/a2ui-project/a2ui/pull/3825) | Fix for #3812 | Approved, clean (rebased by the author on 2026-11-18). Not merged |
| [#4170](https://github.com/a2ui-project/a2ui/pull/4170) and [#4171](https://github.com/a2ui-project/a2ui/pull/4171) | `@child`, `@action` and `@functionCall` envelope keys. Plan gate G2 | Open. #4170 conflicts with `main`. No activity since 2026-11-11 |

## What each item blocks, and what we do when it lands

| Upstream event | Do this on our side |
|---|---|
| #3825 merged and released in `@a2ui/web_core` | Test `zod` 4 on a branch. If green, replace the dated Zod audit exception (plan gate G6) with the upgrade |
| #4170 and #4171 merged and released | Plan gate G2 and roadmap F1: move to `@child`, `@action`, `@functionCall` keys |
| #4208 reopened and merged, or a listing accepted another way | Add the upstream link to the README. Mark H3 done in the plan |

Done: #3197 (SSR fix, in 0.16) and the markdown-it peer (0.2.4, no override needed). Both are in the 0.16.1 adoption.

## How to fast-track

Who we saw act: `Varun-S10` triages, reproduces and escalates. `gspencergoog` reviews and approves. `polina-c` triages and closes. Upstream merged #3197, our first item, on 2026-11-20.

| Item | Next step | Needs from the owner |
|---|---|---|
| #4208 | Wait for the answer to our comment. If told to use another form, use it | A go for each upstream action |
| #3825 | Wait for a merge. It is approved and clean | None |
| #3812 | Closes when #3825 merges. Do not add comments | None |
| #4170, #4171 | Only watch. Comment only with test data | A go to comment |

Rules that keep it working:

- One comment per item every one to two weeks, and only with new facts: a released version, a failing check, a test result.
- Every comment says what we tested (version, command, result). Maintainers can act on data, not on pings.
- Never ask for a private channel, a release date, or a priority change in public threads.
- Each upstream action (comment, push, rebase) needs a separate go from the owner. Do not batch them.
- Commits upstream use `z.babin@gmail.com` so the Google CLA check passes.

## How we check

| Gate | Command |
|---|---|
| G1 markdown-it peer (clear) | `npm view @a2ui/markdown-it peerDependencies version` |
| G2 envelope keys | `gh pr view 4170 --repo a2ui-project/a2ui --json state` (same for 4171), and `npm view @a2ui/web_core version` |
| #3825 | `gh pr view 3825 --repo a2ui-project/a2ui --json state,mergeStateStatus,reviewDecision` |

No automatic weekly check is on `main`. A draft is in [PR 73](https://github.com/kaltura/kaltura-a2ui-components/pull/73) and is not approved for merge. Gates are in [the plan](plan-a2ui-1.0-upgrade.md).
