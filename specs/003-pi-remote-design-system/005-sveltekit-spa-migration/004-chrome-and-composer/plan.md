---
title: "Child 004 plan — chrome and composer"
description: "Why the chrome ran in parallel while the composer and LeavePlanSheet ran alone, and how focus parity was made assertable rather than assumed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/004-chrome-and-composer"
    last_updated_at: "2026-08-23T10:20:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 004 plan — chrome and composer

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Two groups with deliberately different concurrency. The shared chrome is ordinary component work and
runs in parallel across disjoint files. The composer and `LeavePlanSheet` run **alone**, one at a
time, because both are focus-sensitive and focus bugs are the kind that pass every visual check.

Serialising them is not caution about file conflicts — the files are disjoint too. It is that these
units need undivided verification attention, and batching them would mean reviewing focus behaviour
while three other diffs are in flight.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| Chrome renders in the catalog, light and dark | pass, no throw |
| `LeavePlanSheet` focus assertion — `activeElement === stay` | pass |
| Composer focus retention and slash-trigger parity | pass |
| `svelte-check` | clean |
| token-identity on touched surfaces | 0 diffs |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Focus parity has to be asserted, not observed.** react-aria and Bits UI both "work" on open; they
differ in *what ends up focused*. `LeavePlanSheet` therefore prevents the default auto-focus and
places focus explicitly on the stay control, and a regression test asserts `activeElement` is that
control. Without the assertion the difference is invisible — the sheet opens, it looks right, and a
keyboard user lands somewhere else.

**The composer keeps focus in the textarea, always.** Its autocomplete is not a focusable widget: the
options carry `aria-activedescendant` and are never in the tab order, so the caret never leaves the
textarea and IME composition is never interrupted. That is the one behaviour the whole surface is
organised around.

**`deriveSlashTrigger` stays pure.** It ported verbatim in 002 and is not re-implemented here. Slash
detection is the part most likely to drift subtly under a rewrite, so the safest change to it was no
change at all.

**Where the plan's library choice was dropped.** The spec called for Melt UI's `createPopover` with
focus trapping off. What shipped uses no popover library — Melt UI is not a dependency. Once the
autocomplete is defined as "never takes focus", a popover library's main contribution is focus
management the surface explicitly does not want.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Shared chrome, parallel — Done

`SessionHeader`, `RuntimeStrip`, `TodoPanel` on `Collapsible`, the plan components and
`ModelEffortSheet`, each composing the 002 primitives and folding its own CSS block in.

### Phase 2: `LeavePlanSheet`, alone — Done

Explicit focus placement plus the regression assertion that makes it provable.

### Phase 3: Composer, alone — Done

`SessionComposer` and `ComposerCommandAutocomplete`, hand-rolled so focus never leaves the textarea.

### Phase 4: Barrier — Done

Catalog render, focus and a11y regression tests, `svelte-check`, and an independent token-identity
check on the touched surfaces.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Chrome is checked by catalog render, like every other component layer.

The focus-sensitive units get dedicated regression tests instead, because the property that matters
cannot be seen in a screenshot. Four test files cover them today: `LeavePlanSheet.svelte.test.ts`,
`SessionComposer.svelte.test.ts`, `ComposerCommandAutocomplete.svelte.test.ts` and
`composer-tools-a11y.svelte.test.ts`.

Two limits are worth stating rather than discovering later. jsdom cannot simulate interact-outside
dismissal or the real focus-trap redirect, so those assertions live in the CDP gate. And a test that
asserts `activeElement` proves where focus *landed*, not that the journey there was free of
intermediate steps a screen-reader user would hear.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 002 for the primitives and for the pure `deriveSlashTrigger`.
- 003 for the feature directories the chrome sits above.
- Within the child: nothing. The serialisation is about verification attention, not file conflicts.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Additive, like the layers before it — React is still the shipping runtime, so none of this is
user-reachable yet. Each chrome component reverts independently; the composer and `LeavePlanSheet`
revert as their own units, which is a second benefit of having landed them one at a time.
<!-- /ANCHOR:rollback -->
