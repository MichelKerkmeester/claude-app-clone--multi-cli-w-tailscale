---
title: "Phase 5 - Cross-session Inbox and notification/push contract"
description: "Plan the cross-session Inbox timeline (needs sessionId on every event) and the push/notification contract over the real app-mobile inbox, attention, and routing files, host-authoritative and fail-closed. Every finding but CE-5 is blocked on a relay-authored, client-read-only field or RPC; the client render is planned now and stays inert until the field lands. CE-5 (device-local read/archive) ships before the RPC."
trigger_phrases:
  - "host inbox notifications spec requirements"
  - "host inbox notifications phase"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped CE-5 real; twelve host-gated findings ship inert and filed."
    next_safe_action: "Build CE-5 device-local read/archive and the fixture render harnesses first."
    blockers:
      - "12 of 13 findings need a relay-authored, client-read-only inbox-event RPC (sessionId per event) or push contract."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 - Cross-session Inbox and notification/push contract

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (Wave 3, §6.1, §6.5) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json) · Host requests: [`../../007-host-requests/`](../../007-host-requests/)

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
| **Findings owned** | CE-1, CE-2, CE-3, CE-4, CE-5, CE-6, CE-7, HP-3, AN-1, AN-2, AN-3, AN-4, AN-5 (13) |
| **Constraint** | Host-authoritative, fail-closed; the client owns no editable session truth |
| **Client vs host** | Host-gated; CE-5 client-ready-now, the other 12 blocked on a relay field or RPC |
| **Phase chain** | after `004-a11y-onboarding` · before `006-host-usage-search-review` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Today's inbox is snapshot-only. `screen-attention-inbox.svelte` renders `AttentionItemDto { lookupId, attentionClass, occurredAt }` via `attention.ts fetchAttention`/`openAttentionHint`, with no `sessionId` and no history. There is no cross-session timeline of what needed the user or finished while they were away, no dedup or supersede discipline on repeated asks, no reconnect catch-up for missed notifications, and no fail-closed contract for a notification tap. Every one of these needs a host-published, client-read-only field the relay does not expose yet.

### Purpose
Plan the client render for a cross-session Inbox timeline and a fail-closed notification/push contract so each piece is buildable and unit-testable against a fixture now and renders the moment its relay field lands. One piece, CE-5 device-local read/archive, needs no host field and ships first. Nothing here makes the client own or assert host truth; an absent field renders nothing.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- CE-5 (client-ready-now): device-local read/archive state layered over host `resolved`, hiding a read card from this device's badge without asserting anything false.
- The client render harness for the cross-session Inbox timeline (CE-1..CE-4, CE-6, CE-7), planned against a fixture and inert until the inbox-event RPC lands.
- The multi-select plus bulk-action bar chrome (HP-3), gated on a bulk read-ack RPC.
- The notification/push contract client side (AN-1..AN-5): reconnect catch-up watermark, hold-then-flush queue consumption, per-kind toggle UI, typed notification-tap routing with a credential-recovery branch, and host-driven banner retraction.

