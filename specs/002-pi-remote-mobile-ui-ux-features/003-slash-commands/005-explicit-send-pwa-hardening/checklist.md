# Checklist — Explicit Send integration and iPhone/PWA hardening

- [x] Valid slash Send uses exactly one fresh one-use ticket and exactly one revision-checked prompt request; canonical command plus arguments reaches the host once. — `submitSlashDraft.ts` (one ticket then one submit); `submitSlashDraft.test.ts`/`submitSlashDraftTransport.test.ts` assert exact counts.
- [x] Host, session, session-revision, or catalog-revision races make zero Pi calls, preserve the draft, clear the unsafe binding, refresh the catalog, and request reselection. — `bindingMatchesSnapshot` fail-closed BEFORE ticket → `failed('stale')`; tested.
- [x] Disabled, hidden, malformed, unknown, stale, forbidden, incompatible, and delivery-unknown outcomes fail closed without automatic retry or send-as-text fallback. — pre-ticket guards + pre/post-submit failure mapping; "failures never retry"; tested.
- [x] Running turns never reinterpret slash commands as steer/follow-up, and missing authoritative running-state availability disables slash Send. — `!runtimeAuthority → no-running-authority`, `running → running` (both before ticket); tested.
- [x] Foreground, reconnect, and session switches cannot display another session's rows or retain another session's binding. — `commands.ts`/`state.ts` identity-change binding clears; `transcript-scope.test.ts`.
- [x] Ordinary non-slash Send and Enter behavior remains unchanged. — `SessionComposer.test.tsx`; existing tests green.
- [x] Draft, focus, and bounded progress behavior are preserved through revalidation, stale, denied, offline, reconnect, and foreground transitions. — draft-preservation tests.
- [ ] Installed-PWA true-390px light/dark checks pass with no horizontal scroll, keyboard obstruction, focus loss, unsafe zoom, or accessibility-tree regression. — captured at the feature-003 visual checkpoint (this feature's follow-up); no-overflow/focus proven by DOM tests now.
- [ ] The complete CDP matrix covers keyboard-open, loading, filtered, drafted, revalidating, stale, denied, running, 320px/200% text, rotation, and foreground-return states. — key states (open/filtered/drafted) captured at the checkpoint; the rest covered by DOM tests (not all offline-demo-reachable as stills).
- [ ] Physical iPhone checks pass for VoiceOver, Voice Control, Switch Control, Full Keyboard Access, Bluetooth keyboard, IME, zoom, rotation, background/foreground, offline/reconnect, themes, and reduced motion. — OPERATOR-REQUIRED (physical enrolled iPhone + assistive tech).
- [x] Catalogs, bindings, tickets, arguments, and prompt content are absent from persistence, URLs, service-worker responses, telemetry, crash reports, and diagnostic logs. — no persistence in the submit path (grep-confirmed) + in-memory-only engine; negative-control tests.
- [x] Security review signs off on ticket use, expected revisions, redaction, plan-mode enforcement, and telemetry/storage inspection. — Claude review recorded in `implementation-summary.md`.
- [x] `npm run typecheck` passes. — verified.
- [x] `npm test` passes. — verified, 168/168 on a clean run (the intermittent 167/168 is the known flaky auth foreground test; the two relay test files this phase touched pass 11/11).
- [x] `npm run test:web` passes. — verified, 358 passed (358) (+13 new).
