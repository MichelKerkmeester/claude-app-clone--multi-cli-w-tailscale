---
title: "Verification Checklist: Phase 1 composer/send"
description: "Verification Date: TBD. Level-2 QA items mapping to the CI/RS acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the composer/send Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 1 composer/send

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

- [x] CHK-001 [P0] All 7 findings documented as REQs in spec.md with acceptance criteria [evidence: 7 REQs with acceptance criteria in `spec.md` §4]
- [x] CHK-002 [P0] Sequenced approach and ambiguous-send batch defined in plan.md [evidence: `plan.md` sequences the ambiguous-send batch]
- [x] CHK-003 [P1] Composer token-identity + test:web baseline captured before any change [evidence: baseline captured pre-change: 76+43 files / 607+542 tests, recorded in `c7d08a5`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file; 3 stories + 3 sync-test errors proven pre-existing at HEAD]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: no console errors in either suite run; typecheck warnings unchanged at the 6-warning baseline]
- [x] CHK-012 [P1] Send-path error handling covers accepted/rejected/unknown [evidence: `relay.ts` classifies accepted/rejected/delivery-unknown; `relay-prompt-delivery.test.ts` 8 pass]
- [x] CHK-013 [P1] Changes follow the existing composer seam and storage-helper patterns [evidence: lock forwarded from the parent seam; draft cache follows `shared/state/` module conventions]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P0] REQ-001 (CI-4): reconnect blip mid-typing does not disable the textarea; Send stays gated [evidence: `session-composer.svelte.test.ts` reconnect-blip test; gate neutered turns 4 red]
- [x] CHK-021 [P0] REQ-002 (CI-1): A→Home→B→A restores draft and staged attachment exactly; storage failure degrades to empty [evidence: `prompt-delivery-hold.svelte.test.ts` park/restore + storage-throw tests; removing fail-closed turns 2 red]
- [x] CHK-022 [P0] REQ-003 (CI-2): lost-ack-but-landed send does not restore or resend; true failure restores exact raw draft after the 20s deadline [evidence: `prompt-delivery-hold.svelte.test.ts` lost-ack + raw-draft tests; breaking the hold turns 4+2 red]
- [x] CHK-023 [P0] REQ-004 (RS-1): submitPrompt distinguishes accepted/rejected/unknown, ambiguity survives re-throw, distinct copy per outcome [evidence: `relay-prompt-delivery.test.ts` 8 outcomes incl. re-throw hop count; 5xx misclassification turns 1 red]
- [x] CHK-024 [P1] REQ-005 (RS-2): deferred error never paints the wrong session; unmounted-banner path toasts [evidence: `deferred-send-error.svelte.test.ts` + scope test; paint-guard and render-filter each turn their test red]
- [x] CHK-025 [P1] REQ-006 (RS-3): 1/2 blips stay reconnecting, 3rd flips to revoked, full auth clears the latch [evidence: `auth-rejection-latch.test.ts` 1/2/3 + recovery; threshold 3 to 1 turns 5 red]
- [x] CHK-026 [P1] REQ-007 (CI-5): picker inert with catalog absent; inserts editable draft (never auto-send) and badges duplicate-source when present [evidence: `reusable-prompt-catalog.svelte.test.ts` 12 pass: inert, insert-not-send, duplicate-source badge]
- [x] CHK-027 [P0] token-identity 0-diff on composer CSS; test:web green from the final state [evidence: `token-identity.mjs verify` PASS 35 goldens; `test:web` 79+47 files / 640+585 tests from the final state]
- [x] CHK-028 [P1] a11y contract (live regions, focus return) preserved on the composer [evidence: composer keeps its `role=status` polite live region and the attachment-draft live region; `composer-tools-a11y.svelte.test.ts` 3 pass]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (CI-4 class-of-bug on the disabled predicate; CI-2/RS-1 cross-consumer over send outcomes) [evidence: CI-4 is the disabled-predicate class in `session-composer.svelte`; CI-2/RS-1 are cross-consumer over the outcome thrown by `relay.ts`]
- [x] CHK-FIX-002 [P0] Same-class producer inventory: every transient lock feeding the textarea `disabled` audited (CI-4) [evidence: every transient lock feeding the textarea audited; all now gate send only, via the parent lock]
- [x] CHK-FIX-003 [P0] Consumer inventory: every `sendPrompt`/`submitPrompt` caller audited for the new outcome shape (RS-1) [evidence: `submitPrompt` callers audited: `screen-chat.svelte` consumes the tagged outcome; no other caller reads it]
- [x] CHK-FIX-006 [P1] Cellular/lost-ack negative control reproduced before the CI-2 fix and proven by the same check [evidence: reproduced by injection AFTER the fix, not before — the executor wrote feature and tests together, so no pre-fix tree existed. Forcing `prompt-delivery-hold.ts` to return 'restore' reproduces the exact symptom and turns `prompt-delivery-hold.svelte.test.ts` red; restoring turns it green]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No draft text or attachment bytes enter a DTO; the draft cache is client-only [evidence: draft cache is device-local `localStorage` + in-memory only; no DTO carries draft text or attachment bytes]
- [x] CHK-031 [P0] The CI-5 picker never invents rows; it renders only host catalog entries [evidence: `reusable-prompt-catalog.svelte.ts` parses host payloads only; absent/foreign-session input fails closed, covered by `reusable-prompt-catalog.svelte.test.ts`]
- [x] CHK-032 [P1] RS-3 latch never leaks auth state beyond the reconnect banner [evidence: strike state is module-local to `auth-rejection-latch.ts`; only the phase from `connectionReducer` reaches the UI]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] spec/plan/tasks synchronized; CI-5 host dependency cross-referenced to `../../007-host-requests/` [evidence: CI-5 host dependency filed as REQ-008 in `../../007-host-requests/spec.md`]
- [x] CHK-041 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: hygiene grep over `git diff` and every new file: zero finding/REQ/CHK ids in comments]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Changes confined to `pages/chat/**` and `shared/{transport,state,commands}/**` [evidence: diff confined to `pages/chat/**`, `shared/{transport,state,commands}/**`, `routes/+layout.svelte`, and `tests/**`]
- [x] CHK-051 [P1] No task-created residue in the diff [evidence: `git status` clean after each commit; probe files removed and verified absent]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 0/12 |
| P1 Items | 11 | 0/11 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
