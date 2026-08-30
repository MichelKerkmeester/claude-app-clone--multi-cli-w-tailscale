---
title: "Acceptance Criteria: Phase 9 Home balance, control legibility, and the sheet interaction lock"
description: "The criteria this phase must satisfy before it may be closed. Each is a browser measurement or a gate result, because taste is not checkable and every claim here has to be."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls"
    last_updated_at: "2026-08-29T20:15:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the closure gate as measurable checks before dispatching the executor."
    next_safe_action: "Dispatch the design executor against these criteria."
    completion_pct: 10
---
# Acceptance Criteria: Phase 9 Home balance, control legibility, and the sheet interaction lock

<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
<!-- HVR_REFERENCE: .opencode/skills/sk-doc/shared/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 006-orca-nodeterm-ux-mining/009-home-balance-and-controls
**Level:** 2
**Status:** In Progress
**Date:** 2026-08-29
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

Every row is a measurement. "Looks better" is not a criterion; a number, a gate result or a
reproduced-then-fixed failure is. All viewport measurements are taken at the archive's frame,
**402 x 874**, in **both** themes.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the chat, When the model picker is opened and then closed, Then the transcript scrolls and a control accepts a click | Met by `88abc43`. Browser probes at 402x874 with touch emulation drove all three dismissal paths — close button, backdrop tap, swipe-dismiss — and each restored `body` pointer-events, overflow, inert count and outside `aria-hidden` to their pre-open baseline, with the sheet re-openable afterwards. The defect was elsewhere: the committing latch was set before `await setModel` and cleared after it with no `try/finally`, so a rejected request stranded it true. That latch gates every exit, and the sheet ignores Escape by design, so one failed commit left an unclosable modal over a `pointer-events: none` page. Reproduced by a failing test whose DOM dump showed a `disabled` close button under `body style="… overflow: hidden; pointer-events: none"`, then fixed and re-run green | Met | - |
| AC-002 | REQ-001 | Given two nested sheets, When the inner one closes, Then the outer sheet stays hidden-outside and the page beneath stays locked | Open a sheet from within a sheet, close the inner, and assert the outside-hiding session count is 1 rather than 0 — the helper is reference-counted and must not release early | Unmet | - |
| AC-003 | REQ-002 | Given the ready home screen, When a session card and its section heading are measured, Then their left content edges are equal and the card spans the column | `getBoundingClientRect()` on the card and on its `RUNNING` / `IDLE` heading: left edges equal within 1px, and the card's width is within 8px of the heading's | Unmet | - |
| AC-004 | REQ-002 | Given the ready home screen, When the pin affordance is measured, Then it does not sit outside the card it belongs to | The pin control's rect is contained by the card's rect, or the layout is restated so no control is orphaned in the empty right half | Unmet | - |
| AC-005 | REQ-003 | Given the theme control in each of its three states, When the option elements are measured, Then the three are of comparable weight and each is identifiable | Measured widths of the three options within 25% of each other, each carrying a text label or an `aria-label` plus a non-empty icon, and the control's own width is consumed by the options rather than by trailing dead space | Unmet | - |
| AC-006 | REQ-005 | Given the controls above the list, When their bounding boxes are measured, Then they resolve into a consistent rhythm | Controls in the same row share a height within 4px and a baseline within 2px; no control's right edge exceeds the column's content edge | Unmet | - |
| AC-007 | REQ-006 | Given every committed home state — ready, empty, loading, error, stale — When each is rendered at 402x874, Then none overflows horizontally | `document.documentElement.scrollWidth <= 402` for each state, in both themes | Unmet | - |
| AC-008 | REQ-004 | Given the change, When the token gate runs, Then no golden moved | `node scripts/token-identity.mjs verify app-mobile/src/app.css` passes its 39 goldens across light, dark and system | Unmet | - |
| AC-009 | REQ-004 | Given the change, When the source is reviewed, Then no host field is invented and no production API exists to serve a story | The diff adds no field the relay does not send, and no prop, slot or export whose only consumer is a story | Unmet | - |
| AC-010 | REQ-008 | Given the change, When the presentation gates run, Then they are green | `story:coverage`, `catalog-smoke-cdp`, `catalog-state-visibility`, `css-comment-integrity` pass, and `ui-audit.mjs` reports no new high or medium finding in either theme | Unmet | - |
| AC-011 | REQ-007 | Given the archive, When it is re-captured, Then every moved shot is intended and reproduces | Each moved screenshot is named with what changed; the archive is not byte-stable, so a moved shot is confirmed by a second capture before it is believed | Unmet | - |
| AC-012 | REQ-008 | Given the behaviour suites, When they run from the final state, Then they are green | `npm run typecheck` 0 errors and `npm run test:web` exit 0 with both suite summaries read by content, not by a piped tail | Unmet | - |
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** No — every criterion is open until the work runs.

AC-001 carries this packet. A screen that cannot be scrolled cannot be evaluated, so the interaction
lock blocks every other judgement about the home screen being made on a real device. It is also the
one criterion that must be **reproduced before it is fixed**: the failure has to be observed in a
browser first, so that the same check proves the repair rather than merely agreeing with it.

The alignment criteria are deliberately numeric. "Balance" is the goal, but a target expressed as
taste cannot be verified by anyone other than its author, and this work is being delegated.
<!-- /ANCHOR:closure -->
