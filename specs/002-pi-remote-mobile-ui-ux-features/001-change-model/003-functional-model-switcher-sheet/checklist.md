# Checklist — Functional model switcher sheet and state machine

- [x] Opening always starts a fresh catalog request and an older response cannot overwrite a newer generation. — `runtime.ts` request-generation + AbortController; `tests/runtime.test.tsx`.
- [x] Seven models render without a search field; eight models render search in the same dialog. — `ModelSwitcherSheet.test.tsx` search-threshold tests.
- [x] Provider grouping, current-provider ordering, current-model ordering, retired-current insertion, and unavailable-row mapping are deterministic. — pure helpers in `model-catalog.ts`; `tests/model-catalog.test.ts` (4 passed).
- [x] Row activation and Enter staging change only draft state and issue no ticket or control request. — `ModelSwitcherSheet.test.tsx` "makes staging network-free" (fetch asserted 0 calls until Switch).
- [x] One **Switch model** activation produces exactly one bound ticket and one control command with the exact target and both revisions. — same test: `toHaveBeenCalledTimes(2)` = one `/api/runtime/ticket` + one `/api/runtime/control` with the bound ticket in the body.
- [x] Dismissal and repeat controls are inert while commit is in flight. — committing-state test in `ModelSwitcherSheet.test.tsx`.
- [x] Accepted host state alone updates the header, closes the sheet, restores focus, and announces success. — `ModelSwitcherSheet.test.tsx` + `App.test.tsx`; header `.session-model-name` unchanged until acceptance.
- [x] Stale, unavailable, policy-blocked, and delivery-unknown outcomes keep the confirmed model, show the required state, and never retry. — `tests/runtime.test.tsx` terminal-outcome/no-retry tests.
- [x] Delivery-unknown requires read-only reconciliation before another commit and never presents the target as current. — `runtime.ts` delivery-unknown barrier; `tests/runtime.test.tsx`.
- [x] Streaming permits browsing/staging, blocks commit for false/unknown capability, and shows next-turn text only after host confirmation. — streaming-gate handling in `runtime.ts`/`ModelSwitcherSheet.tsx`; covered in tests.
- [x] Foreground reconciliation, offline, unreachable, access-denied, keyboard navigation, Escape, and search-clear behavior are covered by automated tests. — `App.test.tsx` visibility reconcile; `ModelSwitcherSheet.test.tsx` keyboard/Escape/search-clear.
- [x] The second security review confirms no mutation path exists from staging or failure states and no raw/sensitive data crosses storage, URL, log, or telemetry boundaries. — Claude review: staging is network-free (test-proven), only Switch issues the Phase-1 ticket/control, identity uses validated keys, no URL/persistent state.
- [x] `npm run typecheck` passes. — exit 0 (worktree, outside sandbox).
- [x] `npm test` passes. — exit 0, 140 passed (140) (backend unchanged, zero regressions).
- [x] `npm run test:web` passes. — exit 0, 55 passed (55) (+15 new web tests).
- [x] True-390px light/dark CDP captures cover `ready`, `staged`, and `committing`. — captured at the feature-001 visual checkpoint (post-004 final state): `ready` and `staged` in light and dark at true 390×844 (no horizontal overflow at 390px or 320px), delivered to the operator. `committing` is a sub-second transient over the demo reducer; it is covered by the committing-barrier DOM test rather than a still capture. `demo.ts` was contract-synced to the Phase-1 expanded catalog + ticket endpoint to render the sheet.
- [x] DOM checks show one modal dialog, no nested picker overlay, valid listbox/option semantics, current/draft labels, and no horizontal overflow. — `ModelSwitcherSheet.test.tsx` (one modal/listbox; `aria-current`+Current on confirmed, `aria-selected`+Selected on draft; no-overflow assertion).
