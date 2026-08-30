---
title: "Phase 9 - Home balance, control legibility, and the sheet interaction lock"
description: "The home screen reads as unstructured on a real phone: session cards occupy half the width while their section headers span it, three differently-shaped control clusters stack unevenly, and the theme control renders as unlabelled marks. Closing the model picker also leaves the chat unable to scroll or accept input. Chain: after 008-uiux-features-mining."
trigger_phrases:
  - "home balance and controls spec requirements"
  - "home balance and controls phase"
  - "home screen alignment"
  - "theme control looks broken"
  - "model picker locks the chat"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed the phase: sheet latch fixed, home geometry green in both themes."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 9 - Home balance, control legibility, and the sheet interaction lock

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Previous: [`../008-uiux-features-mining/spec.md`](../008-uiux-features-mining/spec.md)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `006-orca-nodeterm-ux-mining` |
| **Level** | 2 |
| **Priority** | P0 |
| **Status** | Complete |
| **Created** | 2026-08-29 |
| **Scope** | `app-mobile/src/pages/home/`, `shared/chrome/theme-control.svelte`, the sheet primitive |
| **Constraint** | Presentation and interaction only. No host field, no production API for a story, no token outside its gate |
| **Evidence** | A before and after screenshot per surface, plus a browser measurement for each alignment claim |
| **Phase chain** | after `008-uiux-features-mining` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The home screen does not read as a designed surface on a phone. Measured against the committed `screenshots/views/home--ready.png` at the archive's 402x874 frame: the session cards occupy roughly half the available width while the section headers above them (`ATTENTION`, `RUNNING`, `IDLE`) span the full width, so a card and its own heading share no alignment edge and the right half of the list is empty. The controls above the list stack as three clusters in three different shapes — a segmented control, a button that hangs off the same row, then a row of pill filters — with no shared rhythm. The theme control renders as an unlabelled dark square, a small glyph and a bare dot inside a wide pill, which reads as an unfinished component rather than a three-state choice. Separately, an operator reports that opening the model picker and closing it leaves the chat unable to scroll or accept input, which makes the surface untestable on a device.

### Purpose
Make the home screen read as one balanced column and make its controls legible as controls, taking the visual balance of the orca and nodeterm references as the target. Restore interaction after a sheet closes, because a screen that cannot be scrolled cannot be evaluated at all.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- The home screen's column rhythm: one shared content edge for headings, cards and controls.
- Session card width, and the placement of its pin affordance.
- The control clusters above the list: sort, session creation, refresh and freshness, and the state filters.
- `theme-control.svelte`: make the three states legible and evenly weighted.
- The sheet interaction lock: after any sheet closes, the surface beneath scrolls and accepts input.

### Out of Scope
- Any host field or protocol change; the roster data stays exactly as the relay sends it.
- Token values. A retint goes through `scripts/token-identity.mjs` and its goldens, not through this phase.
- The chat transcript, composer and review surfaces, except for the sheet-close interaction fix.
- Renaming or restructuring any story.

### Files to Change
- `app-mobile/src/pages/home/screen-home.svelte`, `card-session.svelte`, `freshness.svelte`, `push-settings.svelte`.
- `app-mobile/src/shared/chrome/theme-control.svelte`.
- `app-mobile/src/shared/primitives/sheet/` and `shared/primitives/a11y/aria-hide-outside.svelte.ts` for the interaction lock.
- `app-mobile/src/app.css` only where a shared rule is genuinely shared; single-surface rules stay in the component.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 After a sheet closes, the surface beneath scrolls and accepts pointer and keyboard input.
- REQ-002 Session cards and their section headings share one content edge, and a card spans the column rather than half of it.
- REQ-003 The theme control presents three states of equal visual weight, each identifiable without prior knowledge.
- REQ-004 No host field is invented, no production API is added to serve a story, and no token value moves.

### P1 - Required (complete OR user-approved deferral)
- REQ-005 The controls above the list resolve into a consistent rhythm rather than three unrelated shapes.
- REQ-006 Every surface holds at the archive's 402x874 frame with no horizontal overflow and no orphaned control.
- REQ-007 Every existing story keeps its name, and each moved screenshot is explained.
- REQ-008 The presentation gates stay green, including both themes.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Opening and closing the model picker leaves the chat scrollable and interactive, proven by a browser check rather than by inspection.
- Measured in a browser at 402x874, the session card and its section heading share a left edge, and the card's width is within a few pixels of the column's.
- The three theme states render with comparable visual weight and each carries a label or an unambiguous icon.
- `ui-audit.mjs` reports no new high or medium finding in either theme, and the other presentation gates stay green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- The interaction lock sits under a third-party dialog primitive. The fix must be traced to whichever layer actually holds the lock — the primitive's own body handling or this repository's outside-hiding helper — rather than patched at the symptom.
- Alignment work invites token edits. The token gate is the authority; a spacing change that moves a golden is a different phase.
- The home screen has committed screenshots in several states. Every one that moves needs a reason, and the archive is not byte-stable, so a moved shot must be re-captured before it is believed.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
The roster renders from the same data; no additional fetch, and no layout that forces a second pass on every state change.

### Security
Presentation only. The redaction posture, the opaque session identifiers and the read-only default are untouched.

### Reliability
The interaction fix is verified by reproducing the failure first, so the check that proves it can also catch its return.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Should the pin affordance sit inside the card or remain a sibling? Inside is more conventional; the current split is what leaves the right half empty.
- Do the state filters and the sort control need to coexist at all, or is one of them redundant once the list is grouped by state?
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
An empty roster, a single session, and a long opaque identifier all have committed stories; each must still hold its column after the change.

### Error Scenarios
The stale and error home states render different copy at the same widths, so a width fix must be checked against them and not only the ready state.

### State Transitions
Closing a sheet while another sheet is open must release only the closing layer, since sheets nest and the outside-hiding helper is reference-counted.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. A contained set of presentation files plus one interaction defect whose root cause spans a third-party primitive and this repository's accessibility helper.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this phase.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `acceptance-criteria.md` - the closure gate.
- `../002-home-selection/spec.md` - the earlier home-selection work this builds on.
<!-- /ANCHOR:cross-refs -->
