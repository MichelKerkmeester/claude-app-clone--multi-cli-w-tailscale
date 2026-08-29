---
title: "Home list behaviour checklist — barrier for the six ✅ list-behaviour recs"
description: "Barrier sign-off for recency-sort, pull-to-refresh keep-last-good, the four-kind list states, the resume slot, single-flight Open, haptics, and the status-grouped roster: fail-closed (no host field invented, status never written, host-too-old ≠ empty), pure-seam differential tests, token-identity 0-diff, test:web green, and a11y-parity."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "list behavior verification checklist"
  - "list behavior packet"
  - "verification checklist"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T18:16:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Fixed review P0/P1; barriers verified against the implemented home list."
    next_safe_action: "None — phase implemented; sibling list-organization can decorate this list"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Home list behaviour checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Because these are ✅
drop-in behaviours, the authoritative proofs are the pure-seam differential/boundary tests (order +
list-state), the keep-last-good and single-flight interaction tests, `token-identity` for any card CSS
touched, `test:web`, and an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
  Evidence: pre-edit snapshot `/tmp/home-list-behavior-token-baseline.json` (65 resolved / theme, unresolved 0);
  baseline `test:web` svelte 68 files / 545 + 3 skipped, logic 24 files / 245.
- [x] **CHK-PRE-02** [P0] The pure helpers `sortByRecency` / `deriveListState` have canonical reference
  implementations to differential-test against before wiring them into the roster.
  Evidence: `app-mobile/tests/session-list-seams.test.ts` (`sortByRecency` matches canonical newest-first;
  `deriveListState` keep-prior / error-retry / never host-too-old).
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] No rec reads a field absent from `SessionCardDto` (`id`, `status`, `updatedAt`,
  `messageCount`); every enrichment is client-local interaction or an existing-field read.
  Evidence: `session-list-seams.ts` reads only those DTO fields plus a device-local unread set;
  `hostAttentionPresent` inspects own-property presence and never invents `attention`.
- [x] **CHK-CQ-02** [P0] No code path writes `status` or any session field — stale/order/state are view
  output only.
  Evidence: `unread-overlay.ts` copies status maps and never assigns `status`;
  `unread-overlay.test.ts` “never writes status”.
- [x] **CHK-CQ-03** [P1] Order and list-state live in pure functions over the immutable snapshot (the
  cross-cutting guardrail), not inline in the `.svelte` render.
  Evidence: `sortByRecency` / `deriveListState` in `pages/home/session-list-seams.ts`; Home calls them
  from `$derived`.
- [x] **CHK-CQ-04** [P1] `buildStatusList` and its status-precedence/count derivation live as pure functions
  over the immutable snapshot (ND-1.1/2.3), not inline in the `.svelte` render.
  Evidence: `buildStatusList` + `sessionStatusGroup` in `session-list-seams.ts`;
  `session-list-seams.test.ts` always-present sections + count===rows.
- [x] **CHK-CQ-05** [P1] Each card derives its live status from a per-id `$derived` keyed on that id
  (ND-1.8), never a whole-roster reactive object, so one flip invalidates only that card.
  Evidence: `pages/home/card-session.svelte` `const session = $derived(selectSession(sessionId))`.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] `sortByRecency` is differential-tested vs. a canonical sort and boundary-tested
  on empty / single / equal-`updatedAt` inputs.
  Evidence: `session-list-seams.test.ts` `sortByRecency` describe (canonical, empty/single, equal+absent-clock).
- [x] **CHK-TEST-02** [P0] `deriveListState` boundary tests show a failed/capability-gated fetch stays
  visibly unresolved (host-too-old / error+retry), never "no sessions".
  Evidence: `session-list-seams.test.ts` `deriveListState` (keep-prior, error-retry, never host-too-old);
  `screen-home.svelte.test.ts` Catalog unavailable vs No sessions.
- [x] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for any card CSS
  touched, and `test:web` passes from the final state.
  Evidence: token-identity 0 CHANGED / 0 VANISHED / 0 ADDED (light/dark/system);
  `npm run test:web` svelte 70 files / 553 passed + 3 skipped, logic 27 files / 270 passed.
- [x] **CHK-TEST-04** [P0] First-match precedence is tested — a running-but-unread session stays under
  Running and is never double-classified (ND-1.3/2.3).
  Evidence: `session-list-seams.test.ts` first-match + `buildStatusList` running-but-unread;
  `screen-home.svelte.test.ts` keeps a running card under Running.
- [x] **CHK-TEST-05** [P0] Each section's count is derived by the same precedence function as its rows and
  asserted equal (anti-drift, ND-1.9); an absent `updatedAt` sinks last and is never rendered as "just now"
  (ND-1.4).
  Evidence: `session-list-seams.test.ts` count===rows + absent-clock sinks;
  `screen-home.svelte.test.ts` never renders an absent clock as “just now”.
