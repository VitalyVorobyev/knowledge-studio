# Model and persistence contract

The model has three separate layers. Semantic knowledge is versioned under `knowledge/`; saved projections are versioned under `views/`; local runtime state lives in memory and ignored `.packinspect/`. There is no UI database.

## Semantic entities

`knowledge/manifest.json` declares `schema_version: 1`, the project name and `synthetic: true`. Each entity lives at `knowledge/entities/<ID>.json`. Rust rejects duplicate IDs, mismatched filenames, unknown fields, unknown kinds/statuses/relations and unsupported schema versions.

IDs use a type-specific prefix and three digits: PRD, CAP, REQ, CMP, REP, INT, WP, DEC, RSK, EXP, DATA, VAL, MS, OWN, SRC. Team is the owner entity kind. Requirement assumptions use `status: assumption`, preserving their distinction from accepted requirements.

Every entity has `id`, `kind`, `title`, `summary`, `status`, `confidence` (0–1), nullable `owner`, `effort`, `outcome`, `work_type`, `validation_criterion`, `skill`, `milestone`, plus `evidence`, `relations`, and string-valued `details`. Keep fields in the order emitted by the Rust serializer, two-space indentation, final newline. Relations are sorted by type and target when saved; property maps have sorted keys. One entity per file keeps diffs small.

WorkPackage requires an owner, effort range `[low, high]` in person-weeks, outcome, type (`known`, `integration`, `research`), validation criterion, skill area, milestone and source justification. Use measurable engineering outcomes rather than component names.

`owner` is the editable convenience field; it must agree with exactly one `owned_by` relation when assigned. The inspector keeps these synchronized. `milestone` must reference a Milestone entity. Milestone `depends_on` edges identify gate outcomes.

## Relations

All targets must exist; self-links and duplicate type/target pairs are rejected.

| Relation | Direction / constraint |
| --- | --- |
| implements | Implementing entity → requirement, capability or architecture intent |
| depends_on | Dependent → prerequisite; cycles rejected |
| blocks | Risk or blocking entity → affected entity |
| validates | Protocol/experiment → Requirement, Capability or Component |
| derived_from | New knowledge → earlier source knowledge |
| supersedes | Replacement → previous entity |
| owned_by | Entity → Team; must agree with owner |
| implemented_in | Entity → Repository |
| uses | Consumer → used entity |
| motivated_by | Entity → Source |

Only the explicit target constraints above are enforced in v1; `implements`, `depends_on`, `blocks`, `uses`, `derived_from` and `supersedes` permit any existing type to allow mixed engineering graphs. Backlinks are derived in Rust and never stored. Evidence citations also appear as incoming source links.

## Evidence

Evidence is `{ "source": "SRC-001", "section": "slide-08" }`. Source entities identify a local Markdown basename in `details.file` and expose section excerpts in `details`. Rust checks the source entity, registered section and actual Markdown `## section` heading. The source browser renders the authored document, not an arbitrary filesystem path. Excerpts are summaries for quick inspection; when changing a source, update any corresponding excerpts and citations as part of the same agent review.

## Views

`views/workspace.json` carries `schema_version`, `layouts` keyed by view and stable entity ID, and `planning` keyed by WorkPackage ID. A plan contains zero-based `start` and positive `duration` in elapsed weeks from 2026-10-05. The Rust format supports up to 52 weeks; this showcase UI displays 28. View edits do not alter effort, requirements, owners or milestone target dates.

Dependency warnings compare provisional predecessor finish against dependent start. They are advisory. Moving a bar does not assert approval or propagate dates.

## Writes and concurrency

Tauri exposes five commands: load workspace, save entity, save views, apply/reset demo, read Git diff. The frontend has no general filesystem or shell API. Rust re-reads and validates the model under a workspace lock before writes, compares a snapshot revision (including source text), validates the proposed state and uses sibling-file rename for deterministic writes. A write-ahead rollback journal recovers interrupted batches on the next load. The demo stores before/after text for its affected files, and refuses reset if any were edited afterward.

Locks and the rollback journal are operational state. The demo backup is operational state too; do not delete it while the demo is applied. Git remains the durable history and review mechanism. No commit, push or remote operation occurs through the UI.

The compiled app defaults to the build checkout, with a `PACKINSPECT_ROOT` override. This intentional local-workspace binding avoids silently editing an unrelated current directory.
