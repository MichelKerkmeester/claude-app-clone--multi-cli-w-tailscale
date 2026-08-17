# Checklist — Phase 3 — Persistent composer control and keyboard affordance

- [x] The mode button is one tab stop after `+`, visible without opening the tools popover, and has a consequence-bearing accessible name. — `PlanModeButton.tsx`; `PlanModeButton.test.tsx` + `App.test.tsx`.
- [x] Menu focus movement causes no mutation; only activation does; Plan entry remains host-confirmed and Build exit opens the leave sheet before mutation. — `PlanModeMenu.tsx`/`LeavePlanSheet.tsx`; `PlanModeMenu.test.tsx`.
- [x] Bare `Tab` and outside-composer `Shift+Tab` retain browser focus behavior; all composition, repeat, modifier, pending, connection, and running-turn guards produce zero mode requests. — `usePlanModeShortcut.ts` guards; `usePlanModeShortcut.test.tsx`.
- [x] Ten rapid activations produce at most one in-flight request; stale and delivery-unknown outcomes disable controls and reconcile without retry. — single-flight `setMode` (mutationInFlightRef); `runtime.test.tsx` plan-mode mutation lane (`toHaveBeenCalledTimes(1)`).
- [x] Build, Plan · read-only, Mode unavailable, Checking mode, offline, forbidden, unsupported, and extension-error presentations are readable in both themes and never flash unconfirmed authority; Executing plan is reserved for confirmed host state. — `modeAuthority` derives from confirmed host snapshot only; `contrast.test.tsx` + component tests.
- [x] Every Build exit from Plan opens `LeavePlanSheet`; no host mutation occurs before `Switch to Build`, and `Stay in plan` preserves confirmed Plan. — `LeavePlanSheet.tsx`; tested.
- [x] A settled mode transition announces once and does not move focus. — `RuntimeModeAnnouncer.tsx` polite region; tested.
- [x] Cached history cannot enable mode controls, and refresh/reconnect/foreground resume await authoritative hydration. — `cache.ts` + `BLOCKED_MUTATION_PHASES` (checking blocks mutation); `runtime.test.tsx`.
- [x] `npm run typecheck` passes. — verified (worktree).
- [x] The focused `npm run test:web -- ...` command passes for all listed Plan mode, runtime, app, and contrast tests. — covered by full `npm run test:web` 431/431 (+72 new).
- [ ] The running PWA is checked at exactly `390px` in light and dark mode with true CDP screenshots for Build, Plan, pending, unavailable, offline, and keyboard-open states where supported. — captured at the feature-004 batched visual pass (needs a `demo.ts` mode/plan-status fixture sync); no-overflow + never-flash-unconfirmed proven by DOM tests now.
- [x] The scoped phase diff contains only the intended web control, runtime, styling, cache, and test changes. — `git status`: web src/tests only; no relay/protocol/extension/spec; zero new colors.
