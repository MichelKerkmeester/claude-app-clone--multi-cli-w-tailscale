---
title: "Phase 9 implementation summary — Home balance, control legibility, and the sheet interaction lock (IN PROGRESS)"
description: "The defects were read from the committed archive rather than from description, and the acceptance criteria were written as measurements before any code was dispatched. The work itself is delegated and open."
trigger_phrases:
  - "home balance and controls implementation summary"
  - "home balance and controls phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Recorded the delivered state and the two harness defects found."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 9 implementation summary — Home balance, control legibility, and the sheet interaction lock

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `006-orca-nodeterm-ux-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | The home column, the theme control, and the sheet interaction lock |
| **Executor** | GLM-5.3-Flash via the Pi CLI over OpenRouter, carrying the `sk-design` skill |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet. What exists is the diagnosis and the closure gate:

- **The defects were read from the committed artifacts**, not from a description. The home screenshot
  shows session cards at roughly half the column width beneath section headings that span it, and
  three control clusters in three different shapes. The theme control screenshot shows an unlabelled
  dark square, a small glyph and a bare dot with trailing dead space.
- **Twelve acceptance criteria, each a measurement.** Alignment is `getBoundingClientRect()` rather
  than judgement; overflow is `scrollWidth` against the 402x874 frame; the interaction lock is a real
  scroll and a real click, asserted before and after the fix.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Diagnosis before dispatch, and measurement before taste. The work is delegated, so a target expressed
as "more balanced" could not be verified by anyone other than its author; every criterion is therefore
a number, a gate result, or a reproduced-then-fixed failure.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The interaction lock is sequenced first.** A screen that cannot be scrolled cannot be judged on a
  device, so it blocks every visual conclusion behind it.
- **It must be reproduced before it is fixed.** The failure has to be observed in a browser so the
  same check proves the repair rather than merely agreeing with it.
- **The layer is left open deliberately.** The lock could sit in the third-party dialog's body
  handling or in this repository's reference-counted outside-hiding helper; the phase requires it
  traced rather than patched at the symptom.
- **Two design questions are left to the executor**, to be answered with a rendered comparison rather
  than an opinion: where the pin affordance belongs, and whether the sort control and the state
  filters are both needed once the list is grouped by state.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

Complete so far:

- The home and theme-control defects were confirmed at full resolution in
  `screenshots/views/home--ready.png` and `screenshots/views/theme-control--system.png`.
- The candidate layers for the interaction lock were located: `sheet-content.svelte` calls the
  reference-counted `hideOutside` in `shared/primitives/a11y/aria-hide-outside.svelte.ts`, and the
  dialog beneath it is bits-ui.

Open: every acceptance criterion, all twelve, until the work runs.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The root cause of the interaction lock is not yet known.** The helper's own release path reads
  correctly, which points at the dialog's body handling, but that is a hypothesis rather than a
  finding and the phase requires it proven.
- **The archive is not byte-stable**, so any screenshot this work moves has to be re-captured before
  the movement is believed.
- **`playwright` is undeclared in `package.json`**, so the browser measurements these criteria depend
  on will fail after a clean install until it is reinstalled.
<!-- /ANCHOR:limitations -->
