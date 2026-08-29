---
title: "Verification checklist - Phase 9 Home balance and controls"
description: "Verification checklist for the home rebalance, the theme control and the sheet interaction lock; every item is a measurement rather than a judgement."
trigger_phrases:
  - "home balance and controls verification checklist"
  - "home balance and controls phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the phase from the committed home screenshot and an operator report."
    next_safe_action: "Dispatch the design executor against the acceptance criteria."
    completion_pct: 10
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 9 Home balance and controls

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact. Alignment is measured, not judged, because this work is delegated and a target expressed as taste cannot be verified by anyone but its author.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented with acceptance criteria [evidence: `spec.md` section 4 states REQ-001 through REQ-008; `acceptance-criteria.md` holds twelve measurable rows]
- [x] CHK-002 [P0] The defect was read from the artifact, not the description [evidence: `screenshots/views/home--ready.png` and `theme-control--system.png` inspected at full resolution]
- [x] CHK-003 [P1] The layers that could hold the interaction lock are identified [evidence: `sheet-content.svelte` calls the reference-counted `hideOutside`; the dialog beneath is bits-ui]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] No host field invented and no production API added to serve a story [pending]
- [ ] CHK-011 [P0] CSS lands in the file that owns it; shared rules go to `app.css` behind `:global()` [pending]
- [ ] CHK-012 [P1] Comments carry the durable why, with no ephemeral artifact pointer [pending]
- [ ] CHK-013 [P1] Class names follow the `block--element` grammar with the `is-*` state prefix [pending]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] CHK-020 [P0] The interaction lock was reproduced before it was fixed [pending]
- [ ] CHK-021 [P0] Scroll and click both work after a sheet closes, with no residual body override or `inert` [pending]
- [ ] CHK-022 [P0] Nested sheets still hide outside correctly when the inner one closes [pending]
- [ ] CHK-023 [P0] Card and heading left edges are equal within 1px, and widths within 8px [pending]
- [ ] CHK-024 [P1] No home state overflows horizontally at 402x874 in either theme [pending]
- [ ] CHK-025 [P0] Both behaviour suites green from the final state, confirmed by content [pending]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-030 [P0] The theme control's three states are of comparable weight and each is identifiable [pending]
- [ ] CHK-031 [P1] The controls above the list share a rhythm rather than three shapes [pending]
- [ ] CHK-032 [P1] The pin affordance is no longer orphaned in the empty right half [pending]
- [ ] CHK-033 [P1] Every moved screenshot is named and reproduces on a second capture [pending]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] The redaction posture and opaque identifiers are untouched [pending]
- [ ] CHK-041 [P0] No token value moved; the token gate holds its goldens [pending]
- [ ] CHK-042 [P1] The read-only default and the mutation fence are not crossed [pending]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] The implementation summary names each moved screenshot and why [pending]
- [ ] CHK-051 [P1] The root cause of the interaction lock is recorded, not just the fix [pending]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes stay inside the files named in scope [pending]
- [ ] CHK-061 [P1] No story is renamed or removed [pending]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Pre-implementation is complete: the defects were read from the committed artifacts and the candidate layers for the interaction lock are identified. Everything else is open until the work runs, and the two open questions in `spec.md` — where the pin affordance belongs, and whether the sort control and the state filters are both needed — are design decisions for the executor to answer with a rendered comparison rather than an opinion.
<!-- /ANCHOR:summary -->
