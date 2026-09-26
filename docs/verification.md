# Verification

Run `bun run test`, `bun run lint`, `bun run build`, `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`, and `bun run studio -- validate <project-root>`. Verify project switching and inspector/layout changes in the native app. PackInspect is synthetic; Visual Anomaly Lab validation uses tracked public sources only.
