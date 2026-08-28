---
title: "Verification Checklist: Phase 3 home/switcher/nav/search"
description: "Verification Date: TBD. Level-2 QA items mapping to the HP/SC/SD/NL/SH acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the home/switcher/nav/search Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 3 home/switcher/nav/search

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

- [x] CHK-001 [P0] All 19 findings documented as REQs in spec.md with acceptance criteria [evidence: 19 REQs with acceptance criteria in `spec.md` P0/P1 requirement tables]
- [x] CHK-002 [P0] Sequenced approach and search/dock/nav batches defined in plan.md [evidence: `plan.md` sequences the badge, search, dock and navigation batches with a dependency table]
- [x] CHK-003 [P1] Home token-identity + test:web baseline captured before any change [evidence: baseline captured in `implementation-summary.md` before the lanes ran: 88+52 suite files, 670+616 tests]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file; the `use-sync-socket.svelte.ts:12` parse error was proven pre-existing by linting pristine `HEAD` content at the same path]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 92 files 692 passed, 60 files 674 passed]
- [x] CHK-012 [P1] Search, sort, and resolver logic is pure and unit-tested [evidence: `scroll-metrics.test.ts`, `recency-stack.test.ts` and `card-projection.test.ts` cover the pure seams in `session-list-seams.ts` and `attention.ts`]
- [x] CHK-013 [P1] Changes follow the existing roster seams and preference-store patterns [evidence: `roster-view-preference.test.ts` covers density beside grouping in the same read/write shape; sanitisation follows `reconcile-seams.ts`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P0] REQ-001 (HP-4): badge equals attention count, clears at zero, no-op where the API is absent [evidence: `app-badge.test.ts` covers set, clear-at-zero, absent-API no-op and invalid counts; counting a running session turns `card-projection.test.ts` red]
- [x] CHK-021 [P1] REQ-002 (HP-1): Smart sort ranks a just-finished session above a still-working one [evidence: `home-roster-features.test.ts` asserts the four-class order; demoting needs-you in `session-list-seams.ts` turns 2 red]
- [x] CHK-022 [P1] REQ-003 (HP-5): no matching card hidden inside a collapsed section; no-op without collapsible sections [evidence: `home-roster-features.test.ts` covers `forceExpandSections`, including the no-collapsible-section no-op]
- [x] CHK-023 [P1] REQ-004 (SC-2): density toggles per device; hidden chips do not render; no host field [evidence: `screen-home.svelte.test.ts` mounts two cards and asserts the second changes with the first; neutering the setter in `screen-home.svelte` turns 1 red]
- [x] CHK-024 [P1] REQ-005 (SC-4): known tool renders a glyph, unknown falls back to text [evidence: `card-session-tool-glyph.svelte.test.ts` asserts a known tool renders a glyph and an unknown one falls back to text]
- [x] CHK-025 [P1] REQ-006 (SD-1): dock lists visited sessions newest-first and navigates [evidence: `dock-recent-sessions.svelte.test.ts` asserts MRU order and navigation through `getAppActions().navigate`]
- [x] CHK-026 [P1] REQ-007 (SD-2): home card and dock chip render the same badge in every state [evidence: `dock-recent-sessions.svelte.test.ts` renders a done-and-unread session on both surfaces; dropping the unread rung in `attention.ts` turns 2 red]
- [x] CHK-027 [P1] REQ-008 (SD-3): status dot reads cleanly in both themes, no dark-mode halo [evidence: `dock-tokens.test.ts` asserts `color-mix` rings against their own surface in all three theme blocks; collapsing one to the bare status colour turns 1 red]
- [x] CHK-028 [P1] REQ-009 (SD-4): fade only on overflow; new chip auto-reveals only when at the end [evidence: `scroll-metrics.test.ts` covers fit-no-fade and end-only reveal; forcing overflow true and dropping the at-end condition each turn 1 red]
- [x] CHK-029 [P1] REQ-010 (SD-5): no-op remove disabled; pinned removal routes through one confirm [evidence: `dock-recent-sessions.svelte.test.ts` asserts remove-others disabled when every local peer is host-dropped and one confirm funnel for a pinned chip]
- [x] CHK-030 [P1] REQ-011 (SD-6): a host-dropped id never appears in the dock [evidence: `dock-recent-sessions.svelte.test.ts` enumerates the whole rendered strip; disabling both guards in `dock-recent-sessions.svelte` turns it red]
- [x] CHK-031 [P1] REQ-012 (NL-1): deep-link tap racing a manual tap never double-pushes or blanks [evidence: `session-stack-navigation.test.ts` covers retarget, cancel-and-restart and the late-resolve drop]
- [x] CHK-032 [P1] REQ-013 (NL-2): back pops from a card-entry, replaces from a deep-link entry [evidence: `session-stack-navigation.test.ts` covers pop-from-home and replace-from-deep-link]
- [x] CHK-033 [P1] REQ-014 (NL-4): hidden-tab polling stops; refocus fires one immediate read [evidence: `foreground-polling.test.ts` asserts no read while hidden and one read on refocus; forcing a poll while hidden turns 3 red]
- [x] CHK-034 [P1] REQ-015 (NL-5): reconnect refetches rather than showing the stale snapshot [evidence: `foreground-polling.test.ts` asserts pull and reconnect bypass the cache; the unused edge helper was deleted from `foreground-polling.ts` rather than left falsely covered]
- [x] CHK-035 [P1] REQ-016 (SH-2): preview matches surface, labelled "matched in preview" [evidence: `screen-home-search-sort.svelte.test.ts` asserts a preview hit carries the matched-in-preview label]
- [x] CHK-036 [P1] REQ-017 (SH-3): free terms match now; repo:/path: inert with host fields absent [evidence: `home-roster-features.test.ts` asserts `repo:` and `path:` parse and stay inert while the host fields are absent]
- [x] CHK-037 [P1] REQ-018 (SH-4): every hit corresponds to visible, highlightable preview text [evidence: `home-roster-features.test.ts` restricts matching to `previewMessages`, the text `card-session.svelte` renders]
- [x] CHK-038 [P1] REQ-019 (SH-5): "clde" ranks "claude" first [evidence: `home-roster-features.test.ts` asserts `clde` ranks `claude` above a weaker subsequence]
- [x] CHK-039 [P0] token-identity accounts for the SD-3 tokens with no unexpected diffs; test:web green from the final state [evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` reports PASS on all 35 goldens; both suites green: 92 files 692 passed, 60 files 674 passed]
- [x] CHK-040 [P1] a11y contract (roster roles, dock focus order, dismissal) preserved [evidence: `dock-recent-sessions.svelte.test.ts` asserts the group role and menu semantics; `app.svelte.test.ts` asserts the dock region name in the chat screen]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (HP-4 instance; SD-1/SD-2/SD-6 cross-consumer over the shared resolver; NL-1 algorithmic on the nav slot) [evidence: the badge is an instance fix in `card-projection.ts`, the dock findings are cross-consumer over `attention.ts`, and the nav slot is algorithmic in `session-stack-navigation.ts`]
- [x] CHK-FIX-002 [P0] Same-class producer inventory: every roster sort/filter path audited for the search batch [evidence: every roster sort and filter path in `session-list-seams.ts` was audited; `home-roster-features.test.ts` covers all four search behaviours]
- [x] CHK-FIX-003 [P0] Consumer inventory: every consumer of the shared attention-badge resolver audited (SD-2) [evidence: both consumers of `resolveAttentionBadge` audited; the private resolver in `dock-recent-sessions.svelte` was deleted]
- [x] CHK-FIX-006 [P1] Deep-link race and hidden-tab negative controls reproduced before NL-1 and NL-4 fixes [evidence: the hidden-tab symptom was reproduced by forcing a poll in `foreground-polling.ts` (3 red) and the dead-wiring symptom by early-returning in `+layout.svelte`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-050 [P0] The dock never asserts session ownership; "close" removes only a local chip [evidence: `recency-stack.test.ts` shows removal only rewrites the device-local stack; no host mutation exists on that path in `dock-recent-sessions.svelte`]
- [x] CHK-051 [P0] Preferences, recency stack, and unread count are client-only and never reach the host [evidence: `recency-stack.test.ts`, `favorite-preference-format.test.ts` and `roster-view-preference.test.ts` all assert local-storage-only persistence]
- [x] CHK-052 [P1] SD-6 fail-closes any id absent from the host's current session set before render [evidence: `dock-recent-sessions.svelte.test.ts` asserts a host-dropped id never renders; breaking both guards in `dock-recent-sessions.svelte` turns it red]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-060 [P1] spec/plan/tasks synchronized; SH-3 repo:/path: dependency cross-referenced to phase 006 [evidence: `spec.md`, `plan.md` and `tasks.md` all carry Status Complete and cross-reference the repo:/path: dependency to phase 006]
- [x] CHK-061 [P1] Code comments carry durable WHY only (no spec/finding ids in code) [evidence: a hygiene scan over all 43 changed files in `app-mobile/src` and `app-mobile/tests` returned no matches for spec paths or finding ids, and commit `054de60` passed the pre-commit hygiene hook]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-070 [P1] Changes confined to `pages/home/**`, `routes/**`, the new dock component, `shared/{format,state}/**`, and `app.css` [evidence: the 43-file diff stays inside `app-mobile/src/pages`, `app-mobile/src/routes`, `app-mobile/src/shared`, `app-mobile/src/app.css` and `app-mobile/tests`]
- [x] CHK-071 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff for commit `054de60`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 28 | 0/28 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
