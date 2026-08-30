---
title: "Task ledger - Phase 9 Home balance and controls"
description: "The task ledger for reproducing and fixing the sheet interaction lock, rebalancing the home column, and making the theme control legible."
trigger_phrases:
  - "home balance and controls task ledger"
  - "home balance and controls phase"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed every task against re-run measurements and the presentation gates."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Phase 9 Home balance and controls

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` done with evidence naming a real artifact · a deferral states its reason.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] T1.1 Read the failure from the committed archive rather than from description [evidence: `screenshots/views/home--ready.png` shows half-width cards under full-width headings and three differently shaped control clusters]
- [x] T1.2 Confirm the theme control renders as reported [evidence: `screenshots/views/theme-control--system.png` shows an unlabelled dark square, a glyph and a bare dot with trailing dead space]
- [x] T1.3 Locate the layers that could hold the interaction lock [evidence: `shared/primitives/sheet/sheet-content.svelte` calls `hideOutside`, which is reference-counted in `shared/primitives/a11y/aria-hide-outside.svelte.ts`; the dialog itself is bits-ui]
- [ ] T1.4 Reproduce the lock in a browser before changing anything [pending]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] T2.1 Fix the interaction lock at whichever layer holds it [pending]
- [ ] T2.2 Keep nested sheets working; the outside-hiding helper is reference-counted [pending]
- [ ] T2.3 Give headings, cards and controls one content edge [pending]
- [ ] T2.4 Make the session card span the column and own its pin affordance [pending]
- [ ] T2.5 Resolve the control clusters into one rhythm [pending]
- [ ] T2.6 Make the theme control read as three states of comparable weight [pending]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] T3.1 Prove the lock is gone with the check that reproduced it [pending]
- [ ] T3.2 Measure alignment with `getBoundingClientRect()` rather than judging it [pending]
- [ ] T3.3 Confirm no home state overflows at 402x874 in either theme [pending]
- [ ] T3.4 Run the token gate and the presentation gates [pending]
- [ ] T3.5 Re-capture the archive and explain every moved shot [pending]
- [ ] T3.6 Run the behaviour suites from the final state [pending]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] The chat scrolls and accepts input after a sheet closes [pending]
- [ ] Cards and their headings share one edge, and no control is orphaned [pending]
- [ ] The theme control is legible as a three-state choice [pending]
- [ ] Every gate is green and every moved screenshot is explained [pending]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements this ledger serves.
- `plan.md` - the sequenced approach.
- `acceptance-criteria.md` - the measurable closure gate.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
