---
title: "Plan - Phase 9 Home balance and controls"
description: "The sequenced approach: reproduce the interaction lock before fixing it, then rebalance the home column, then make the theme control legible, verifying each against a browser measurement."
trigger_phrases:
  - "home balance and controls plan approach"
  - "home balance and controls phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed the plan; geometry and presentation gates green."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Plan: Phase 9 Home balance and controls

<!-- ANCHOR:summary -->
## 1. SUMMARY

Fix the interaction lock first, because a screen that cannot be scrolled cannot be judged. Then give
the home screen one content edge and one control rhythm, and make the theme control read as a
three-state choice. Every claim is a browser measurement at 402x874 in both themes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Command | Pass condition |
|------|---------|----------------|
| Behaviour | `npm run typecheck` · `npm run test:web` | 0 errors; both suite summaries read by content |
| Tokens | `node scripts/token-identity.mjs verify app-mobile/src/app.css` | 39 goldens hold |
| Catalog | `catalog-smoke-cdp.mjs` · `catalog-state-visibility.mjs` · `story:coverage` | all pass |
| Legibility | `node scripts/ui-audit.mjs` | no new high or medium finding, both themes |
| Archive | `npm run story:shots` | every moved shot explained and reproduced |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Three surfaces, one shared constraint. The home column is `screen-home.svelte` composing
`card-session.svelte`, `freshness.svelte` and `push-settings.svelte`; the theme control is a shared
chrome component; the interaction lock lives under the sheet primitive, which wraps a third-party
dialog and adds this repository's own outside-hiding helper.

Svelte scoped CSS reaches only the component that declares it, so a rule shared by the column and its
cards belongs in `app.css` behind `:global()`, and a rule owned by one surface stays in that surface.
Putting it in the wrong file is the common way a change here renders as nothing at all.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · reproduce the lock
Drive the model picker open and closed in a browser and observe the failure before touching it, so
the same check can prove the repair.

### Phase 2 · fix the lock at its layer
Trace whether the residue is the dialog's body handling or the outside-hiding helper, and fix the one
that actually holds it. The helper is reference-counted, so nested sheets must still work.

### Phase 3 · rebalance the column and the controls
One content edge for headings, cards and controls; a card that spans the column; a pin affordance
that belongs to its card; and one rhythm for the controls above the list.

### Phase 4 · make the theme control legible
Three states of comparable weight, each identifiable without prior knowledge, with no trailing dead
space inside the control.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

The lock precedes everything: until it is fixed the surface cannot be exercised on a device, and any
visual judgement made without scrolling is partial. The column precedes the theme control only
because the control sits inside the settings panel the column governs.
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

A contained set of presentation files, plus one interaction defect whose root cause spans a
third-party primitive and this repository's own accessibility helper — the second is the uncertain
half.
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Taste is not checkable, so every acceptance criterion is a number, a gate result, or a
reproduced-then-fixed failure. Alignment is measured with `getBoundingClientRect()` rather than
judged; overflow is `scrollWidth` against the frame; the interaction lock is a real scroll and a real
click, asserted before and after.

The archive is not byte-stable, so a moved screenshot is confirmed by a second capture before it is
treated as a real change.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `sk-design` skill, which owns the value and behaviour decisions for this surface.
- The presentation gates, which are the only things that can see a rendering defect.
- `playwright` and Chrome for the browser measurements; note it is undeclared in `package.json`.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Presentation and one interaction fix, all within a handful of components. Reverting the commit
restores the previous rendering exactly; the archive is re-captured from the reverted state and no
data, protocol or token contract is involved.
<!-- /ANCHOR:rollback -->
