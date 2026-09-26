# PackInspect Knowledge Studio

A complete local, **synthetic-only** showcase of an agent-first, Git-native engineering knowledge system. Tauri v2 + Rust own filesystem operations, validation and Git review; React + TypeScript + Vite render the projections. No account, backend service, telemetry, external fonts, cloud inference or company data.

## Run on this Mac

From this folder:

```sh
npm install
npm run dev
```

`npm run dev` starts Vite and the native Tauri window together. First compilation downloads public Rust/npm packages; subsequent use is local. Requires Node.js 22+, current stable Rust, Git and Apple Command Line Tools (`xcode-select --install`). This project was built with Node 24.20 and Rust 1.98 on this Mac.

If a preview server is already running on port 1420, stop it before `npm run dev`.

```sh
npm run desktop:build
open "src-tauri/target/release/bundle/macos/PackInspect Knowledge Studio.app"
```

The built app embeds the UI and needs no Vite process. It opens this repository through its build-time path. **Keep this folder in place**. To use another synthetic checkout or move it, rebuild there, or launch its executable with `PACKINSPECT_ROOT=/absolute/path/to/checkout`. The app does not copy the model into an internal database. It is a local development bundle, not notarized for distribution.

Optional browser preview:

```sh
npm run web
```

Open `http://127.0.0.1:1420`. Browser preview is intentionally read-only and uses bundled fixture files. The desktop app is the full filesystem-backed experience.

## Explore

The sidebar provides all 13 projections: overview, capability map, requirement traceability, system architecture, repositories, dependencies, roadmap, work packages, resources, risks, validation matrix, decisions/experiments and source evidence. The fixture contains 76 entities, including 12 work packages, 12 requirements, four teams, three milestones and six synthetic source documents.

- Search by ID, title, summary, owner ID or properties with **⌘K**. Filters apply to the current projection; linked entities remain available in the inspector.
- Click graph nodes, table rows or cards to inspect properties, typed relations, backlinks and exact evidence sections.
- In the desktop inspector, adjust status, confidence, ownership or relations, then select **Save changes**. Rust validates the whole model before writing the affected entity.
- Drag graph nodes to save layout positions. These changes touch only `views/workspace.json`.
- In Roadmap, drag a bar to move it, or its right edge to resize. Arrow keys move; Shift+arrow resizes. Plans are provisional elapsed weeks. Effort remains person-weeks. Overlapping dependencies are flagged; semantic milestone targets are not silently moved.
- **Reload** reads agent edits and validates the files. There is no automatic file watcher. An outdated UI cannot silently overwrite a model that changed since load.
- **Review diff** shows the local Git diff for knowledge, views and sources. Commit and branch operations remain ordinary agent/terminal Git operations.

## Agent change demo

1. Open Overview → **PM change demo**.
2. Review SRC-006 and the 11 affected entities.
3. Select **Apply synthetic proposal**.
4. Enable **CR-01 changes** or inspect the Git diff. Camera count becomes four, throughput becomes 120 parts/min, experiments expand, bandwidth/thermal exposure increases, affected work-package effort grows from 7–15 to 12–22 person-weeks, and two milestone targets move three weeks as proposals.
5. Select **Reset demo to baseline** to restore only those 11 files. Later edits to an affected file block reset; unrelated edits survive. No Git commit is created automatically.

The same workflow is available to an agent:

```sh
npm run validate
npm run demo:apply
git diff -- knowledge
npm run demo:reset
```

See [docs/agent-demo.md](docs/agent-demo.md) for a reusable agent prompt and interpretation of the change.

## Files and contracts

```text
knowledge/manifest.json    Schema version and synthetic-workspace declaration
knowledge/entities/*.json One semantic entity per stable ID
sources/*.md              Authored synthetic source documents with section anchors
views/workspace.json      Graph coordinates and provisional timeline plans only
app/                      React projections and targeted interactions
src-tauri/src/lib.rs       Rust model validation, persistence, backlinks and demo
src-tauri/src/main.rs      Narrow Tauri command boundary
src-tauri/src/bin/         CLI using the same Rust core
.packinspect/             Ignored local locks, rollback journal and demo backup
```

See [docs/model.md](docs/model.md) for fields, relation rules and state separation. [AGENTS.md](AGENTS.md) gives coding-agent working instructions.

## Quality checks

```sh
npm test                 # component tests + Rust model/write tests
npm run lint             # TypeScript + Prettier
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
npm run validate
npm run desktop:build
```

Rust tests cover malformed schemas, duplicate IDs, broken references, invalid effort, dependency cycles, source anchors, deterministic round trips, stale revisions, view/semantic separation, rollback recovery and demo apply/reset. Frontend tests cover explicit save, evidence navigation, relation drafts, keyboard planning and evidence metrics.

## Deliberate limits

- One repository workspace and a 28-week timeline viewport. No authentication, rich-text editor, background agent service, live devices or cloud.
- The scenario is a deterministic worked example; it does not call an LLM or discover arbitrary impact automatically.
- Team load is an effort summary with hypothetical capacity, not a resource-constrained scheduling optimizer.
- Validation results, datasets and repositories are synthetic planning records. No physical inspection hardware, images, production benchmark or nested product-code repositories are bundled.
- Layout uses simple deterministic columns/dependency depth, then manual positioning. Dense graphs benefit from filtering and zooming.
- Status and confidence are human/agent assertions. A passed synthetic protocol is not physical product acceptance.
- Saves are serialized between app/CLI instances, revision-checked and journaled. External editors do not participate in the lock; coordinate edits rather than writing simultaneously. The journal is crash-recovery assistance, not a distributed transaction service. After an abnormal crash, close all instances before removing a stale `.packinspect/write.lock`.
- Schema v1 rejects unsupported versions. Future migrations must be explicit; no migration to a nonexistent v2 is invented.

A useful next iteration is a generalized patch-review workflow: let an agent produce a proposed change set with before/after field diffs and affected subgraphs, then selectively accept it in the UI.
