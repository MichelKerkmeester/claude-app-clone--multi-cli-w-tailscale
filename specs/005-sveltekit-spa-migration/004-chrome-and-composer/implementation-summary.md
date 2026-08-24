---
title: "Child 004 implementation summary — chrome and composer"
description: "What the chrome layer delivered, why the composer dropped its planned library, and the accessibility losses that hid behind a green board until 007."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/004-chrome-and-composer"
    last_updated_at: "2026-08-23T10:20:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 004 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-004 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

**The chrome**, in parallel: `SessionHeader`, `RuntimeStrip`, `TodoPanel` on `Collapsible`, the plan
components with `planModePresentation.ts` holding their pure derivations, `ModelEffortSheet` with
`EffortRadioGroup`, `RuntimeModeAnnouncer`, `CommandPalette` and `ComposerTools` — 34 files in
`pages/chat/chrome/`, alongside 11 app-level pieces in `shared/chrome/`.

**The two focus-sensitive units**, one at a time. `LeavePlanSheet` prevents the dialog's default
auto-focus and places focus explicitly on the stay control, with a deferred re-focus as a fallback.
`SessionComposer` and `ComposerCommandAutocomplete` were hand-rolled so that the autocomplete's
options carry `aria-activedescendant` and never enter the tab order — the caret stays in the textarea
and IME composition is never interrupted.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Chrome as parallel executor dispatches; the composer and `LeavePlanSheet` alone, sequentially. Claude
verified each before the barrier.

The serialisation was about verification attention, not file conflicts — those files are disjoint too.
Reviewing focus behaviour while three other diffs are in flight is how focus bugs get through.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**Focus parity is asserted, never observed.** react-aria and Bits UI both open a dialog successfully;
they differ in what ends up focused. A screenshot cannot see that difference and a human reviewer
usually will not either. So `LeavePlanSheet` places focus explicitly and a regression test asserts
`activeElement` is the stay control — the assertion is the deliverable, not the focus call.

**The composer's autocomplete is not a widget that takes focus.** Everything else about it follows
from that one property: options are referenced by `aria-activedescendant` rather than focused, they
stay out of the tab order, and the caret never moves. This is what preserves IME composition, which is
the behaviour most likely to break silently for the users least likely to report it.

**Melt UI was dropped rather than adopted.** The spec planned `createPopover` with focus trapping
switched off. Once the autocomplete is defined as never taking focus, the main thing a popover library
contributes is focus management this surface explicitly does not want — so the dependency was not
added at all. `@melt-ui/svelte` appears nowhere in `package.json`.

**`deriveSlashTrigger` was not touched.** It ported verbatim in 002. Slash detection is the part most
prone to subtle drift under a rewrite, so the safest available change to it was no change.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| Catalog render, light and dark | pass, no throw |
| `LeavePlanSheet.svelte.test.ts` — `activeElement` assertion | pass |
| `SessionComposer.svelte.test.ts` | 48 tests |
| `ComposerCommandAutocomplete.svelte.test.ts` | 54 tests |
| `composer-tools-a11y.svelte.test.ts` | pass |
| `svelte-check` | clean |
| token-identity on touched surfaces | 0 diffs |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**jsdom cannot reach two of the behaviours this layer most depends on.** Interact-outside dismissal
and the real focus-trap redirect are not simulable, so neither is asserted in the unit suite; both are
covered only by the CDP gate. When 007 ported these tests, the corresponding assertions were skipped
with that rationale recorded at the skip — and notably the React oracle had been passing them
*vacuously* for the same reason.

**A green board here still hid real accessibility losses.** The focus assertions this child added
cover what they assert and nothing more. The 007 audit later found that `PlanModeMenu` let Tab escape
the menu with the background still reachable, that the composer and palette backgrounds were not
hidden from assistive technology, and that model search had lost `aria-activedescendant` virtual focus
in a way that breaks iOS VoiceOver. All of those surfaces are in this child, and all of them passed
this child's barrier.

**`PlanModeMenu.svelte.test.ts` has a flaky Enter-activation test.** Measured at roughly 62% pass at
baseline, traced to a bits-ui body-scroll-lock pointer-events race. It is a known baseline condition
rather than a regression signal, and confirming flake-versus-regression there needs a scoped stash and
at least eight runs, never a single one.
<!-- /ANCHOR:limitations -->
