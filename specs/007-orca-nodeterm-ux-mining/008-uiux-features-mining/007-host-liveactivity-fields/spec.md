---
title: "Phase 7 - Live-Activity push contract and composer/card/media host DTO fields"
description: "Plan the Live-Activity glanceable surface plus the independent composer, card, and media host DTO fields over the real app-mobile files, host-authoritative and fail-closed. Ships the five ready-now Live-Activity pure modules (arbitration, no-tick-rerank, content fallback, stale watchdog, latched dismiss) as reusable logic for the home card and a future in-app running banner today; plans the seven host-gated findings inert behind their relay fields, each naming the exact field or RPC it needs."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped five ready-now findings wired into the card; eight ship inert."
    next_safe_action: "Await operator go, then build the five ready-now Live-Activity pure modules first."
    blockers:
      - "LA-4, LA-6, CI-3, MA-3, SC-1, SC-3 (counts), SP-3, HP-6 are host-gated; each needs a relay-authored, client-read-only field or RPC before its render unblocks."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 - Live-Activity push contract and composer/card/media host DTO fields

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (Wave 3, §6.6, §6.8, §6.9) · Host requests: [`../../007-host-requests/`](../../007-host-requests/) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-08-27 |
| **Findings owned** | LA-1, LA-2, LA-3, LA-4, LA-5, LA-6, LA-7, CI-3, MA-3, SC-1, SC-3, SP-3, HP-6 (13) |
| **Constraint** | Host-authoritative, fail-closed; the client owns no editable session truth |
| **Client vs host** | Host-gated phase. Ready-now: LA-1, LA-2, LA-3, LA-5, LA-7. Partial: SC-3 (elapsed only). Blocked: LA-4, LA-6, CI-3, MA-3, SC-1, SC-3 counts, SP-3, HP-6 |
| **Phase chain** | after `006-host-usage-search-review` · final phase |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The glanceable Live-Activity surface and a cluster of single-field card, composer, and media improvements all depend on host-published, client-read-only data the DTO does not carry yet. Without a typed edge-versus-tick push contract the OS throttles the island or leaves it stale; without an end-reason flag a Ctrl-C reads as a celebrated finish; without a subagent stream a long sub-task is a silent black box; and without fields like cacheExpiresAt, unsentInputDraft, a video/audio preview kind, or projectLabel, the matching card and composer affordances cannot render. Five Live-Activity findings are pure client logic that add value now on the home card even before any push delivery lands.

### Purpose
Ship the five ready-now Live-Activity findings as reusable pure modules that the home card and a future in-app running banner consume today, and plan the eight host-gated findings so each renders the moment its relay field lands and stays fail-closed inert until then. Every host-gated requirement names the exact field or RPC it needs and splits client-work-ready-now from blocked-on-host.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- LA-1, LA-2, LA-3, LA-5, LA-7 (ready-now): single-slot arbitration, no-tick-rerank, 3-tier content fallback, client stale watchdog, latched state-scoped dismiss, all as pure modules reusable by the home card and a future in-app running banner.
- LA-4 and LA-6 (host-gated): the typed edge-versus-tick push contract and the end-reason flag on the done edge.
- CI-3, MA-3, SC-1, SC-3, SP-3 (host-gated): composer launchDraft adopt, video/audio preview, prompt-cache countdown chip, live turn-stats counts, live subagent activity tail.
- HP-6 (host-gated): project-grouped home focus-mode over a projectLabel field.

