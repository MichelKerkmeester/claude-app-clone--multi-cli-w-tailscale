---
title: "Child 018 — Transcript affordances"
description: "Three client changes the virtualizer and the copy catalog make necessary: disclosure state that survives scrolling, an approval row where the blanket grant is not a twin of the single one, and a transcript that can say stalled rather than working forever."
trigger_phrases:
  - "disclosure state virtualized rows"
  - "blanket grant differentiation approval"
  - "working versus stalled transcript"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-24T03:23:43Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped; all three items cross design-system fences."
    next_safe_action: "Decide whether 011 absorbs these or they stay separate."
    blockers: ["requires 011 requirements; runs after 012"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 018 — Transcript affordances

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../017-ask-question-activation/spec.md |
| **Successor** | ../019-surface-skill-refresh/spec.md |
| **Level** | 2 |
| **Layer** | client — after the rename packet |
| **Writer** | executor (`app-mobile/src/**`) + Claude (fence review, gates, git) |
| **Barrier** | fence count preserved, 011 sign-off, operator device verification |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Three defects that the nine objective gates are structurally unable to see.

**Disclosure state dies when you scroll.** The transcript virtualizes with a six-row overscan, so a row
scrolled roughly six positions out of view is removed from the DOM and its component-local state is
destroyed with it. Expand a tool result to read a stack trace, scroll up to check what prompted it,
scroll back — it has silently re-collapsed, and the measured row height is gone too. The pattern for
the fix already exists in this codebase: the todo panel keeps its open state in a keyed map outside
the rows, and the collapsible primitive already exposes a bindable open property.

**The blanket grant looks exactly like the single approval.** "Approve once" and "Accept next three
edits" are two plain buttons in the same row, the same size, the same distance from the thumb — and
one of them is three times more consequential. This is a mis-tap problem, not a risk-classification
problem, and it composes from existing tokens.

**A wedged host is indistinguishable from a working one.** The transcript renders a fixed working
label for as long as the run flag is true. The socket layer only covers *transport* death, so a
healthy socket attached to a stalled host shows a green connection pill and pulsing dots
indefinitely. Over a tailnet, where the laptop sleeps, that is the actual failure mode. Nothing in the
transcript is a function of time.

Alongside the last one: the runtime copy catalog cannot express whether an issue is repairable, so a
permanently-impossible state and a self-healing one are treated identically, and the strip can only
say the surface is unavailable.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Hoist disclosure state out of the two grouping components into a map keyed by the protocol block id,
  following the pattern the todo panel already uses.
- Differentiate the blanket grant from the single approval visually and physically, composing existing
  tokens — no new token, no new value.
- Model repairability in the runtime copy catalog: a code carries its copy and whether the state can be
  recovered from.
- Derive a stall threshold from the age of the most recent block and let the transcript say so.

**Out of scope:** a tool-to-verb activity vocabulary, which would change rendered strings the identity
gate and the story fixtures depend on, and whose information is already one tap away; any protocol
change; any new token value; a risk classifier.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Disclosure state survives a row leaving and re-entering the virtual window. It is keyed
  by the protocol block id, which is stable, rather than by anything derived from render order.
- **REQ-002** — The blanket grant is visually and physically distinguishable from the single approval.
  A mis-tap that grants three edits instead of one must require a different motion, not just a
  different intention.
- **REQ-003** — A runtime issue states whether it is repairable, so a permanently-impossible state and
  a self-healing one stop being rendered identically.
- **REQ-004** — The transcript distinguishes a run that is progressing from one that has produced
  nothing for a threshold period.
- **REQ-005** — No token value changes. Differentiation composes existing tokens.
- **REQ-006** — Every `@ds guardrail:` fence crossed is preserved, and the fence count does not fall.
  Three of these changes sit inside fenced regions.
- **REQ-007** — Each rendered-value change carries an explicit requirement in the affordances packet,
  because these deliberately diverge from the frozen React oracle.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. A state-layer test proves expansion survives unmount and remount — mount, expand, unmount, remount,
   still expanded. It needs no virtualizer.
2. At least one test drives the real virtualizer, which is why the test-lane packet must land first.
3. The approval row differentiates the two actions, confirmed by the operator on a device.
4. The runtime catalog exposes repairability and the type checker proves the keying is exhaustive.
5. The transcript label changes after the threshold, asserted in a test.
6. Token identity remains at zero differences across all three theme states.
7. Fence count unchanged; `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **All three cross design-system fences**, so each costs a fence-crossing review and must not disturb
  the fence count that a gate measures.
- **These are rendered-value changes.** The program's gates exist to prove nothing changed, so they are
  the wrong instrument here — each needs an explicit requirement and sign-off instead.
- **Two need real-device verification.** Headless Chrome at a fixed width cannot reproduce iOS
  momentum scrolling, and the gates are structurally blind to this class.
- **The stall threshold is a judgement.** Too short and a long legitimate tool run reads as stalled,
  which would train the user to ignore the signal.
- Depends on the test-lane packet, on the rename packet landing first, and on affordance-packet
  sign-off.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **Does the affordances packet absorb these, or do they stay here?** That packet already carries this
   as its own open question and currently holds a single requirement; this would add three or four
   unrelated ones. Recommendation: keep them here and reference the affordance packet for sign-off, so
   one packet does not become a bucket.
2. **What stall threshold?** It has to exceed the longest legitimate silent tool run, and nobody has
   measured that. Recommendation: start generous, and treat a false stall report as the signal to
   lengthen it rather than to remove it.
3. **Do the two miscalibrated runtime strings get reworded?** They read as walls but are doors. The
   type-level change needs no sign-off; the copy rewording does.
<!-- /ANCHOR:questions -->
