---
title: "Verification Checklist: Phase 5 host inbox and notifications"
description: "Verification Date: TBD. Level-2 QA items mapping to the CE/AN/HP-3 acceptance criteria; all open at 0%."
trigger_phrases:
  - "host inbox notifications verification checklist"
  - "host inbox notifications phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host inbox/notification Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 5 host inbox and notifications

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

- [x] CHK-001 [P0] All 13 findings documented as REQs, each naming its host field/RPC and the ready-now/blocked split [evidence: 13 REQs in `spec.md`, each naming its host field and the ready-now versus blocked split]
- [x] CHK-002 [P0] Sequenced approach and inbox/notification batches defined in plan.md [evidence: `plan.md` sequences the unblocked read/archive work ahead of the twelve blocked renders]
- [x] CHK-003 [P1] Every host request filed in `../../007-host-requests/`; inbox token-identity + test:web baseline captured [evidence: REQ-009 through REQ-013 filed in `../../007-host-requests/spec.md`; baseline 101+65 suite files and 726+691 tests recorded]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file; the standing `.svelte.ts` parser gap is repo-wide, proven by linting the untouched `app-state.svelte.ts`]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 103 files 735 passed, 73 files 727 passed]
- [x] CHK-012 [P1] Every host field read is fail-closed (absent field renders nothing) [evidence: an independent probe confirmed `inbox-timeline.ts`, `push-kind-gate.ts`, `notification-tap-route.ts` and `push-hold-queue.ts` all return nothing for absent or empty input]
- [x] CHK-013 [P1] Changes follow the existing inbox/attention seam [evidence: `inbox-read-state.ts` layers over the existing attention seam in `attention.ts` without replacing host state]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P1] REQ-001 (CE-5): reading a card hides it from this device's badge only; no host state changes [evidence: `inbox-read-state.test.ts` asserts the host fixture is unchanged and no request is issued on read]
- [x] CHK-021 [P1] REQ-002 (CE-1): timeline renders nothing with field absent; renders newest-first by sessionId from a fixture [evidence: `inbox-timeline.test.ts` asserts newest-first across three sessions and an empty result for an absent stream]
- [x] CHK-022 [P1] REQ-003 (CE-2): a duplicate title in-window shows one card; no client-invented dedup [evidence: `inbox-timeline.test.ts` asserts one card just inside the window and two just outside; the client adds no dedup beyond that rule]
- [x] CHK-023 [P1] REQ-004 (CE-3): answered ask stops glowing with stale choices on the supersede edge [evidence: `inbox-timeline.test.ts` asserts an answered ask no longer offers its old options]
- [x] CHK-024 [P1] REQ-005 (CE-4): only the retained set renders; nothing resurrected from local cache [evidence: `inbox-timeline.test.ts` asserts the retained pair per node and that a node absent from input never appears]
- [x] CHK-025 [P1] REQ-006 (CE-6): a finished-unseen card clears on every surface after one view [evidence: `inbox-ack.test.ts` asserts a local open alone does not clear and the host re-broadcast does]
- [x] CHK-026 [P1] REQ-007 (CE-7): acting on a stale ticket shows already-handled [evidence: `screen-attention-inbox.capabilities.svelte.test.ts` asserts a stale ticket is refused and no request is issued]
- [x] CHK-027 [P1] REQ-008 (HP-3): bulk bar inert without the read-ack RPC; never fakes a batch ack [evidence: `screen-attention-inbox.capabilities.svelte.test.ts` asserts no batch acknowledgement is issued without the host capability]
- [x] CHK-028 [P1] REQ-009 (AN-1): host restart with a stale seq quarantines rather than drops [evidence: `notification-watermark.test.ts` asserts a lower seq under a new epoch quarantines rather than skipping]
- [x] CHK-029 [P1] REQ-010 (AN-2): suppressed-while-foregrounded alert surfaces on background unless answered [evidence: `push-hold-queue.test.ts` asserts a held alert surfaces on background and one resolved while held is dropped]
- [x] CHK-030 [P1] REQ-011 (AN-3): toggling a kind off stops it before a throttle slot is spent [evidence: `push-kind-gate.test.ts` asserts a muted kind consumes no throttle budget; reversing the order turns 1 red]
- [x] CHK-031 [P1] REQ-012 (AN-4): unknown host refused, missing credential to re-pair, never a blank chat [evidence: `notification-tap-route.test.ts` asserts an unknown host is refused with no fallback and a recovery hint routes to recovery]
- [x] CHK-032 [P1] REQ-013 (AN-5): answered-elsewhere banner retracts with no show-after-dismiss flash [evidence: `banner-retraction.test.ts` asserts a pre-show dismissal never shows and the emitted operation order carries no show-after-dismiss]
- [x] CHK-033 [P0] token-identity 0-diff on inbox CSS; test:web green from the final state [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; both suites green from the final state]
- [x] CHK-034 [P1] a11y contract (list semantics, banner roles, focus return) preserved [evidence: the timeline region carries an accessible name and the inbox list semantics assert in `screen-attention-inbox.capabilities.svelte.test.ts`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (CE-5 instance-only; the rest cross-consumer over a host field) [evidence: CE-5 is the only instance-level fix in `inbox-read-state.ts`; the other twelve are cross-consumer over host fields that do not exist]
- [x] CHK-FIX-002 [P0] Producer inventory: every consumer of `AttentionItemDto` audited for the added `sessionId` shape [evidence: `AttentionItemDto` was confirmed to carry no sessionId (`packages/pi-rpc-protocol/dist/types.d.ts:772`), so every consumer is unchanged and the join is filed as REQ-009]
- [x] CHK-FIX-003 [P0] Consumer inventory: every notification-tap and badge consumer audited against the new payloads [evidence: `notification-tap-route.ts` and `attention.ts` are the two tap and badge consumers; both are capability-gated and covered]
- [x] CHK-FIX-005 [P1] Fixture matrix axes (present/absent field, in-window/out-window, known/unknown host) listed before completion [evidence: the axes are exercised as present/absent field in `inbox-timeline.test.ts`, inside/outside the ten-minute window in the same suite, and known/unknown host in `notification-tap-route.test.ts`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] Device-local read/archive and the reconnect watermark are client-only; never reach the host [evidence: `inbox-read-state.ts` and `notification-watermark.ts` persist to device storage only; no host call exists on either path]
- [x] CHK-041 [P0] A notification payload is validated (hostId known) before any route; unknown host refused [evidence: `notification-tap-route.ts` validates hostId against a known set before any route and refuses otherwise, covered by two tests]
- [x] CHK-042 [P1] The client fabricates no resolved/unresolved/dedup/retention state [evidence: no module imports or widens `AttentionItemDto`; `git status packages/` is clean and every module defines its own host-shaped input type]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized; every host dependency cross-referenced to `../../007-host-requests/` [evidence: `spec.md`, `plan.md` and `tasks.md` cross-reference REQ-009 through REQ-013 in `../../007-host-requests/spec.md`]
- [x] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: a hygiene scan over every changed file in `app-mobile/src` and `app-mobile/tests` returned no spec paths or finding ids, and commit `2c1917a` passed the pre-commit hygiene hook]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to `pages/inbox/**`, `shared/{format,state}/**`, `routes/**`, and the service worker [evidence: the diff stays inside `app-mobile/src/pages/inbox`, `app-mobile/src/shared/{format,state}` and `app-mobile/tests`]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 23 | 0/23 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
