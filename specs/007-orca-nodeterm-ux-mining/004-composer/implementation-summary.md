---
title: "Phase 4 implementation summary — composer / input (defect fixes)"
description: "Composer defect-fix pass: re-report regression test, prompt-history send gate, new test coverage, a11y button styling, coincidental a11y test fix, and cheap section-numbering/optional-prop/unused-import fixes."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-26T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Applied review fixes: real re-report test, gated history, restore/paste tests, a11y button."
    next_safe_action: "Commit the orca-recs slice; dictation pipeline is next."
    completion_pct: 55
    blockers:
      - "T2.8 @-file search needs a host file-search RPC (requested in 007-host-requests)."
      - "T2.5/T2.9-T2.12/T2.14/T2.15 dictation pipeline deferred."
      - "T3.x verification tasks deferred."
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | In progress |
| Requirements | REQ-001 … REQ-008 (T2.x shipped: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.13; T2.8 BLOCKED-inert) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

This pass fixes P0-P2 defects identified in an independent review of the composer slice. No new features; every change is a root-cause fix.

### P0 — Re-report regression test rewritten
`app-mobile/tests/sheet-model-effort.svelte.test.ts`: The "does not clear a staged draftKey on identical host re-report" test was a fake — it built `refreshedControls` but never re-rendered the mounted sheet, so every assertion re-checked state already true before the "re-report" line. Rewritten to actually pass the re-reported controls via `view.rerender(...)`. The test also exposed a real bug: the sheet's open-reset `$effect` re-ran on every `runtimeControls` prop change because it depended on the reactive `isOpen` value. Fixed by using a manual transition flag (`previouslyOpen`) so a host re-report no longer wipes a staged `draftKey`.

**Negative control:** temporarily reverting to the naive open-reset made the test fail (`aria-selected="false"`). Restoring the transition guard made it pass. The test correctly catches T2.7 regression.

### P1 — Prompt history records un-accepted sends
`app-mobile/src/pages/chat/chrome/session-composer.svelte` `submit()`: `recordPromptHistory(prompt)` ran unconditionally before checking `canSubmit`, so no-op'd sends (e.g., typing while a prior send is in flight) still landed in localStorage history. Fixed by gating the record call with `if (canSubmit)`.

**New tests:**
- `canSubmit=false` → `localStorage.setItem` not called for `pi-remote.prompt-history`
- `canSubmit=true` → called exactly once

### P1 — Missing test coverage (T2.1 restore-on-reject, T2.4/T2.13 paste handler)
Added 6 new tests in `app-mobile/tests/session-composer.svelte.test.ts`:
- **Restore-on-reject:** renders with `initialPrompt`, sends, then rerenders with `promptError` — asserts the exact raw untrimmed draft is restored
- **Paste handler (image, media available):** mocks clipboard `DataTransfer` with an image/png item, dispatches `paste` event — asserts `preventDefault` called
- **Paste handler (image, media unavailable):** same paste but `mediaCapability=null` — asserts `preventDefault` NOT called
- **Paste handler (text):** text/plain item with media available — asserts `preventDefault` NOT called (native paste)

### P1 — Dead disabled/hover styling on "Recent prompts" button
`app-mobile/src/pages/chat/chrome/composer-tools.svelte`: The bare native `<button disabled={!composerEmpty}>` had no `use:hover`/`use:press`/`use:focusVisible` actions, so `[data-hovered]`/`[data-pressed]`/`[data-disabled]` selectors were dead. Replaced with the shared `Button` primitive (`$shared/primitives/button/button.svelte`) which wires those actions and `data-disabled`. The `:global(.tools--recall[data-disabled])` rule already exists with `cursor: not-allowed; opacity: 0.4`.

### P1 — Coincidental a11y Tab-count test
`app-mobile/tests/composer-tools-a11y.svelte.test.ts`: `renderTools()` never passed `composerEmpty`, so it defaulted to `false` and the Recall button was disabled/out of tab order — yet the test asserted 3 extra Tab stops and passed only via bits-ui focus-trap wrapping. Fixed: `renderTools(true)` so the Recall button is actually focusable, and the tab sequence corrected to 3 Tabs to reach the checkbox.

### P2 — Cheap fixes
- `app-mobile/src/shared/state/state.ts`: Renumbered duplicate section headers (CONNECTION→5, SESSION LIST→6, TRANSCRIPT DISPLAY→7, TRANSCRIPT REDUCER→8, SCOPE GUARD→8B, DISPLAY BLOCK PARSING→9, BLOCK NORMALIZATION→10)
- `app-mobile/src/pages/chat/chrome/composer-tools.svelte`: Made `composerEmpty` and `onRecallHistory` optional (`?`) in the interface, matching their defaulted/omitted call sites
- `app-mobile/src/shared/commands/use-mention-search.svelte.ts`: Removed unused `searchHostFiles` import
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Each defect was fixed at its root cause in the source file, then proven by real command output:
1. **TypeScript:** `npm run typecheck` → 0 errors
2. **Tests:** `npm run test:web` → 599 passed, 3 skipped, 0 failures (75 test files)
3. **Lint:** `npx eslint` on changed files → 0 new errors
4. **Source gates:** `bash run-source-gates.sh` → all PASS
5. **Negative control:** re-report test proven to fail when the preserve-draftKey logic is broken
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Transition flag for sheet open-reset.** The open-reset `$effect` was changed from a reactive `isOpen` dependency to a manual `previouslyOpen` flag. This is the minimal fix — the effect still runs on every render (Svelte 5 `$effect` semantics), but the reset logic only executes on the `false→true` transition. A host re-report that swaps `runtimeControls` while `isOpen` stays `true` no longer wipes `draftKey`.

**`recordPromptHistory` gated on `canSubmit`.** The existing `submit()` function already checks `canSubmit` for the text lane, `effectiveSlashSendable` for the slash lane, and `attachmentSubmission.submit()` for the attachment lane. The record gate uses `canSubmit` because it covers the text lane (the one that records history). The slash and attachment lanes do not record history (they have their own dispatch paths).

**Button primitive for "Recent prompts".** Using the shared `Button` primitive is the faithful approach — it already wires `use:hover`, `use:press`, `use:focusVisible`, and `data-disabled`, matching every other composer control. The existing `:global(.tools--recall[data-disabled])` CSS rule already provides the correct disabled affordance.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run test:web` | 599 passed, 3 skipped, 0 failures (75 files) |
| `npx eslint` on changed files | 0 new errors |
| Source gates | all PASS |
| Negative control (re-report test) | Fails when preserve-draftKey broken, passes when fixed |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This pass fixes defects only. The following remain deferred:
- T2.5/T2.9-T2.12/T2.14/T2.15: Dictation pipeline (rec 4.6 / ND-5.x)
- T2.8: @-file mentions (🚧 inert without host RPC)
- T3.x: Verification barriers (fail-closed, a11y-parity, traceability) — these are scoped to the full phase completion
<!-- /ANCHOR:limitations -->