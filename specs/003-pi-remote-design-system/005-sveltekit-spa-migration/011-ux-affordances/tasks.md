---
title: "Child 011 tasks — post-migration UX affordances"
description: "Task ledger for operator-requested visual affordances on the shipped Svelte app."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/011-ux-affordances"
    last_updated_at: "2026-08-24T03:21:51Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Operator confirmed the glass on a device; the packet is complete."
    next_safe_action: "None — the packet is complete."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 tasks

---

<!-- ANCHOR:notation -->
## Task Notation

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason.
Each task carries its evidence inline, so the ledger is readable without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] **T1.1** Confirm the affordance already exists rather than building a second one.
      Found at `TranscriptList.svelte:260` — 2.75rem circular button, down-chevron, centred above the
      composer, revealed on `!atLiveEdge` (96px threshold), unread badge, hidden while the slash
      palette is open, `followToBottom()` on tap.
- [x] **T1.2** Identify the app's established glass idiom instead of inventing one.
      `Header.svelte:83` and `SessionHeader.svelte:282` both use
      `color-mix(in oklch, <surface> 90–91%, transparent)` + `backdrop-filter: blur(12px)`.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] **T2.1** Append the `@supports`-guarded glass layer, leaving the opaque base rule intact as the
      fallback.
- [x] **T2.2** Append the `prefers-contrast: more` opaque fallback with the `--line-strong` carry,
      ordered last so it wins the cascade.
- [x] **T2.3** Keep the change append-only — no edit to geometry, reveal logic, badge or `aria-label`.
- [x] **T2.4** Make Stop its own control instead of a state of the primary disc, so a draft never
      hides the interrupt. `session-composer.svelte` renders it whenever `running &&
      connection === 'live'`; the former `showStop` derived value is gone.
- [x] **T2.5** Leave the draft untouched on abort. `stopRun` in `screen-chat.svelte` only calls
      `abortPrompt()` and never clears `prompt`; the form's old `if (showStop) return` guard was
      removed, and `sendPrompt` already refuses an empty message so an empty submit stays a no-op.
- [x] **T2.6** Render the draft action only when there is something to send, so a running turn with
      an empty composer shows the interrupt alone rather than an enabled steer disc that does
      nothing. Both controls appear together once text or an attachment is present.
- [x] **T2.7** Carry the new control through the `prefers-contrast: more` and `forced-colors: active`
      groups, so the interrupt keeps a visible border where system colours replace the palette.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] **T3.1** Frozen token set untouched — `token-identity.mjs verify`: 35 goldens matched across
      light/dark/system.
- [x] **T3.2** Behaviour did not move — diff is 29 insertions / 0 deletions.
- [x] **T3.3** Board — build RC 0; typecheck 0 errors / 1123 files; Svelte suite 530 passed;
      catalog smoke 534 frames / 0 throws.
- [x] **T3.4** Confirm the glass reads correctly on device. [evidence: operator confirmed on a device —
      the one criterion no gate can decide, and the reason the packet stayed open after every gate
      was green]
- [x] **T3.5** Draft preservation proved by test, not by inspection.
      `app-mobile/tests/SessionComposer.svelte.test.ts` asserts by accessible name that a running
      turn with an empty draft exposes only "Stop the current turn", that a typed draft exposes both
      it and "Steer the current turn", and that the typed text is still in the field after Stop.
- [x] **T3.6** Board re-run whole from the final state — build RC 0; typecheck 1123 files / 0 errors;
      backend 50 files / 385 tests RC 0; Svelte 67 files / 539 passed / 3 skipped and logic 16 files
      / 188 passed, RC 0; token identity 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and
      system; catalog smoke 267 stories x 2 themes = 534 frames / 0 throws; runtime smoke 4/4
      surfaces / 0 errors; design-system 390 CSS-pixel width with no horizontal overflow in both
      themes.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

All five success criteria in `spec.md` §5 hold, evidenced by the gate table in `plan.md` §2. The operator has
confirmed on a device, which closes criterion 1 — that the control *reads* as glass — and with it the
packet.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- `spec.md` — requirements and success criteria.
- `plan.md` — the three-layer cascade and the gate results.
- Program goal: `../goal.md` — the zero-rendered-change invariant this packet is the exception to.
<!-- /ANCHOR:cross-refs -->
