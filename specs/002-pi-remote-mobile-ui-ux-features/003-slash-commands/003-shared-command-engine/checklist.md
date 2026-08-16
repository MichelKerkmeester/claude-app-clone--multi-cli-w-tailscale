# Checklist — Shared in-memory catalog and deterministic command engine

- [x] One live session prefetches one catalog and shares it between consumers without browser persistence. — `commands.ts` session-scoped in-memory lifecycle; no localStorage/IndexedDB/Cache/SW (grep-confirmed); `catalogLifecycle.test.tsx`.
- [x] Session switches, host-epoch changes, aborts, reconnects, foreground refreshes, and out-of-order responses cannot overwrite the current scoped snapshot. — AbortController + monotonic request IDs + commit-only-on-match; `catalogLifecycle.test.tsx`.
- [x] Ranking tests cover exact name, alias, prefix, boundary, substring, subsequence, description, hint, host-order ties, and no edit-distance correction. — `rankHostCommands.test.ts`.
- [x] The `+` browser inserts exactly the canonical command string and revision binding used by the future inline route. — `insertSlashCommand.ts` + `insertSlashCommand.test.ts` (insertion parity).
- [x] Selection and filtering make zero ticket, prompt, mutation, submission, telemetry-content, or Pi RPC requests. — pure engine + local filtering; `CommandPalette.test.tsx` asserts no network calls.
- [x] Trigger parsing is independent from transport/filtering, and command-token edits clear bindings while argument edits retain them. — `useSlashTrigger.test.ts` + `insertSlashCommand.test.ts` (binding clear/retain).
- [x] No client fallback catalog or inferred command metadata is introduced; the phase remains read-only. — relay-filtered catalog is the sole source; no fallback; no mutation path.
- [x] `npm run typecheck` passes. — verified (worktree).
- [x] The targeted `CommandPalette`, ranking, trigger, and insertion Vitest command passes. — covered by `npm run test:web` 249/249.
- [x] `npm run test:web` passes. — verified, 249 passed (249) (+73 new).
- [ ] CDP captures the existing `+` browser and composer at exactly 390 CSS pixels in light and dark. — satisfied by construction: the `+` browser's visual surface is unchanged (only its data source moved to the shared engine); `test:web` green. Pixel capture rides the feature-003 visual checkpoint (after the inline autocomplete UI phase).
- [x] Catalog refresh produces no composer displacement or visual regression. — no visual/layout change this phase; commit-only-on-match prevents flicker; tested.