### Out of Scope
- Every relay-side field or RPC contract itself; those are tracked in `../../007-host-requests/`. This phase plans only the client consumption.
- The elapsed-timer half of the turn-stats line, which is the client tick already owned by phase 002 (SP-2); SC-3 here adds only the token and tool-call counts.
- The keyed composer draft store itself, owned by phase 001 (CI-1); CI-3 adopts it.
- Any change to backend, scripts, sibling phase folders, or specs/context.
- Any client-owned or client-edited session truth.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/shared/format/` (new pure modules) | Create | LA-1/2/3/5/7 arbitration, content fallback, stale watchdog, latched dismiss; reusable by the home card now |
| `app-mobile/src/shared/state/` (new pure modules) | Create | LA local first-seen and latched-dismiss state; project-group collapse state (HP-6) |
| `app-mobile/src/shared/format/attention.ts` | Modify | LA-4 delivery and LA-6 end-reason via the push path; shared attention resolver reuse |
| `app-mobile/src` service worker | Modify | LA-4 edge-versus-tick delivery, LA-6 end-reason handling |
| `app-mobile/src/pages/home/card-session.svelte` | Modify | LA content reuse; SC-1 prompt-cache chip; SC-3 turn-stats line |
| `app-mobile/src/pages/chat/chrome/session-composer.svelte` | Modify | CI-3: adopt a host-parked launchDraft once into an empty composer |
| `app-mobile/src/shared/commands/` | Modify | CI-3 launchDraft read path |
| `app-mobile/src/pages/chat/transcript/transcript-list.svelte` | Modify | SP-3: live subagent/task activity tail, expandable while running |
| `app-mobile/src/pages/chat/artifacts/unsupported-preview.svelte` | Modify | MA-3: replace the dead notice with a video/audio preview |
| `app-mobile/src/pages/chat/artifacts/use-artifact-resource.svelte.ts` | Modify | MA-3: scoped, revocable object-URL delivery |
| `app-mobile/src/pages/home/session-list-seams.ts` | Modify | HP-6: project grouping over projectLabel |
| `app-mobile/src/pages/home/screen-home.svelte` | Modify | HP-6: auto-collapse every group but the active one |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

All 13 findings are P1. Ready-now findings build and unit-test against a fixture now; host-gated findings ship fail-closed inert until their relay field lands.

### P0 - Blockers (MUST complete)

None. This phase carries no Wave-1 verified quick-win; every finding is P1.

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [LA-1, ready-now] Single-slot attention-first arbitration (needsYou > unread-done > working > idle, ties on first-seen) over `attention` plus local first-seen decides which session claims the one glanceable slot. Host dependency: none for the logic; delivery is LA-4. | A pure arbitration module picks the correct session across the tier and tie cases against a fixture; the home card consumes it now. Client-ready-now: the whole module. |
| REQ-002 | [LA-2, ready-now] An activity tick never re-ranks the glanceable surface; only a state edge refreshes the same activity in place. Host dependency: none. | A tick on a non-winning session does not re-elect it; only a state edge changes the winner; a fixture test covers tick-versus-edge. Client-ready-now: the whole module. |
| REQ-003 | [LA-3, ready-now] One shared clip length and a 3-tier content fallback (You:prompt > activity > state) is reused across the home card, the transcript header, and the Live Activity, over `prompt` and `activity`. Host dependency: none. | The same input yields the same clipped string on every surface; no line is ever blank between turns; a fixture test covers each fallback tier. Client-ready-now: the whole module. |
| REQ-004 | [LA-4, host-gated] A typed edge-versus-tick push contract delivers edges immediately at APNs priority 10 and coalesces ticks at priority 5 at a 20 second or greater cadence; absorbs AN-7. Host dependency: the push contract. | With the contract absent no Live-Activity delivery fires and nothing breaks; when present, edges arrive immediately and ticks are coalesced. Client-ready-now: none; blocked-on-host: the push contract in `../../007-host-requests/`. |
| REQ-005 | [LA-5, ready-now] A client-side stale watchdog retracts or grays the Live Activity once `updatedAt` exceeds the staleness window, even if the end push is lost. Host dependency: none; rides `updatedAt`. | After the staleness window with no update the surface grays out; a fresh update re-arms it; a fixture test covers the lost-end case. Client-ready-now: the whole module. |
| REQ-006 | [LA-6, host-gated] The done state carries why it ended (interrupted versus stale); the surface never celebrates a Ctrl-C or a silently dead agent as a finish. The client gates the success treatment on an end-reason flag, not the text. Host dependency: an end-reason flag on the done edge. | With no end-reason flag the done treatment is neutral, never celebratory; when the flag says interrupted or stale the surface shows the honest state; a fixture test covers each end reason. Client-ready-now: the gating logic against a fixture flag; blocked-on-host: the flag itself. |
| REQ-007 | [LA-7, ready-now] A latched, state-scoped local dismiss hides the row at the state it was dismissed and reappears the instant the underlying state genuinely moves; reusable for any persistent status surface such as an in-app running banner. Host dependency: none. | Dismissing latches the current state; an unchanged state stays hidden; a genuine state move re-shows the row; a fixture test covers dismiss-then-move. Client-ready-now: the whole module. |
| REQ-008 | [CI-3, host-gated] A cross-surface launchDraft adopts a host-parked input line once into an empty composer and retires it on the first real turn; it shares the phase-001 CI-1 keyed draft store. Host dependency: read-only `unsentInputDraft` and `unsentInputDraftAt`. | With the fields absent the composer is unchanged; when present, an empty composer adopts the parked line once and never re-adopts after the first turn; a fixture test covers the adopt-once and retire cases. Client-ready-now: the adopt-once logic over the CI-1 store against a fixture; blocked-on-host: the two read-only fields. |
| REQ-009 | [MA-3, host-gated] A video or audio file preview replaces the dead "Preview unavailable" notice. Host dependency: a video/audio preview kind plus scoped, revocable object-URL delivery. | With no preview kind the notice is unchanged; when present, the clip plays from a scoped object URL that is revoked on teardown; a fixture test covers the play and revoke path. Client-ready-now: the player chrome against a fixture URL; blocked-on-host: the preview kind and delivery. |
| REQ-010 | [SC-1, host-gated] A live MM:SS prompt-cache countdown chip on the card advises resuming before the cache re-sends uncached; niche and Claude-specific. Host dependency: `cacheExpiresAt`. | With no `cacheExpiresAt` the chip is absent; when present, the chip counts down accurately and clears at expiry; a fixture test covers the countdown and expiry. Client-ready-now: the countdown chip against a fixture timestamp; blocked-on-host: `cacheExpiresAt`. |
| REQ-011 | [SC-3, partial] A live turn-stats line shows elapsed (the client tick already shipped as phase-002 SP-2) plus token and tool-call counts. Host dependency: token and tool-call counts on a working session. | The elapsed half renders now from the existing tick; with no counts the count segments are absent, never faked; when present, they render live; a fixture test covers present-and-absent counts. Client-ready-now: the elapsed segment and the layout; blocked-on-host: the token and tool-call counts. |
| REQ-012 | [SP-3, host-gated] A live-streaming subagent or task activity tail is expandable while running; the client has no subagent concept today. Host dependency: a host subagent-activity stream. | With no stream the tail is absent; when present, it renders the live feed and expands while running; a fixture test covers the streaming and expand cases. Client-ready-now: the tail chrome against a fixture stream; blocked-on-host: the subagent-activity stream. |
| REQ-013 | [HP-6, host-gated] A project-grouped home auto-collapses every group but the active one; explicit toggles win. Host dependency: a `projectLabel` field on the card DTO. | With no `projectLabel` the home is ungrouped and unchanged; when present, only the active group is expanded and an explicit toggle overrides; a fixture test covers the auto-collapse and explicit-toggle cases. Client-ready-now: the grouping and collapse logic against a fixture label; blocked-on-host: `projectLabel`. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: The five ready-now Live-Activity findings (LA-1, LA-2, LA-3, LA-5, LA-7) ship as pure modules with fixture tests, consumed by the home card now, independent of any push delivery.
- **SC-003**: Each host-gated requirement names its exact relay field or RPC, points at `../../007-host-requests/`, and is proven inert with the field absent.
- **SC-004**: token-identity resolves 0 diffs on the touched CSS, test:web is green, and the a11y contract is preserved from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Live-Activity push contract (LA-4) | High: no glanceable delivery until it lands | Ship the ready-now LA logic on the home card now; keep delivery inert until the contract lands |
| Risk | LA-6 celebrating a stop | High: a false "Done" on the most-trusted surface | Gate the success treatment on the end-reason flag, not the text; neutral when the flag is absent |
| Dependency | Read-only unsentInputDraft fields (CI-3) | Med: composer adopt inert until they land | Build the adopt-once logic over the CI-1 store against a fixture |
| Dependency | Subagent-activity stream (SP-3) | Med: no tail until the stream exists | Build the tail chrome against a fixture stream; the client has no subagent concept to fake |
| Risk | Arbitration and dock resolver drift (LA-1) | Med: two surfaces disagreeing about a session | Factor one shared attention resolver in `attention.ts` reused by the home card, the phase-003 dock, and the Live Activity |
| Dependency | projectLabel, cacheExpiresAt, video/audio kind | Med: HP-6, SC-1, MA-3 inert until each lands | Track each in `../../007-host-requests/`; ship the client render against a fixture |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The stale-watchdog and countdown timers wake on a boundary-aware schedule (LA-5 staleness window, SC-1 minute boundary), not a per-second redraw storm.

### Security
- **NFR-S01**: The MA-3 object URL is scoped and revoked on teardown; no media bytes are cached beyond the preview lifetime and none enter a DTO.

### Reliability
- **NFR-R01**: Every host-gated affordance is fail-closed: absent its field it renders nothing and never fabricates a value; a lost push is covered by the LA-5 client watchdog.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Missing field: an absent `projectLabel`, `cacheExpiresAt`, preview kind, or subagent stream renders nothing, never a placeholder that implies data.
- Empty content: LA-3 falls back down its tiers so no glanceable line is ever blank between turns.

### Error Scenarios
- Lost end push: LA-5 grays the surface once `updatedAt` exceeds the staleness window.
- Ambiguous done: LA-6 with no end-reason flag shows a neutral, never celebratory, done state.

### State Transitions
- Activity tick during a running turn: LA-2 refreshes in place and never re-elects a different session.
- First real turn after a parked draft: CI-3 retires the launchDraft and never re-adopts.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 18/25 | 13 findings across Live-Activity modules, service worker, card, composer, transcript, artifacts, home; many new files |
| Risk | 13/25 | Host-gated; low blast today (inert) but LA-6 and the push path are trust-critical; no schema owned by the client |
| Research | 10/20 | Eight host contracts to confirm with the relay team; client shapes grounded |
| **Total** | **41/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- In what order will the relay team ship the eight host fields (push contract, end-reason, unsentInputDraft, video/audio kind, cacheExpiresAt, turn-stat counts, subagent stream, projectLabel)? That order sets the unblock sequence for this phase.
- Should the five ready-now Live-Activity modules ship in their own PR ahead of any host field, so the home card and a future in-app running banner benefit immediately?
<!-- /ANCHOR:questions -->
