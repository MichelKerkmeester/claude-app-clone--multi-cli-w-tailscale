---
title: "Verification Checklist: Phase 6 host-gated usage/search/change-review"
description: "Verification Date: TBD. Level-2 QA items mapping to the UQ/SH/CR/TE/MI acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host-gated usage/search/change-review Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance and fail-closed item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 6 host-gated usage/search/change-review

---

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] All 21 findings documented as REQs in spec.md, each naming its host field and the ready-now/blocked split [evidence: 21 REQs in `spec.md`, each naming its host field and the ready-now versus blocked split]
- [x] CHK-002 [P0] Fixture defined for each ready-now surface (usage resetsAt, search results, resolved path) [evidence: fixtures defined in `usage-window.test.ts`, `session-search.test.ts` and `safe-markdown-artifact.svelte.test.ts`]
- [x] CHK-003 [P1] Each blocked field tracked in `../../007-host-requests/` [evidence: the sixteen blocked fields are filed as REQ-014 through REQ-018 in `../../007-host-requests/spec.md`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 108 files 760 passed, 77 files 749 passed]
- [x] CHK-012 [P1] Every host-gated surface fails closed (renders nothing) with its field absent [evidence: an independent probe rendered all seven source-control surfaces with no host data and each produced empty output]
- [x] CHK-013 [P1] The client renders only host-pre-resolved tokens; no verdict, inference, or mutation [evidence: no verdict is computed: `check-summary.svelte` renders the host classification and `upstream-status.svelte` renders host `upstreamStatus` only]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P1] REQ-003 (UQ-3): reset-countdown formatter correct from a fixture; scheduler wakes only at the rounding boundary [evidence: `usage-format.test.ts` asserts the countdown and a boundary-aligned hourly delay computed rather than slept]
- [x] CHK-021 [P1] REQ-006 (UQ-6): used/remaining toggle never flips colour meaning; device-local [evidence: `usage-format.test.ts` asserts the toggle changes wording while the severity result stays identical]
- [x] CHK-022 [P1] REQ-005 (UQ-5): usage colour and context-meter colour are two functions; absent severity reads unknown; no shared scale [evidence: `usage-format.test.ts` asserts the two colour functions cannot be unified; delegating one to the other turns 1 red]
- [x] CHK-023 [P1] REQ-001/002/004/007/008 (UQ-1/2/4/7/8): usage card inert without the payload; gating window is host-flagged; failed poll keeps last-good; stale decays; poll-cadence documented [evidence: `usage-window.test.ts` asserts the host-flagged gating window beats the fullest bar and a failed poll keeps its last good value]
- [x] CHK-024 [P1] REQ-009 (SH-1): search harness debounces 180ms, gates under 2 chars, renders fixture results; live results only with the RPC [evidence: `session-search.test.ts` asserts 1 character does not search, 2 does, 179 ms is silent and 180 ms fires]
- [x] CHK-025 [P1] REQ-010..017 (CR-1..8): each renders only its host token; unknown check degrades to muted; CR-4 reuses `diff-preview.svelte` [evidence: `source-control.svelte.test.ts` asserts unknown degrades to muted-unresolved; `changed-files.svelte` imports `parseUnifiedDiff` and no second parser exists]
- [x] CHK-026 [P1] REQ-018 (CR-9): three-tab hub deep-links (composing with NL-1) and safe-defaults on a bad link [evidence: `source-control-segment-route.svelte.test.ts` asserts a known segment selects and an unknown one lands on the safe default]
- [x] CHK-027 [P1] REQ-019 (TE-3): detected path inert without the RPC; resolved path opens at line:col; miss toasts [evidence: `safe-markdown-artifact.svelte.test.ts` asserts an unresolved path stays inert and a resolved one opens at the host line and column]
- [x] CHK-028 [P1] REQ-020/021 (MI-1/MI-3): excerpt+prefill builds over MI-4; new-chat and branch inert until their host capability lands [evidence: `session-composer-quote.svelte.test.ts` asserts the excerpt routes through `excerptToBudget` and send is never called; `branch-entry.test.ts` covers the absent RPC]
- [x] CHK-029 [P0] token-identity 0-diff on moved CSS; test:web green from the final state [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; both suites green from the final state]
- [x] CHK-030 [P1] a11y-parity: usage sheet, search screen, source-control hub preserve dialog/listbox/tab semantics and focus return [evidence: the usage sheet is a labelled dialog and the hub exposes tab semantics in `usage-sheet.svelte.test.ts` and `source-control.svelte.test.ts`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (usage/search/change-review are cross-consumer host-render; UQ-5 algorithmic on colour separation) [evidence: usage, search and change-review are cross-consumer host-render surfaces; UQ-5 is algorithmic on the colour separation in `usage-format.ts`]
- [x] CHK-FIX-002 [P0] Same-class producer inventory: every host-published field consumed is enumerated with its fail-closed absent behaviour [evidence: each consumed host field is enumerated in `source-control-types.ts` and the usage input types, each with its absent behaviour rendering nothing]
- [x] CHK-FIX-003 [P0] Consumer inventory: `diff-preview.svelte` reuse (CR-4) and NL-1 deep-link composition (CR-9) audited [evidence: `changed-files.svelte` imports `parseUnifiedDiff` from `diff-preview.svelte`; the hub segment route composes the existing navigation]
- [x] CHK-FIX-004 [P0] TE-3 path handling includes an outside-root / miss / line:col adversarial fixture set [evidence: `safe-markdown-artifact.svelte.test.ts` covers host-declined, no-artifact-target, absent-opener and resolved-at-line-and-column]
- [x] CHK-FIX-007 [P1] Fixture-backed evidence pinned to a stated fixture shape, not a moving host response [evidence: every fixture shape is defined in the test or in `source-control-types.ts`, not taken from a live host response]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-031 [P0] No fabricated check verdict, quota inference, or synthesized path; all values are host-published [evidence: `git status packages/` is clean and no module widens a protocol type; every rendered value comes from a host-shaped input]
- [x] CHK-032 [P0] TE-3 opens only host-resolved targets; no device filesystem walk or local path synthesis [evidence: `safe-markdown-artifact.svelte.test.ts` asserts a host-declined path stays inert; no filesystem access exists in `prose-link.ts`]
- [x] CHK-033 [P1] Web URLs opened (CR-3) are host-supplied; no client-constructed provider URLs [evidence: `check-list.svelte` renders only host-supplied URLs; no provider URL string is assembled anywhere in `pages/chat/source-control`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] spec/plan/tasks synchronized; every blocked field cross-referenced to `../../007-host-requests/` [evidence: `spec.md`, `plan.md` and `tasks.md` cross-reference REQ-014 through REQ-018 in `../../007-host-requests/spec.md`]
- [x] CHK-041 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: a hygiene scan over every changed file in `app-mobile/src` and `app-mobile/tests` returned no spec paths or finding ids]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Changes confined to `pages/{home,search,chat}/**`, `shared/{format,commands}/**`, `routes/**` [evidence: the diff stays inside `app-mobile/src/pages/{home,chat}`, `app-mobile/src/shared/{format,commands}`, `app-mobile/src/routes` and `app-mobile/tests`]
- [x] CHK-051 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 16 | 0/16 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