### Out of Scope
- Any relay/host RPC or event-stream contract itself; those are tracked in `../../007-host-requests/`. This phase plans only the client consumption.
- The in-transcript Review tickets themselves (`pages/chat/features/ask-question/`, `pages/review/`), reused by CE-7 but not re-authored here.
- The navigation coordinator (NL-1) that AN-4 composes with; owned by phase 003.
- Any client-owned or client-edited session truth; the client never fabricates a resolved/unresolved state.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/pages/inbox/screen-attention-inbox.svelte` | Modify | CE-1..CE-7, HP-3: timeline render, dedup/supersede/retention presentation, inline Approve/Deny, multi-select bar |
| `app-mobile/src/shared/format/attention.ts` | Modify | CE-*, AN-*: inbox-event consumption, push subscribe/foreground, watermark, per-kind gates |
| `app-mobile/src/shared/state/` (new local read/archive store) | Create | CE-5: device-local read/archive layered over host `resolved` |
| `app-mobile/src/routes/+layout.svelte` | Modify | AN-1/AN-2: push lifecycle (~L205-217), reconnect catch-up |
| `app-mobile/src/routes/attention/[lookupId]/+page.svelte` | Modify | AN-4: typed notification-tap routing with the credential-recovery branch |
| service worker (app-mobile) | Modify | AN-2/AN-5: hold-then-flush queue, host-driven banner retraction |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers

None. No Wave-1 verified quick-win falls in this phase; every finding is P1 and host-gated. CE-5 is client-ready-now but is not a Wave-1 quick-win.

### P1 - Required (complete OR user-approved deferral)

Cross-session Inbox capability (the inbox-event RPC carries `sessionId` on every event):

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [CE-5] A device-local read/archive state layers over host `resolved`; reading a card hides it from this device's badge without changing any host state. | Host dependency: none (layers over the existing inbox; host `resolved` alone moves a card to archived). Client-ready-now: the whole store and its badge effect. Reading a card drops it from this device's badge, other devices are unaffected, and the store never asserts a host `resolved`; a unit test covers the local-only hide. |
| REQ-002 | [CE-1] A dedicated cross-session Inbox timeline renders events as history, not a snapshot. | Host dependency: an inbox-event RPC where every event carries `sessionId`. Client-ready-now: the timeline render and ordering against a fixture. Blocked-on-host: live data. With the field absent the timeline renders nothing; with a fixture it renders events newest-first keyed by `sessionId`. |
| REQ-003 | [CE-2] Title-based, time-bounded ask dedup: the same ask title within 10 minutes produces no new card. | Host dependency: dedup behaviour on the inbox-event RPC. Client-ready-now: rendering the deduped stream. Blocked-on-host: the dedup itself. The client renders whatever the RPC emits and never invents a dedup; a fixture with a duplicate within the window shows one card. |
| REQ-004 | [CE-3] A new ask supersedes the previous on the same node; the card re-fires on ask-content change. | Host dependency: a supersede plus content-change edge on the RPC. Client-ready-now: rendering supersede/refire transitions. Blocked-on-host: the edges. An answered question never keeps glowing with stale choices once the supersede edge arrives; a fixture proves the transition. |
| REQ-005 | [CE-4] Retention preserves the newest done plus the newest unresolved per node and expires the rest at 6 hours. | Host dependency: retention behaviour on the RPC. Client-ready-now: rendering the retained set. Blocked-on-host: the retention. The client shows only what the RPC retains and never resurrects an expired event from local cache. |
| REQ-006 | [CE-6] A cross-surface read receipt: opening any surface acks a finished session everywhere. | Host dependency: an `ackDone` re-broadcast edge. Client-ready-now: emitting the ack on open and clearing on the re-broadcast. Blocked-on-host: the re-broadcast. A lingering finished-unseen card clears on every surface after the user saw it on one; a fixture proves the clear. |
| REQ-007 | [CE-7] Inline Approve/Deny from the inbox card, with a re-check-still-blocked race guard. | Host dependency: the ticket payload at list level. Client-ready-now: the inline action UI and the re-check guard, reusing the in-transcript Review tickets. Blocked-on-host: the list-level payload. Acting on a stale ticket shows already-handled rather than a wrong action; a fixture proves the guard. |
| REQ-008 | [HP-3] Multi-select mode plus a bulk-action bar for the roster; the chrome is pure UI but only useful with a bulk read-ack. | Host dependency: a bulk read-ack RPC. Client-ready-now: the multi-select chrome and the bar. Blocked-on-host: the bulk ack. Keep low priority. With no bulk-ack RPC the bar is inert and never fakes a batch ack. |

Notification / push contract capability:

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-009 | [AN-1] Reconnect catch-up via a persisted atomic `{seq, epoch}` watermark; epoch is the counter lifetime, a host restart voids a stale seq, and a partial catch-up quarantines. Absorbs NL-6. | Host dependency: an event stream plus `{seq, epoch}` plus a `getMissedSince(seq, epoch)` catch-up RPC. Client-ready-now: the watermark persistence and quarantine logic against a fixture. Blocked-on-host: the RPC. A host restart with a stale seq does not silently drop every later event; a fixture proves the quarantine. |
| REQ-010 | [AN-2] A presence-aware hold-then-flush push queue drops what got resolved while held. | Host dependency: host push plus presence. Client-ready-now: the queue consumption and drop-on-resolve logic. Blocked-on-host: push plus presence. An alert suppressed while foregrounded surfaces on background unless it was answered first; a fixture proves the drop. |
| REQ-011 | [AN-3] Independent per-kind toggles (Needs you vs Task completed) plus a per-session throttle, kind-gated before the throttle slot is consumed. | Host dependency: a server-side per-kind gate plus throttle. Client-ready-now: the toggle UI and the client-side kind-before-throttle ordering. Blocked-on-host: the server gate. Toggling a kind off stops that kind before a throttle slot is spent; a test covers the ordering. |
| REQ-012 | [AN-4] A notification tap resolves to a typed session target with a credential-recovery branch: an unknown host is refused, a missing credential branches to re-pair/retry rather than a doomed blank chat. | Host dependency: a payload carrying `hostId` plus `sessionId` plus a credential-recovery hint. Client-ready-now: the typed routing and the recovery branch, composing with phase-003 NL-1. Blocked-on-host: the payload. An unknown host is refused, a missing credential routes to re-pair, never a blank chat; a fixture proves each branch. |
| REQ-013 | [AN-5] Host-driven retraction of an already-shown banner, with a show-then-dismiss race guard. | Host dependency: a `DismissNotificationEvent`. Client-ready-now: the retraction handler and the race guard. Blocked-on-host: the event. An answered-elsewhere banner is retracted without a show-after-dismiss flash; a fixture proves the guard. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: CE-5 ships as a client-only device-local store with a passing test, changing no host state.
- **SC-003**: Every blocked finding names its exact host field/RPC, splits client-ready-now from blocked-on-host, is cross-referenced to `../../007-host-requests/`, and renders nothing when the field is absent.
- **SC-004**: The fixture-backed render harnesses (timeline, notification-tap routing, watermark) each have a unit test that proves fail-closed inertness; token-identity 0-diff on the inbox CSS and test:web green from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Inbox-event RPC with `sessionId` per event | High: CE-1..CE-7 inert until it lands | Build the render harness against a fixture; track in `../../007-host-requests/` |
| Dependency | Notification/push contract (watermark, catch-up, per-kind gate, dismiss event) | High: AN-1..AN-5 inert until it lands | Build watermark, queue, routing against fixtures |
| Dependency | NL-1 navigation coordinator (phase 003) | Med: AN-4 clean deep-linking relies on it | Sequence NL-1 before AN-4 renders |
| Risk | Local read/archive drifting from host `resolved` (CE-5) | Med: a local hide must never assert a false resolved | Layer strictly over host `resolved`; the store hides locally only |
| Risk | Fabricating a dedup/retention client-side | Med: fail-closed forbids client-invented state | The client renders only what the RPC emits; never synthesize dedup/retention |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The inbox timeline renders incrementally and the watermark write is debounced; a reconnect catch-up never blocks the first paint.

### Security
- **NFR-S01**: The device-local read/archive store and the watermark are client-only and never reach the host; a notification payload is validated (`hostId` known) before any route.

### Reliability
- **NFR-R01**: Every field read is fail-closed; an absent inbox-event or push field renders nothing rather than a fabricated or stale card.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty inbox: the timeline renders an honest empty state, never a placeholder card.
- Missing `sessionId` on an event: the event is dropped fail-closed, never rendered without its session.

### Error Scenarios
- Host restart mid-stream: AN-1 voids the stale seq and quarantines rather than dropping later events.
- Unknown host in a notification payload: AN-4 refuses the route.

### State Transitions
- Ask answered elsewhere while a banner shows: AN-5 retracts without a show-after-dismiss flash.
- A card read on one device: CE-5 hides it locally while other devices keep their own badge.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 16/25 | 13 findings across inbox, attention, routing, service worker; several new fixtures |
| Risk | 13/25 | Fail-closed notification/inbox contract; no client-owned truth, but many host edges |
| Research | 12/20 | 12 of 13 depend on unshipped host fields; the contract shapes need relay agreement |
| **Total** | **41/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- In what order will the relay ship the inbox-event RPC (with `sessionId`) versus the notification/push contract? That order sets which findings unblock first.
- Should CE-5 device-local read state survive an app reinstall, or reset with local storage, given the fail-closed constraint on stale local state?
<!-- /ANCHOR:questions -->
