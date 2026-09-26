# Local verification — 26 September 2026

## Passed

- Frontend: six Vitest / Testing Library tests covering explicit semantic saves, evidence navigation, dependency drafts, keyboard timeline edits and coverage/effort metrics.
- Rust: eleven tests covering schema/reference integrity, cycle rejection, canonical serialization, stale revisions, safe writes, view/semantic separation, source anchors, journal recovery and demo apply/reset behavior.
- TypeScript and Prettier checks; Rust formatting and Clippy with warnings denied.
- Schema validation: 76 entities, six source documents, schema v1.
- Production Vite build and native Tauri macOS app bundle.
- One-command `npm run dev`: Vite starts, Rust compiles, and the native executable starts without a reported error.
- Browser smoke test: all 13 views rendered; no browser console errors/warnings. Verified search for WP-009, its inspector, dependencies, incoming milestone/risk/work-package links, source evidence, and PM-change preview. Tested laptop layout at 1280 × 900.
- Actual CLI change round trip: exactly 11 entity files changed; modeled effort became 35–65 person-weeks; view files remained unchanged; reset restored all model/view files byte-for-byte.
- npm dependency audit: zero reported vulnerabilities at install/check time.

## Remaining manual verification

macOS reported that the MacBook was locked and could not be automatically unlocked. The native executable launched, but visual confirmation and mouse/keyboard interaction with the native Tauri window could not be completed while locked. Browser interaction tests and Rust persistence tests passed independently; they do not substitute for that remaining native check.

After unlocking, verify these in the native app:

1. Open WP-009; change status to blocked; save; inspect the single-entity Git diff; restore planned and save.
2. Drag an architecture node; reload; confirm its position persists in views/workspace.json.
3. Move and resize a roadmap bar; reload; confirm only view state changed.
4. Apply CR-01, filter its 11 entities, review the Git diff, and reset the demo.
5. Reload after an external agent file edit; confirm the new content appears.

The shipped workspace is left at the synthetic baseline, with the demo reset. No remote Git repository is configured or published.