- [x] **CHK-TEST-06** [P1] `token-identity` is 0-diff and `test:web` green for the sectioned roster and the
  recency/status toggle from the final state.
  Evidence: same `test:web` summaries; `roster-view-preference.test.ts` fail-closed toggle;
  `screen-home.svelte.test.ts` five always-present sections.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] A rejected pull-to-refresh keeps the last-good snapshot and flips freshness to
  Stale; a refetch never flashes the empty state.
  Evidence: `screen-home.svelte.test.ts` rejected refresh keeps row + Stale;
  `page-home-refresh.svelte.test.ts` drives real `routes/+page.svelte` `onRefresh` (mocked `fetchSessions` reject, not a fake throw) and asserts `connection.phase` stays `live`;
  `onRefresh` does not dispatch loading or connection error/offline.
- [x] **CHK-FIX-02** [P0] Single-flight Open disables every sibling Open while one launch is pending and
  clears on navigation/timeout so the roster cannot wedge; the disable never blocks the host route.
  Evidence: `screen-home.svelte.test.ts` sibling Opens disabled; `launchingId` + 8s timeout in
  `screen-home.svelte`.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed: no client-invented session truth, no `status` write, host-too-old
  distinguished from no-sessions; unknown/stale data stays visibly unresolved.
  Evidence: `deriveListState` never emits `host-too-old` without a capability signal; error-retry heading
  is “Catalog unavailable”; `decideStalePresentation` is view-only.
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**` + the cited `shared/**` helpers (and their tests) changes.
  Evidence: scoped edits to `pages/home/**`, `shared/format/roster-view-preference.ts`,
  `shared/state/unread-overlay.ts`, `shared/chrome/haptics.ts`, `routes/+page.svelte` refresh path,
  matching tests, and this packet’s docs. `specs/context/**` untouched.
- [x] **CHK-SEC-03** [P0] Fail-closed on the unread/needs-you axis: no client-invented attention; the Unread
  section and the needs-you part of Attention stay empty until the host `attention` field lands (⚠️ already
  requested in `007-host-requests`, not re-requested), and the unread bit is never folded into `status`
  (ND-2.5).
  Evidence: `hostAttentionPresent` gates `groupingUnread` in `screen-home.svelte`; Unread stays empty on
  today’s DTO (`screen-home.svelte.test.ts` fail-closed empty Unread/Attention;
  `session-list-seams.test.ts` current DTO has no attention field). Interrupted still fills Attention via
  existing `status`.
- [x] **CHK-SEC-04** [P0] The recency/status view toggle is device-local and fails closed on an
  unreadable/unparseable store (ND-1.10); the host never receives it.
  Evidence: `roster-view-preference.ts` `FAIL_CLOSED_ROSTER_GROUPING = 'recency'`;
  `roster-view-preference.test.ts`.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
  Evidence: `bash .opencode/skills/system-spec-kit/scripts/spec/validate.sh specs/006-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior --strict` exit 0. Direct `validateFolder` authored-doc rules pass (status consistency, evidence, anchors, hygiene). Remaining errors are `graph-metadata.json` fingerprint/drift; those generated files were left for the orchestrator.
- [x] **CHK-DOC-02** [P1] No spec path or artifact id was introduced into any code comment (comment hygiene).
  Evidence: grep of `app-mobile/src` + new tests for `T2.`, `ND-`, `001-list-behavior`, `specs/007` — no hits
  in code comments.
- [x] **CHK-DOC-03** [P1] Each folded nodeterm rec (ND-1.1/1.2/1.3/1.4/1.8/1.9/1.10 · ND-2.3/2.4/2.5) traces
  to a task row and a test (traceability).
  Evidence: `tasks.md` T1.4–T1.5, T2.7–T2.10, T3.5–T3.7 each cite file + test.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The haptics wrapper degrades to a silent no-op when `navigator.vibrate` is
  absent (Safari/PWA) and never throws.
  Evidence: `shared/chrome/haptics.ts` calls `navigator.vibrate` with a number or copied number[] (no-op when absent/denied);
  `haptics.test.ts` absent + throw cases; `npm run typecheck` 0 errors.
- [x] **CHK-ORG-02** [P2] The roster's a11y contract (live region, list semantics, focus order) is
  preserved — proven by the a11y-parity check.
  Evidence: `screen-home.svelte` `role="list"` roster and `role="status"` live region; Open buttons remain
  sequential focus targets (`screen-home.svelte.test.ts` sibling-Open disable).
- [x] **CHK-ORG-03** [P2] The always-present attention-first section headers with counts (ND-1.2) preserve
  the roster's list semantics / AT tree and focus order — proven by the a11y-parity check.
  Evidence: `screen-home.svelte.test.ts` five section headings with counts; cards stay `role="listitem"`
  under those headings.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Verified from the final state. The six list-behaviour recs (1.1, 1.2, 1.9, 1.10, 1.11, 1.12) plus the
status-grouped roster close with the pure-seam differential/boundary tests, the keep-last-good and
single-flight interaction tests, `token-identity` at 0-diff, `test:web` green (svelte 70 files / 553
passed + 3 skipped; logic 27 files / 270 passed), `typecheck` 0 errors, and a11y-parity preserved — with
no `status` write and no invented host field. A failed HTTP refresh does not flip `connection.phase`.
The Unread section is present-but-empty until a host `attention` field lands. Scoped eslint on the
changed files is 0; repo-wide `npm run lint` still reports pre-existing errors outside this phase.
<!-- /ANCHOR:summary -->
