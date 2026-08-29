---
title: "Home list behaviour implementation summary — IMPLEMENTED"
description: "Wired the phase-1 home roster seams into the session list: recency-sort, pull-to-refresh keep-last-good, four-kind list states, resume slot, single-flight Open, haptics, and always-present status-grouped sections with a fail-closed unread/attention overlay. Status Implemented."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "list behavior implementation summary"
  - "list behavior packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T18:16:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Wired the seams into the home list; fixed review P0/P1; gates green."
    next_safe_action: "None — phase implemented; sibling list-organization can decorate this list"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Implemented |
| Requirements planned | REQ-001 … REQ-007 |
| Host dependency | Orca six ✅ drop-in · fold-in unread/needs-you axis = host `attention` (⚠️ requested in `007-host-requests`) |
| nodeterm fold-in | ND-1.1/1.2/1.3/1.4/1.8/1.9/1.10 · ND-2.3/2.4/2.5 — status-grouped list |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Wired the existing phase-1 seams into the home session list without re-authoring them. Recency-sort by
`updatedAt` (`sortByRecency`, 1.1) and the four-kind list view (`deriveListState`, 1.9) live as pure
functions in `pages/home/session-list-seams.ts`. Pull-to-refresh keeps the last-good snapshot and lets
`isStale` show Stale on failure (1.2). The resume slot fills from `cache` and stays inert until
`connection === 'live'` (1.10). Open is single-flight via local `launchingId` with an 8s timeout and
`stopPropagation` (1.11). Haptics fire selection / success / error / edge-bump and no-op when
`navigator.vibrate` is missing (1.12). All of these read existing `SessionCardDto` fields or are local
interaction; none writes `status`.

The nodeterm fold-in shipped as a derived status-grouped list: `buildStatusList` projects into fixed,
always-present, attention-first sections (`attention → unread → working → idle → unknown`), each with a
count derived by the same first-match classifier as the rows. A running-but-unread card stays under
Running. Within a section, newest finite `updatedAt` sorts first; an absent clock sinks last and is never
rendered as “just now”. Each card derives its live view from a per-id `$derived` keyed on that id. A
device-local recency/status toggle (`pi-remote.roster-grouping`) fails closed to recency on an unreadable
store. A device-local unread overlay (`pi-remote.session-unread`) never folds into `status`. Unread grouping
is gated on `hostAttentionPresent`, so the Unread section is present-but-empty until a host `attention`
field exists. Interrupted still fills Attention via existing `status`.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Order, list-state, and status grouping stayed PURE functions over the immutable `SessionListState`
snapshot (`sortByRecency`, `deriveListState`, `buildStatusList`, `sessionStatusGroup`, `dedupSessions`).
Home (`screen-home.svelte`) calls those seams from `$derived`; `card-session.svelte` selects one card by
id. Pull-to-refresh, the resume slot, and single-flight Open are local view state around the existing
list-load and `onSelect` routes — `routes/+page.svelte` `onRefresh` re-fetches without dispatching
`loading` and without touching `connection.phase`, so prior rows stay on screen and a failed HTTP
refresh cannot relabel the app-wide status pill. Card chrome composes `projectSessionCard`,
`decideStalePresentation`, and `reconnectVerdict` without writing `status`. The unread `$effect` untracks
overlay writes so a sync store update cannot self-invalidate. Verification ran the pure-seam
differential/boundary tests, the keep-last-good and single-flight interaction tests, `token-identity`
(0-diff for existing card CSS), `test:web`, and an a11y-parity check on the roster — all from the final
state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Extract order/state as a pure seam.** Home sort and list-state carry data, so they become pure functions
over the snapshot rather than inline render logic — the guardrail that keeps every later drop-in provably
faithful and lets "host-too-old ≠ empty" be boundary-tested in one place.

**Fail closed on the missing capability signal.** `host-too-old` needs a relay capability/version marker.
Planned decision: if no such signal exists, fold the unknown case into `error+retry` rather than mislabel
it "no sessions"; a dedicated capability field is an `007-host-requests` item, not a client invention.

**Presentation only — never write `status`.** Every affordance derives a view from existing fields; the
resume slot and single-flight disable are local interaction state that never mutates session truth.

**Status sections complement, not replace, time buckets.** The nodeterm status-grouped list (ND-1.1) is an
orthogonal grouping axis to orca 1.3's time buckets (sibling `002-list-organization`); a device-local toggle
(ND-1.10) selects flat recency (orca 1.1) or status grouping, fail-closed on parse.

**Unread stays a device-local overlay.** The unread bit is client-only and never folded into `status`
(ND-2.5); it is set only when the session's chat is not foreground+active (ND-2.4). The Unread section and
the needs-you part of Attention fail closed to empty until the host `attention` field lands — not
re-requested, already in `007-host-requests`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `sortByRecency` differential/boundary | Passed — matches a canonical sort; stable on empty/single/equal; absent clock sinks (`session-list-seams.test.ts`) |
| `deriveListState` boundary | Passed — failed/gated fetch stays unresolved (`error-retry`), never "no sessions"; `host-too-old` never fires without a capability signal |
| Pull-to-refresh keep-last-good | Passed — a rejected refresh keeps prior items + shows Stale (`screen-home.svelte.test.ts`); real `+page.svelte` `onRefresh` leaves `connection.phase` at `live` (`page-home-refresh.svelte.test.ts`) |
| Single-flight Open | Passed — one launch disables sibling Opens (`screen-home.svelte.test.ts`) |
| Token identity | Passed — 0 CHANGED / 0 VANISHED / 0 ADDED across light/dark/system for existing card CSS |
| `test:web` | Passed — svelte 70 files / 553 passed + 3 skipped; logic 27 files / 270 passed |
| `typecheck` | Passed — 0 errors (`svelte-check` COMPLETED 1132 FILES 0 ERRORS) |
| scoped lint | Passed — eslint on the files this phase changed exits 0; repo-wide `eslint .` still has pre-existing findings outside this phase |
| a11y-parity | Passed — roster `role="list"` / live region `role="status"` / sequential Open buttons preserved |
| `buildStatusList` precedence/count | Passed — first-match precedence holds; counts equal rows (anti-drift) |
| status-section sort | Passed — newest-`updatedAt`-first; absent clock sinks, never rendered as “just now” |
| unread overlay ⟂ status | Passed — unread bit never folded into `status`; recency/status toggle fails closed on unreadable store |
| `validate.sh --strict` | `validate.sh --strict` exit 0. Authored-doc rules pass. `graph-metadata.json` fingerprint/drift left for the orchestrator (those generated files were not edited) |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two host signals remain absent, so both stay fail-closed rather than invented. `host-too-old` never
fires because the relay publishes no capability/version marker; that case stays `error-retry` (Catalog
unavailable) instead of “no sessions”. The unread/needs-you grouping axis needs the host `attention`
field (⚠️ already requested in `007-host-requests`); until it lands the Unread section is present but
empty and status-only grouping ships over the existing DTO. Interrupted still fills Attention via
existing `status`. Sibling sub-phases `002-list-organization` and `003-card-polish` decorate this list;
`003`'s card-content bundle is the ⚠️ host-dependent work that this sub-phase does not carry.
<!-- /ANCHOR:limitations -->
