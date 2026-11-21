# 0012. Catalog versioning

Status: accepted (2026-11-21)

## Context

- The catalog id is the contract between agents and renderers. Agents deploy on their own schedule and keep the id in prompts and capability lists. Hosts pin a renderer tag. The two never move together.
- Until now the id was `v3`. Each release copied its catalog over `v3/` in [kaltura/a2ui](https://github.com/kaltura/a2ui). All changes so far were additive.
- `@a2ui/web_core` 0.16 renames the common component keys to `@accessibility`, `@checks`, `@catalogId` and `@metadata`. A catalog with the old keys fails validation on 0.16.

## Decision

| Rule | Detail |
|---|---|
| Id | `https://kaltura.github.io/a2ui/vN/catalog.json`. N is an integer. One folder per N. |
| Same id | A new component, a new optional prop, a new enum value, a longer description or a looser limit. Old messages stay valid. |
| New id | Remove or rename a component, prop, function or key. Make a prop required. Remove or narrow an enum value, type or limit. Change what a prop means. Any wire change the upstream renderer requires. Any change of protocol version. |
| Frozen | A published `vN` takes compatible changes only. Never edit it in a breaking way. A security fix may, and the release notes say so. |
| Kept online | Never delete a `vN` folder. |
| Support window | A renderer release serves the newest id. When a mechanical rewrite can translate the previous id, it serves that one too for at least one minor release. The release notes list the ids served and when the old one goes. Dropping an id goes under "Breaking for hosts". |
| Matrix | The README of kaltura/a2ui lists for each id: protocol version, renderer versions and the `@a2ui/web_core` range. Update it in every release. |

The 0.16 key rename ships as `v4`. `v3` stays online and frozen.

Not built yet: a CI check in kaltura/a2ui that fails when a pull request changes an existing `vN` folder in a breaking way.

## Consequences

- Agents on `v3` keep working until we drop it, and the notes give notice.
- A breaking catalog change costs a new folder, a matrix row and a release note. That is the point.
- This replaces the line "No compatibility layers for older versions" in [ADR 0010](0010-a2ui-1-0.md) for catalogs. The protocol rule of 0010 (1.0 only) stays.
