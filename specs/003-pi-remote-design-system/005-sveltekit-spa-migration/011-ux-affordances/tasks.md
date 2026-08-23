---
title: "Child 011 tasks — post-migration UX affordances"
description: "Task ledger for operator-requested visual affordances on the shipped Svelte app."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/011-ux-affordances"
    last_updated_at: "2026-08-23T06:20:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "REQ-001 glass scroll-to-latest shipped; board green."
    next_safe_action: "Operator confirms the glass on a device (T3.4)."
    completion_pct: 90
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
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] **T3.1** Frozen token set untouched — `token-identity.mjs verify`: 35 goldens matched across
      light/dark/system.
- [x] **T3.2** Behaviour did not move — diff is 29 insertions / 0 deletions.
- [x] **T3.3** Board — build RC 0; typecheck 0 errors / 1123 files; Svelte suite 530 passed;
      catalog smoke 534 frames / 0 throws.
- [~] **T3.4** Confirm the glass reads correctly on device. Deferred: the CDP gate can screenshot the
      rendered surface, but "does this look like the Claude app" is an operator judgement, not a
      machine check.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

All five success criteria in `spec.md` §5 hold, evidenced by the gate table in `plan.md` §2. The
packet stays In Progress until the operator confirms T3.4 on a device, because criterion 1 — that the
control *reads* as glass — is the one criterion no gate can decide.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- `spec.md` — requirements and success criteria.
- `plan.md` — the three-layer cascade and the gate results.
- Program goal: `../goal.md` — the zero-rendered-change invariant this packet is the exception to.
<!-- /ANCHOR:cross-refs -->
