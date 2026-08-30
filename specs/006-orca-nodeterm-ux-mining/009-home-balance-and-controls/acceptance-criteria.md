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
    recent_action: "Closed all twelve criteria against re-run measurements and gates."
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
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
**Status:** Complete
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
| AC-002 | REQ-001 | Given two nested sheets, When the inner one closes, Then the outer sheet stays hidden-outside and the page beneath stays locked | Met. `hideOutside` keeps an `activeSessions` list and tears down only at length 0; an inner release re-applies visibility instead of restoring. The helper had no test at all, so `app-mobile/tests/aria-hide-outside.test.ts` now pins it: after the inner release the page beneath stays `aria-hidden="true"` while the outer sheet stays exempt, and only the last release restores the page. Negative-controlled by forcing the teardown branch unconditionally, which failed exactly that test and no other | Met | - |
| AC-003 | REQ-002 | Given the ready home screen, When a session card and its section heading are measured, Then their left content edges are equal and the card spans the column | Met. Measured in both themes across every home state: a `.session--card` now spans its `.roster--row` exactly — width 337.84px in a 337.84px row, shortfall 0 (was 193px in 338px, 145px empty), leftDelta 0. Cause was a `<button>` shrink-wrapping its auto width even as a grid box; it now carries `width: 100%` | Met | - |
| AC-004 | REQ-002 | Given the ready home screen, When the pin affordance is measured, Then it does not sit outside the card it belongs to | Met. `.roster--favorite` is contained by the `.session--card` of its own `.roster--row` in every state — 2 pins measured, 0 outside. The earlier `pinCount: 4` was a false positive from a `[class*="pin"]` selector matching `.open-spinner` | Met | - |
| AC-005 | REQ-003 | Given the theme control in each of its three states, When the option elements are measured, Then the three are of comparable weight and each is identifiable | Met. The three options measure 38.39px each — 0% spread — and together fill 93% of a 123.5px control (was 31%, the rest dead space). Each carries an `aria-label` plus a distinct mark. The labels themselves cannot be text here: three labels need 172px inside a 253px action cluster sharing a 370px header, so the control marks its states instead — see ADR-001 | Met | - |
| AC-006 | REQ-005 | Given the controls above the list, When their bounding boxes are measured, Then they resolve into a consistent rhythm | Met. Toolbar controls now share the column's left edge at 32.08px (`.roster--grouping` was at 60px) and every same-row pair matches within the tolerances — height spread 0px (max 4), baseline spread 0px (max 2). Cause was `align-items: end` defeating flex stretch and `justify-content: end` ragging four left edges | Met | - |
| AC-007 | REQ-006 | Given every committed home state — ready, empty, loading, error, stale — When each is rendered at 402x874, Then none overflows horizontally | Met. `document.documentElement.scrollWidth` stays at 402 for ready, empty, loading, error and stale in both themes | Met | - |
| AC-008 | REQ-004 | Given the change, When the token gate runs, Then no golden moved | Met. `node scripts/token-identity.mjs verify app-mobile/src/app.css` — "verify PASS: all 39 tokens.md goldens matched across light/dark/system", re-run after the `app.css` edit | Met | - |
| AC-009 | REQ-004 | Given the change, When the source is reviewed, Then no host field is invented and no production API exists to serve a story | Met. The diff is CSS only — four declarations and one mark vocabulary. No prop, slot, export or host field was added, and no markup changed | Met | - |
| AC-010 | REQ-008 | Given the change, When the presentation gates run, Then they are green | Met. `story:coverage` PASS; `catalog-smoke-cdp` 337 stories x 2 themes = 674 frames, 0 throws; `catalog-state-visibility` PASS over 337 stories; `token-override-check` PASS; `css-comment-integrity` PASS over 1 css + 128 svelte files. `ui-audit` reports **zero high and zero medium** in either theme; against a stashed pre-change baseline the only delta is 4 new `info` notes reading "2 overlapping pair(s) skipped as deliberate layering" on home ready/stale, which appear because the card now spans its row so its `position: relative` layering registers | Met | - |
| AC-011 | REQ-007 | Given the archive, When it is re-captured, Then every moved shot is intended and reproduces | Met. Ten shots moved, each explained: five home states (card width, toolbar rhythm, chip fill), three theme-control states and two header states (the mark vocabulary). A second capture reproduced exactly the same set with 0 unstable, so the moves are real rather than archive flake | Met | - |
| AC-012 | REQ-008 | Given the behaviour suites, When they run from the final state, Then they are green | Met. `npm run typecheck` exit 0; `npm run test:web` exit 0 captured directly rather than through a pipe, with both suite summaries read by content — 783 passed / 3 skipped (svelte) and 776 passed (logic) | Met | - |
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes — all twelve criteria are Met.

AC-001 carried this packet, and it did not resolve where the phase expected. Driven in a browser,
all three dismissal paths — close button, backdrop tap, swipe — already restored the surface exactly.
The lock came from a committing latch set before `await setModel` and cleared after it with no
`try/finally`: a rejected request stranded it, and that latch gates every exit from a sheet that
ignores Escape by design, over a body holding `pointer-events: none`. Reproducing it took a failing
test rather than a browser probe, which is why the probes are kept — they are what ruled the obvious
causes out.

The alignment criteria were deliberately numeric, and that is what made the work delegable: the
executor received four measurements rather than an adjective, and its output was judged by re-running
them rather than by reading its summary.

One caution is recorded rather than resolved. The first version of the theme criterion checked that
each option had non-empty `textContent`, which passed while the rendered control showed a letter, a
sun and a dot — the text was in the DOM and hidden by `font-size: 0`. A screenshot caught what the
measurement missed. The criterion now checks what renders, not what exists, but the general lesson is
that a geometry harness cannot see legibility on its own.
<!-- /ANCHOR:closure -->
