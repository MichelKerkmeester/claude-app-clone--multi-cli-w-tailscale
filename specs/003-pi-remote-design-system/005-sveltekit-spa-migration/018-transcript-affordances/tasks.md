---
title: "Child 018 tasks — transcript affordances"
description: "Task ledger for the repairability type change, the disclosure state hoist, the approval differentiation and the stall threshold."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Land the repairability type change."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 018 tasks — transcript affordances

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Two of these items change what the user sees, so they are not done on a green gate — they are done on
an explicit requirement and a person confirming on a device.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Confirm the test-lane packet has landed, so a test can see the real virtualizer. Its
      absence is why the disclosure bug survived every gate.
- [ ] **T1.2** Confirm the rename packet has landed — all three items touch files it moves.
- [ ] **T1.3** Decide whether the affordances packet absorbs these or they stay here, and record the
      answer. It currently holds one requirement; this would add three or four unrelated ones.
- [ ] **T1.4** Inventory every guardrail fence these changes cross, and capture the current fence count
      as the baseline the gate will compare against.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Repairability — no sign-off needed**

- [ ] **T2.1** Change the runtime copy catalog so a code carries its copy and whether the state is
      recoverable.
- [ ] **T2.2** Let the runtime strip and the blocked-mutation set branch on repairability, so a
      permanently-impossible state stops being treated like a self-healing one.
- [ ] **T2.3** No new test — the type checker proves exhaustive keying and an existing test already
      asserts the exact key set.

**Disclosure state**

- [ ] **T2.4** Hoist open state out of the two grouping components into a map keyed by the protocol
      block id, following the pattern the todo panel already uses.
- [ ] **T2.5** Add the state-layer test: mount, expand, unmount, remount, still expanded. No
      virtualizer, no DOM measurement, no timers.
- [ ] **T2.6** Confirm the block id is genuinely stable rather than derived from render order.

**Fence review**

- [ ] **T2.7** One review covering every fence this packet crosses, not three separate ones.
- [ ] **T2.8** Confirm fence text survives the diff that watches it, and the fence count is unchanged.

**Approval differentiation**

- [ ] **T2.9** Differentiate the blanket grant from the single approval visually and physically,
      composing existing tokens. No new token, no new value.
- [ ] **T2.10** A mis-tap must require a different motion, not merely a different intention.
- [ ] **T2.11** Operator confirms on a device. Headless rendering at a fixed width cannot answer this.

**Stall threshold**

- [ ] **T2.12** Derive a stall threshold from the age of the most recent block.
- [ ] **T2.13** Assert the label changes after the threshold.
- [ ] **T2.14** Take the copy to the operator — a test can prove the label changed, not that it reads
      as stalled rather than as working harder.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Token identity at zero differences across all three theme states — the proof that
      differentiation composed existing tokens.
- [ ] **T3.2** Fence count unchanged and fence text intact.
- [ ] **T3.3** Disclosure survives unmount and remount, proven by the state-layer test.
- [ ] **T3.4** At least one test drives the real virtualizer.
- [ ] **T3.5** Operator device verification recorded for the approval row and the stall label.
- [ ] **T3.6** `npm run test:web` exit 0, verified by content; `npm test` exit 0.
- [ ] **T3.7** `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

An expanded row stays expanded across a scroll. The blanket grant no longer looks like its
single-action twin. A stalled host is distinguishable from a working one.

Two of these cannot be closed by a gate. The program's gates prove nothing changed, which is the
wrong question for a deliberate rendered-value change — so the closing evidence is a requirement and a
person, not a green board.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the three defects and why the gates cannot see them.
- `plan.md` — why the disclosure fix is not a five-line change.
- `checklist.md` — barrier sign-off with evidence.
- `../011-ux-affordances/spec.md` — supplies requirements and sign-off.
- `../015-test-lanes/spec.md` — must land first; its virtualizer un-mock is why this bug is findable.
- `../012-naming-and-structure/spec.md` — must land first; it moves these files.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
