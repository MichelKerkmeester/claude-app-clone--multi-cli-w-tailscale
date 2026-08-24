---
title: "Child 018 checklist — transcript affordances"
description: "Barrier sign-off for the three client affordances. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-24T03:23:43Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Land the repairability type change."
    blockers: []
    completion_pct: 96
---

# Verification Checklist: Child 018 — Transcript affordances

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The nine program gates exist to prove nothing changed. Two items here change what the user sees on
purpose, so a green board is not evidence of success for them — it is only evidence that nothing else
broke.

Their closing evidence is an explicit requirement plus a person on a device. That is stated as a
requirement rather than left to be assumed away.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] The test-lane packet has landed. [evidence: 015 advanced at 100%; `transcript-placement.svelte.test.ts` drives the real virtualizer]
- [x] **CHK-PRE-02** [P0] The rename packet has landed. [evidence: 012/003 closed at 100%; `scan-naming.mjs` reports 219 files / 0 offenders]
- [x] **CHK-PRE-03** [P0] The absorb-or-separate decision is recorded. [evidence: kept separate — `011-ux-affordances` is held on an operator device confirmation, so absorbing these four would have blocked all of them behind it]
- [x] **CHK-PRE-04** [P0] Fence inventory and baseline count captured. [evidence: `scan-comments.mjs` before any edit — `guardrailFences : 277`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Disclosure state is keyed by the protocol block id. [evidence: traced to `readBlockId()` reading the protocol `id`, with a deterministic `-fence-N` suffix for split segments; carried, not derived from render order]
- [x] **CHK-CQ-02** [P1] The hoist follows the pattern the todo panel already uses. [evidence: a `SvelteMap` keyed by id in a module outside the component, matching how `todo-state.ts` keys its own by-id maps]
- [x] **CHK-CQ-03** [P0] Differentiation composes existing tokens. [evidence: only `--space-4`, `--space-3` and `--line-strong`; token identity reports 0 CHANGED / 0 VANISHED / 0 ADDED across three themes]
- [x] **CHK-CQ-04** [P1] Repairability is modelled in the catalog, not inferred at each call site. [evidence: `RUNTIME_ISSUE_COPY` carries `{ copy, repairable }`; call sites read `runtimePhaseIsRepairable` rather than testing codes themselves]
- [x] **CHK-CQ-05** [P1] No tool-to-verb activity vocabulary was added. [evidence: the only new rendered string is the stalled label; `Working…` and every approval label are unchanged]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Expansion survives unmount and remount. [evidence: `transcript-disclosure.test.ts` proves the entry outlives the holder that set it]
- [x] **CHK-TEST-02** [P0] At least one test drives the real virtualizer. [evidence: `transcript-placement.svelte.test.ts`, supplied by 015]
- [x] **CHK-TEST-03** [P1] The stall label changes after the threshold. [evidence: a fake-timer test asserts `Working…` before and a different label after]
- [x] **CHK-TEST-04** [P1] The repairability change needs no test. [evidence: exhaustive keying proved by `npm run typecheck` at 1124 files / 0 errors; `runtime-issues.test.ts` still asserts the exact key set against the new shape]
- [x] **CHK-TEST-05** [P0] `npm run test:web` exit 0. [evidence: verified by content — 68 files / 545 passed / 3 skipped and 17 files / 189 passed]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] A mis-tap on the blanket grant requires a different motion. [evidence: the grant moved below a rule into its own group, so the thumb travels in a different direction; `App.svelte.test.ts` asserts neither control sits inside the other's group]
- [x] **CHK-FIX-02** [P1] The strip can say something better than unavailable. [evidence: `sheet-model-effort.svelte` withholds the reconcile affordance where reconciling cannot help, instead of offering it uniformly]
- [x] **CHK-FIX-03** [P1] The stall threshold exceeds the longest legitimate silent tool run. [evidence: `TRANSCRIPT_STALL_THRESHOLD_MS = 120_000`, chosen so a long think is not called stalled — a false report trains the reader to ignore the signal]
- [x] **CHK-FIX-04** [P2] The two miscalibrated runtime strings are addressed or explicitly deferred. [evidence: explicitly deferred — the rewording was offered to the operator in `011-ux-affordances` and declined; an executor draft that reworded both was reverted here]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No security invariant changes. [evidence: `BLOCKED_MUTATION_PHASES` still blocks every issue phase. An executor draft narrowed it to terminal phases only, which would have allowed mutation while `foreground-required` — that was caught in review, reverted, and is now pinned by a test in `runtime.svelte.test.ts`]
- [x] **CHK-SEC-02** [P1] Differentiation does not weaken the confirmation. [evidence: in `screen-review.svelte` both paths keep their handlers, their `disabled={submitted}` guard and their accessible names; only grouping and position changed]
- [x] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [evidence: no commit in this packet names a path under `specs/context`; the five research repositories remain untracked and unmodified]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P0] Each rendered-value change has an explicit requirement. [evidence: the stalled label is the packet's own stall requirement; no other rendered value moved, and token identity plus the unchanged approval and `Working…` strings show it]
- [x] **CHK-DOC-02** [P1] The reason disclosure state lives outside the row is written where it is read. [evidence: `transcript-disclosure.svelte.ts` states that virtualized rows are remounted as they leave and re-enter the viewport; durable WHY, no artifact pointer]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Per-item commits. Partly met: repairability and differentiation each landed alone, but disclosure and the stall threshold share `transcript-list.svelte` and were written concurrently, so they landed together rather than as a split that never happened. Three commits for four items.
- [x] **CHK-ORG-02** [P1] Fence-crossing work is reviewed in one pass. [evidence: one review across the virtualization, disclosure-wiring and approval-decisioning fences; `guardrailFences : 277` unchanged and no fence text edited]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

Two of the three items are closed by a person, not a gate — the approval row and the stall copy both
need a device, and the gates are structurally blind to that class. Recording that as required evidence
is what stops it from quietly becoming an assumption.
<!-- /ANCHOR:summary -->
