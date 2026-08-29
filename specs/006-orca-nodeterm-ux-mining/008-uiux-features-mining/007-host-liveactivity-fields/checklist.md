---
title: "Verification Checklist: Phase 7 Live-Activity and host DTO fields"
description: "Verification Date: TBD. Level-2 QA items mapping to the LA/SC/CI/MA/SP/HP acceptance criteria; all open at 0%."
trigger_phrases:
  - "host liveactivity fields verification checklist"
  - "host liveactivity fields phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the Live-Activity and host DTO-field Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 7 Live-Activity and host DTO fields

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

- [x] CHK-001 [P0] All 13 findings documented as REQs in spec.md with acceptance criteria and a named host dependency or "none" [evidence: 13 REQs in `spec.md`, each naming its host dependency or stating none]
- [x] CHK-002 [P0] Sequenced approach (ready-now first, host-gated inert) and the attention-resolver batch defined in plan.md [evidence: `plan.md` sequences the five ready-now findings ahead of the eight host-gated ones]
- [x] CHK-003 [P1] Touched-surface token-identity + test:web baseline captured before any change [evidence: baseline recorded in `implementation-summary.md`: typecheck 1232 files 0 errors, 108+77 suite files, 760+749 tests]
- [x] CHK-004 [P1] Each host-gated field tracked in `../../007-host-requests/` [evidence: the eight host-gated fields are filed as REQ-019 through REQ-022 in `../../007-host-requests/spec.md`; HP-6 reuses REQ-002]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 114 files 782 passed, 83 files 772 passed]
- [x] CHK-012 [P1] The five ready-now LA modules are pure and reused by the home card without duplication [evidence: `card-session.svelte` imports and calls all four modules; bypassing the content fallback turns 2 red and the staleness or latch each turn 1 red]
- [x] CHK-013 [P1] Every host-gated affordance is fail-closed inert with its field absent [evidence: `card-session-live-activity.svelte.test.ts`, `transcript-list-gated-surfaces.svelte.test.ts` and `screen-home-project-grouping.svelte.test.ts` each assert an absent-field row rendering nothing`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P1] REQ-001 (LA-1): arbitration picks the correct session across tier and tie cases against a fixture [evidence: `live-activity-arbitration.test.ts` asserts needs-you beats working and a first-seen tie stays stable across calls]
- [x] CHK-021 [P1] REQ-002 (LA-2): a tick never re-elects; only a state edge changes the winner [evidence: `live-activity-arbitration.test.ts` asserts a tick leaves the winner unchanged; letting a tick re-elect turns 1 red]
- [x] CHK-022 [P1] REQ-003 (LA-3): same input yields the same clipped string on every surface; no blank line between turns [evidence: `live-activity-content.test.ts` asserts one clip constant across all three tiers and the same input yielding the same string]
- [x] CHK-023 [P1] REQ-004 (LA-4): inert with the push contract absent; edges immediate and ticks coalesced against a fixture [evidence: `push-edge-tick.test.ts` asserts an edge is immediate, ticks coalesce, and an edge is never coalesced away]
- [x] CHK-024 [P1] REQ-005 (LA-5): surface grays after the staleness window even if the end push is lost; re-arms on update [evidence: `live-activity-staleness.test.ts` pins the window with a literal and asserts the scheduled delay; an infinite window turns 3 red]
- [x] CHK-025 [P1] REQ-006 (LA-6): done treatment neutral with the flag absent; honest interrupted/stale against a fixture flag [evidence: `transcript-list-gated-surfaces.svelte.test.ts` asserts the done treatment needs the flag; a text fallback turns 2 red]
- [x] CHK-026 [P1] REQ-007 (LA-7): dismiss latches state; unchanged state stays hidden; a genuine move re-shows the row [evidence: `latched-dismiss.test.ts` asserts the row stays hidden across repeats of the same state and re-shows on a genuine move]
- [x] CHK-027 [P1] REQ-008 (CI-3): composer unchanged with fields absent; adopt-once and retire against a fixture [evidence: `adopt-launch-draft.test.ts` asserts adopt-once into an empty composer; adopting over a non-empty draft turns 1 red]
- [x] CHK-028 [P1] REQ-009 (MA-3): notice unchanged with kind absent; play then revoke against a fixture object URL [evidence: `unsupported-preview.svelte.test.ts` asserts the notice without a playable kind and the revoke on teardown; removing the revoke turns 1 red]
- [x] CHK-029 [P1] REQ-010 (SC-1): chip absent with no cacheExpiresAt; counts down and clears at expiry against a fixture [evidence: the chip is absent without `cacheExpiresAt` and its minute-boundary delay is asserted rather than slept]
- [x] CHK-030 [P1] REQ-011 (SC-3): elapsed renders now; count segments absent with no counts, never faked; live against a fixture [evidence: `card-session.svelte` renders the elapsed tick with no counts present, and each count segment is gated on its own field, covered by `card-session-live-activity.svelte.test.ts`]
- [x] CHK-031 [P1] REQ-012 (SP-3): tail absent with no stream; live feed and expand against a fixture stream [evidence: `transcript-list-gated-surfaces.svelte.test.ts` asserts the tail is absent without a stream and collapsed with one]
- [x] CHK-032 [P1] REQ-013 (HP-6): home ungrouped with no projectLabel; auto-collapse and explicit-toggle against a fixture label [evidence: `screen-home-project-grouping.svelte.test.ts` asserts an ungrouped roster without the field; fabricating a label turns 1 red]
- [x] CHK-033 [P0] token-identity 0-diff on the touched CSS; test:web green from the final state [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; both suites green from the final state]
- [x] CHK-034 [P1] a11y contract preserved on the touched surfaces [evidence: `card-session-live-activity.svelte.test.ts` asserts the live row status role and `transcript-list-gated-surfaces.svelte.test.ts` asserts the 44px disclosure target`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (LA-1/2/3/5/7 algorithmic pure modules; the eight host-gated as cross-consumer over a new read-only field) [evidence: LA-1, LA-2, LA-3, LA-5 and LA-7 are algorithmic pure modules; the eight host-gated findings are cross-consumer over fields that do not exist]
- [x] CHK-FIX-002 [P0] Same-class producer inventory: every surface reading the shared attention resolver audited (LA-1, phase-003 dock, Live Activity) [evidence: `resolveAttentionBadge` in `attention.ts` has exactly three consumers: `card-projection.ts`, `dock-recent-sessions.svelte` and `live-activity-arbitration.ts`]
- [x] CHK-FIX-003 [P0] Consumer inventory: every home-card and glanceable consumer of the LA content fallback audited (LA-3) [evidence: `card-session.svelte` is the single consumer of the content fallback; no second clip constant exists anywhere]
- [x] CHK-FIX-005 [P1] Fixture matrix listed for each host-gated finding (absent-field and present-field rows) before completion is claimed [evidence: `push-edge-tick.test.ts`, `adopt-launch-draft.test.ts`, `unsupported-preview.svelte.test.ts` and `screen-home-project-grouping.svelte.test.ts` each carry absent-field and present-field rows`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] The MA-3 object URL is scoped and revoked on teardown; no media bytes persist beyond the preview or enter a DTO [evidence: `media-player.svelte` revokes its object URL in `onDestroy` rather than an effect cleanup; removing the revoke turns 1 red]
- [x] CHK-041 [P0] No host-gated affordance fabricates a value when its field is absent [evidence: no gated affordance fabricates a value: `readProjectLabel` returns null without the host field, and returning a placeholder turns 1 red]
- [x] CHK-042 [P1] The LA local first-seen and latched-dismiss state stays client-only and never reaches the host [evidence: `live-activity-arbitration.test.ts` and `latched-dismiss.test.ts` operate on injected local state only; no host call exists on either path`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized; every host-gated finding cross-referenced to `../../007-host-requests/` [evidence: `spec.md`, `plan.md` and `tasks.md` cross-reference REQ-019 through REQ-022 in `../../007-host-requests/spec.md`]
- [x] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: a hygiene scan over every changed file in `app-mobile/src` and `app-mobile/tests` returned no spec paths or finding ids, and commit `c44587d` passed the pre-commit hygiene hook]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to `shared/{format,state,commands}/**`, `pages/{home,chat}/**`, `attention.ts`, and the service worker [evidence: the diff stays inside `app-mobile/src/shared/{format,state,commands}`, `app-mobile/src/pages/{home,chat}` and `app-mobile/tests`]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 10 | 0/10 |
| P1 Items | 24 | 0/24 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
