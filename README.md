# Knowledge Studio

A local-first, Git-native project knowledge workbench. Agents edit small structured files; humans explore the resulting graph in 13 linked views and make targeted changes to work packages, status, ownership, relations, layout and provisional plans. Rust validates and writes the model. There is no account, cloud service, or UI database.

[PackInspect](examples/packinspect/) is a wholly synthetic example. A real product keeps `knowledge-studio/` **inside its own entry-point repository**. That repository links to other code repositories and authoritative resources rather than copying them.

## macOS setup

Install [Bun](https://bun.sh/), the Rust toolchain, and the [Tauri v2 macOS prerequisites](https://v2.tauri.app/start/prerequisites/). From this repository:

```sh
bun install --frozen-lockfile
bun run dev
```

Choose a project folder in the app, or open the PackInspect example. Recent projects are stored in the app's local data directory. `bun run web` starts a read-only PackInspect browser preview at `http://127.0.0.1:1420/`.

```sh
bun run build                 # TypeScript and Vite
bun run desktop:build         # native .app bundle
bun run test                  # frontend and Rust tests
bun run lint                  # typecheck and formatting
bun run studio -- init /path/to/git-checkout 'Project Name'
bun run studio -- validate /path/to/git-checkout
bun run studio -- migrate /path/to/legacy-v1-checkout
bun run validate:demo
bun run demo:apply            # synthetic PackInspect change
bun run demo:reset
```

The app does not commit changes. Review the selected repository's Git diff after any edit. To use another project locally, choose a checkout containing its `knowledge-studio/` integration.

On **Work packages**, use **New work package** to record a verifiable outcome and cite an existing source section. Optional owner, milestone, dependency and effort may stay unknown. The inspector edits the package text and metadata. Deletion requires a second action and is blocked until all incoming relations are removed; it also clears saved layout and provisional planning for that package. Newly created files appear in **Review diff** even before staging. UI writes never commit automatically.

## Repository layout

- `app/` — React/TypeScript views, graph, timeline and inspector.
- `src-tauri/src/lib.rs` — Rust schema v2, validation, backlinks, deterministic file writes, rollback journal and demo.
- `src-tauri/src/main.rs` — Tauri project selection, recent list and desktop commands.
- `examples/packinspect/` — synthetic source documents and complete example graph.
- `docs/playbook.md` — set up and maintain a project through its product lifecycle.
- `docs/model.md` — file contract and migration behavior.
- `docs/agent-demo.md` — the PackInspect change walkthrough.

MIT licensed. See [LICENSE](LICENSE).
