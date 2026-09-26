# CR-01: a worked agent workflow

The seed starts with two cameras and an 80 parts/minute planning target. SRC-004 already contains a conflicting proxy request. SRC-006 turns it into an explicit synthetic PM change: **four cameras and 120 parts/minute**.

Give a coding agent this prompt from the repository root:

> Read AGENTS.md, SRC-001, SRC-003, SRC-004 and SRC-006. Propose the minimum consistent model change for four synchronized cameras and 120 parts/minute. Preserve uncertainty. Update affected requirements, hardware constraints, experiment hypotheses, bandwidth/thermal exposure, measurable work-package outcomes and effort ranges. Treat milestone slips as proposals. Cite SRC-006/request on each affected entity. Do not invent benchmark results. Do not edit view layouts or provisional plans unless explicitly requested. Run the validator and inspect the Git diff.

The bundled deterministic proposal implements that reasoning in `demo_update` in the Rust core:

| Entities | Change |
| --- | --- |
| REQ-001, REQ-002 | 120 parts/minute and four synchronized cameras |
| CMP-001 | Four-camera constraint; transport remains unresolved |
| EXP-001, EXP-002 | Four-stream transport tests and new throughput/thermal hypothesis |
| RSK-001 | Likelihood and impact both 5/5 pending evidence |
| WP-001 | Four-camera sets; effort 2–4 → 4–7 pw; confidence reduced |
| WP-002 | Four-camera transport criterion; effort 2–5 → 3–6 pw |
| WP-006 | Eight-hour soak at 120/min with four cameras; effort 3–6 → 5–9 pw |
| MS-002, MS-003 | Targets move three weeks; marked proposed |

Run `bun run demo:apply`, then inspect `git diff -- examples/packinspect/knowledge-studio`. Reload the app to see changes from the CLI. An agent can instead edit the same JSON files directly; the CLI exists to make the showcase repeatable.

Expected consequences: total modeled effort rises from 30–58 to 35–65 person-weeks; three affected packages rise from 7–15 to 12–22. No validation becomes passed. Saved timeline bars do not move automatically. The engineer must reconcile planning against proposed milestone dates.

Run `bun run demo:reset` after the demonstration. It restores only the scenario's 11 files, preserves unrelated work, and refuses to overwrite later edits to affected files. If that happens, review and preserve those edits before restoring the stored post-demo version or resolving manually through Git.

This is a demonstration of a reviewable file contract and impact reasoning. It is not a claim that the software contains an autonomous reasoning engine.
