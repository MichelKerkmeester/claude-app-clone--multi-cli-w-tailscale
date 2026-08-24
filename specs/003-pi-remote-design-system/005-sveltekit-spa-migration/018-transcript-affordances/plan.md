---
title: "Child 018 plan — transcript affordances"
description: "Why the disclosure fix is not the five-line change it looks like, how the two rendered-value items earn their sign-off, and what only a device can confirm."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-24T03:23:43Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; type-safe item sequenced ahead of the rendered ones."
    next_safe_action: "Land the repairability type change; it needs no sign-off."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 018 plan — transcript affordances

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Take the change that needs no sign-off first, then the state fix, then the two that change what the
user sees.

Ordering by approval cost rather than by importance means something lands while the sign-off
conversation is still happening, and it keeps the fence-crossing reviews grouped.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The token identity gate must stay at zero differences — that is what proves the differentiation
composed existing tokens rather than introducing a value. The fence count must not fall, since three
of these changes sit inside fenced regions.

Neither of those gates can see whether the affordances actually work. The disclosure fix needs a
state-layer test; the approval row and the stall label need a person with a phone. Both are stated as
required evidence rather than left as an assumption that the gates covered it.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Disclosure.** The correct place for open state is a map keyed by the protocol block id, held outside
the row. The block id is stable — it comes from the protocol, not from render position — so a row can
leave the window and come back to find its state waiting.

Two corrections to how this was originally described are worth carrying, because both change the work.
The reason is not a key change at finalization; the group id never changes. The cause is purely
virtualization: the row is unmounted and component-local state goes with it. And this is not a
five-line lift. It moves state through row markup that sits inside guardrail fences, so the fence text
has to survive a diff that watches it and the fence count is itself gated. It also diverges from the
frozen React oracle, which is why it needs an explicit requirement despite changing no rendered value.

**Differentiation.** The two approval actions differ by a factor of three in consequence and by
nothing at all in appearance or position. The fix is visual and physical separation composed from
existing tokens — the same approach the affordances packet already takes for its first requirement.
Deliberately *not* a risk classifier: a classifier adds a field three packages must keep in sync and a
heuristic that will sometimes be wrong, and a wrong risk label is worse than none because a
confirmation you learn to tap through stops confirming anything.

**Repairability.** The copy catalog maps a code to a string, so nothing downstream can branch on
whether a state is recoverable. Five of the seven codes already describe a repair in their prose; one
is correctly terminal; two read as walls when they are doors. Changing the value to carry both the
copy and a repairable flag lets the strip say something more useful than unavailable — and the type
checker proves the keying stays exhaustive, so this half needs no test at all.

**Stall.** Every block carries an occurrence time, so the age of the most recent one is available
without any protocol change. This is the item ranked last deliberately: it is a rendered-value change
inside a fence that names streaming state explicitly, bought for an affordance whose absence is
diagnosable by looking at the relay.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Repairability

Change the copy catalog to carry copy plus a repairable flag. No sign-off needed, no test needed — the
type checker proves exhaustive keying and an existing test already asserts exact keys.

### Phase 2: Disclosure state

Hoist open state into a map keyed by the block id, following the todo panel's existing pattern. Add
the state-layer test: mount, expand, unmount, remount, still expanded.

### Phase 3: Fence review

One review covering every fence this packet crosses, rather than three separate ones. Confirm fence
text survives and the count is unchanged.

### Phase 4: Approval differentiation

Visual and physical separation from existing tokens, with operator sign-off and a device check.

### Phase 5: Stall threshold

Derive from the age of the most recent block, assert the label change in a test, and take the copy
decision to the operator.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The disclosure test is written at the state layer, which is what makes it cheap and permanent: mount,
expand, unmount, remount, assert still expanded. No virtualizer, no DOM measurement, no timers.

Separately, at least one test must drive the *real* virtualizer — not for this fix specifically, but
because its absence is why this bug survived every gate. That is the test-lane packet's job and the
reason it must land first.

The stall label is testable by clock: assert the label changes after the threshold. What no test can
judge is whether the copy reads as "stalled" rather than "working harder", which is stated as an
irreducible residue for the operator rather than pretended away.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The test-lane packet lands first, so a test can see the real virtualizer.
- The rename packet lands first — all three items touch files it moves.
- The affordances packet supplies the requirements and sign-off for the two rendered-value changes.
- Operator device verification is required and is not substitutable by any gate.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-item commits, each independently revertable.

The one to be careful with is the fence-crossing work: a revert must restore fence text exactly, or
the fence-count gate will pass while the guardrail prose has drifted. Confirm the count and the text
after any revert, not just that the build is green.
<!-- /ANCHOR:rollback -->
