---
title: "Decision Record: Phase 9 Home balance, control legibility, and the sheet interaction lock"
description: "The decisions taken while making the home screen read as one column, chiefly why the theme control marks its three states instead of labelling them."
trigger_phrases:
  - "decision record"
  - "adr"
  - "theme control marks"
  - "why no theme labels"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-30T07:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Recorded the theme-control mark vocabulary decision with its measurement."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---
# Decision Record: Phase 9 Home balance, control legibility, and the sheet interaction lock

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 006-orca-nodeterm-ux-mining/009-home-balance-and-controls
**Level:** 2
**Status:** Complete
**Date:** 2026-08-30
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:decisions -->
## 2. DECISIONS

### ADR-001 — The theme control marks its three states rather than labelling them

**Status:** Accepted

**Context.** The operator reported the theme control as a broken-looking component: "an unlabelled
dark square, a small glyph and a bare dot inside a wide pill". The markup was never at fault — each
option carries both visible text (`Auto` / `Light` / `Dark`) and an `aria-label`. Below `52rem` the
component's own stylesheet set `font-size: 0`, `color: transparent` and `width: 2.4rem` on every
option and substituted a `::before` mark, so what actually reached the screen was `A`, `☀` and `●`.

The obvious repair — delete the compact mode and let the labels render — was measured rather than
assumed, and it does not fit. With labels restored the three options need **171.6px**. The control
lives in the header beside the wordmark: `topbar--actions` is already **253px** of a **370px** bar,
and the same breakpoint hides `.wordmark--copy` and `.status--pill` precisely because that bar is
full. Restoring labels would overflow the header on every phone.

**Decision.** Keep the compact mode and fix the vocabulary. The three marks are now `◐`, `☀` and `☾`
— a half-lit disc for the state that follows the system, a sun for light, a moon for dark. One
family, all three conventional, each meaningful without prior knowledge, which is what REQ-003 asks
for. `A` was a letter, and `●` carried no meaning at all.

The mark rules moved out of `app.css` into the component. They were duplicated across both files, and
a rule with exactly one consumer belongs with that consumer; leaving two copies meant a future edit
to one would be silently overridden by the other depending on stylesheet order.

**Consequences.** The accessible name is unchanged — every option keeps its `aria-label`, so the
marks are decoration to assistive technology and nothing depends on recognising them. Two header
screenshots move with the three theme-control shots. Above `52rem` the labels still render as text,
so this affects the phone form only.

**Alternatives rejected.** Shortening the labels to fit was rejected: three abbreviations are no more
identifiable than three marks and cost the same space problem. Dropping one state to make room was
rejected as a functional change outside a presentation phase.
<!-- /ANCHOR:decisions -->
