# Project playbook

## Initialize

Pick the product's **entry-point Git repository**. It need not contain all code. It must hold or link the product's authoritative handbook, roadmap, backlog, decisions, measurements and other source records. Run `bun run studio -- init /path/to/checkout 'Project Name'` from the framework repository. Commit the new `knowledge-studio/` directory in the product repository. Add `/.knowledge-studio/` to that repository's ignore file for runtime locks and recovery state. If the product already has an older v1 `knowledge/` and `views/`, run `studio -- migrate /path/to/checkout` and review the new v2 tree before retiring old paths.

## Curate the graph

Create one JSON file per stable ID in `knowledge-studio/entities/`. Start with a Product, Source records and the key capabilities. Add requirements, components, repositories, interfaces, decisions, risks, experiments, validations, milestones and work packages as they become useful. Keep a curated map rather than transcribing the whole documentation set. A source location is either `{ "type": "local", "path": "docs/roadmap.md" }` or `{ "type": "external", "url": "https://..." }`. A local evidence section must match a `## Heading` in that tracked document; cite `{ "source": "SRC-001", "section": "Heading" }`. Source `details` stores the section keys. Repository records use `repo_url` for code outside the entry-point repository. Link with typed relations and run `studio -- validate /path/to/checkout`.

Unknown ownership, effort or dates stay `null` or absent. A backlog S/M/L label is not a person-week estimate. Work packages state a verifiable outcome and criterion; the agent can fill an effort range only when justified. Semantic targets and status live in entity files. Drag positions and provisional timing live only in `knowledge-studio/views/workspace.json`. Runtime recents, locks and rollback files live outside the semantic tree.

## Keep it current

When product behavior changes, the coding agent first updates the authoritative handbook or record, then the affected graph entities and their evidence citations in the **same product-repository branch/PR**. When work opens or closes, update its work package, requirement and dependency edges; close validation only with recorded evidence. When a decision changes, retain its stable ID or explicitly supersede it. When another repository changes, link its PR/commit from the source or relevant entity and update the entry-point graph in the coordinating PR. A graph assertion never outranks the underlying source document.

Review `git diff -- knowledge-studio` alongside code and documentation. The UI may adjust status, owner, confidence, relations, graph coordinates and provisional bars, but agents should own broad semantic changes. Run validation in CI. Avoid committing local runtime state, datasets, secrets or source material that lacks publication rights.

## Close the loop

A work package is done when its criterion is satisfied and a validation record points to the protocol/result or tracked test evidence. Update risks and milestone state from that evidence; do not infer dates or claim a pass from a link alone. Periodically scan backlinks for orphaned requirements, expired sources and open risks without owners, then resolve them in a reviewable PR.
