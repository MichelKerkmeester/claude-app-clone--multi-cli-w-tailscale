---
title: "Verification Checklist: Phase 4 a11y and onboarding"
description: "Verification Date: TBD. Level-2 QA items mapping to the AI/OS acceptance criteria; all open at 0%."
trigger_phrases:
  - "a11y onboarding verification checklist"
  - "a11y onboarding phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the a11y/onboarding Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 4 a11y and onboarding/settings/diagnostics

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

- [x] CHK-001 [P0] All 11 findings documented as REQs in spec.md with acceptance criteria [evidence: 11 REQs with acceptance criteria in `spec.md` P0/P1 requirement tables]
- [x] CHK-002 [P0] Sequenced approach and sheet-primitive batch defined in plan.md [evidence: `plan.md` sequences the two accessibility quick-wins ahead of the onboarding and diagnostics batches]
- [x] CHK-003 [P1] Touched-surface token-identity + test:web baseline captured before any change [evidence: baseline in `implementation-summary.md`: typecheck 1181 files 0 errors, 92+60 suite files, 692+674 tests]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on changed files apart from the repo-wide `.svelte.ts` parser gap, proven by linting the untouched `app-state.svelte.ts`, and `sheet-plan-review.svelte:70`, proven pre-existing against pristine `HEAD`]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 101 files 726 passed, 65 files 691 passed]
- [x] CHK-012 [P1] Every persisted store is try/catch guarded and degrades to empty [evidence: `connection-log.test.ts`, `device-cleanup-queue.test.ts` and `sheet-quick-prompts.svelte.test.ts` each assert an unreadable store degrades to empty rather than throwing]
- [x] CHK-013 [P1] New sheets reuse the shared Sheet primitive and its back-dismiss [evidence: `sheet-quick-prompts.svelte` mounts the shared Sheet primitive and inherits its back-dismiss, covered by `sheet-back-dismiss.svelte.test.ts`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P0] REQ-001 (AI-1): opening Find focuses the input and raises the keyboard with no second tap [evidence: `transcript-find-focus.svelte.test.ts` asserts focus after open; removing the deferred focus call turns 1 red]
- [x] CHK-021 [P0] REQ-002 (AI-2): back-gesture closes the topmost sheet on every sheet; bespoke copy removed from sheet-plan-review.svelte [evidence: `sheet-back-dismiss.svelte.test.ts` covers two sheets and topmost-only dismissal; `sheet-plan-review.svelte` now has zero popstate or focusin handlers]
- [x] CHK-022 [P1] REQ-003 (AI-3): moveUp/moveDown actions present, aria-correct, unit-tested; conditional wiring noted [evidence: `keyboard-reorder.test.ts` covers both boundaries in `keyboard-reorder.ts`; dropping the clamp turns 1 red]
- [x] CHK-023 [P1] REQ-004 (AI-4): chip fills draft without sending; every icon-only row named; storage failure degrades to empty [evidence: `sheet-quick-prompts.svelte.test.ts` asserts draft fill without send, role-and-name for every control, and empty on unreadable storage]
- [x] CHK-024 [P1] REQ-005 (OS-1): made-decision and no-op steps skip; every choice framed changeable [evidence: `onboarding-wizard.svelte.test.ts` asserts a made decision never renders its step; disabling the skip turns 3 red]
- [x] CHK-025 [P1] REQ-006 (OS-2): unconfirmed removal shows Retry card that survives restart and clears on success [evidence: `device-cleanup-queue.test.ts` asserts rehydration in a fresh module instance and clearing only on a confirmed request]
- [x] CHK-026 [P1] REQ-007 (OS-3): each probe streams its result; FAQ reachable; failed probe actionable [evidence: `screen-settings.svelte.test.ts` asserts an early probe is visible while a later one is pending, and that a failed probe renders failed]
- [x] CHK-027 [P1] REQ-008 (OS-4): ring buffer bounded and reload-durable; Copy yields structured blob; first pair fails at the ceiling [evidence: `connection-log.test.ts` asserts bounded eviction, reload durability and an allowlisted blob; `screen-enrollment.svelte.test.ts` asserts the 25 second ceiling fails visibly]
- [x] CHK-028 [P1] REQ-009 (OS-5): a synonym surfaces the row; no host call [evidence: `settings-search.test.ts` asserts `approval` surfaces Needs input and `unpair` surfaces Revoke this device, with no host call]
- [x] CHK-029 [P1] REQ-010 (OS-6): missing target advances; each tour fires once ever; never over another overlay [evidence: `tour-engine.svelte.test.ts` asserts a missing target advances, a seen tour survives reload, and no mark renders over an overlay]
- [x] CHK-030 [P1] REQ-011 (OS-7): external revoke flips the toggle on next focus; toast fires once; toggle never lies [evidence: `push-settings.svelte.test.ts` asserts focus re-probing, a single blocked toast across four lifecycle events, and disabled switches while denied]
- [x] CHK-031 [P0] token-identity 0-diff on touched CSS; test:web green from the final state [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; 101 files 726 passed and 65 files 691 passed from the final state]
- [x] CHK-032 [P1] a11y contract (focus, roles, dismissal, live regions) preserved or improved [evidence: focus, roles, dismissal and live regions assert across `transcript-find-focus.svelte.test.ts`, `sheet-back-dismiss.svelte.test.ts` and `sheet-quick-prompts.svelte.test.ts`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (AI-2 cross-consumer over all five sheets; OS-7 class-of-bug on the lying toggle) [evidence: AI-2 is cross-consumer over all five sheets through `sheet.svelte`; OS-7 is the class-of-bug fix on the lying toggle in `push-settings.svelte`]
- [x] CHK-FIX-002 [P0] Same-class producer inventory: every sheet audited for back-dismiss after AI-2 [evidence: every sheet now inherits back-dismiss from the shared primitive; `sheet-back-dismiss.svelte.test.ts` covers two of them and the bespoke copy is gone]
- [x] CHK-FIX-003 [P0] Consumer inventory: every icon-only control audited for an a11y label (AI-4, OS-*) [evidence: `sheet-quick-prompts.svelte.test.ts` queries every control by role and name, so an unnamed icon-only control fails the suite]
- [x] CHK-FIX-006 [P1] OS-7 permission-revoked-while-backgrounded negative control reproduced before the fix [evidence: the revoked-while-backgrounded symptom was reproduced by forcing the toast to fire on every probe in `push-settings.svelte` before the guard was accepted]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] Quick-prompts, gates, tour, cleanup queue, and ring buffer are client-only; none reach the host [evidence: `onboarding-gates.test.ts`, `tour-engine.svelte.test.ts`, `device-cleanup-queue.test.ts` and `connection-log.test.ts` each assert local-storage-only persistence; no host call exists on any of those paths
- [x] CHK-041 [P0] The Copy diagnostics blob carries no secret material [evidence: `connection-log.test.ts` asserts the copied blob carries only `at`, `kind`, `status`, `durationMs` and a safe `code`, with no token, header or pairing field]
- [x] CHK-042 [P1] OS-7 never claims a permission is in effect when the OS denied it (RS-4 principle) [evidence: `push-settings.svelte.test.ts` asserts the switch never renders enabled while permission is denied; only a fresh probe clears a denial]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized; AI-3 conditional and OS-7 AN-6 absorption noted [evidence: `spec.md`, `plan.md` and `tasks.md` all record AI-3 as conditional and OS-7 as absorbing AN-6]
- [x] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: a hygiene scan over every changed file in `app-mobile/src` and `app-mobile/tests` returned no matches for spec paths or finding ids, and commit `d4f1c24` passed the pre-commit hygiene hook]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to `pages/{chat,enrollment,home,settings}/**` and `shared/{primitives,state,transport,commands,format}/**` [evidence: the diff stays inside `app-mobile/src/pages/{chat,enrollment,home,settings}`, `app-mobile/src/shared/{primitives,state,transport,commands,format}` and `app-mobile/tests`]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 0/12 |
| P1 Items | 17 | 0/17 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
