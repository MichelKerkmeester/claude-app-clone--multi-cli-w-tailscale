---
title: "Phase 5 plan - host inbox and notifications, ready-now first, fail-closed inert"
description: "Sequenced approach for the cross-session Inbox and push contract: ship CE-5 device-local read/archive now, build the fixture-backed render harnesses (timeline, notification-tap routing, reconnect watermark) that unlock the moment each relay field lands, and keep every blocked finding inert until then. Proven by fail-closed inertness checks, token-identity 0-diff, test:web, and a11y-parity from the final state."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host inbox/notification plan; CE-5 first, harnesses against fixtures."
    next_safe_action: "Await operator go, then build CE-5 and the fixture harnesses."
    blockers:
      - "12 of 13 findings inert until their relay inbox-event RPC or push contract lands."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 plan - host inbox and notifications

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Client-only device-local read/archive store and reconnect watermark; no host writes |
| **Testing** | Vitest (`test:web`) against fixtures; token-identity CSS resolver |

### Overview
Ship the one client-ready finding (CE-5 device-local read/archive) now, then build the cross-session Inbox timeline and the notification/push client render as fixture-backed harnesses that stay inert until their relay fields land. Each blocked finding names its exact host field and renders nothing without it.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ that names its host field/RPC and splits client-ready-now from blocked-on-host.
- [ ] The inbox token-identity and test:web baseline is captured before any change.
- [ ] Each host request is filed in `../../007-host-requests/`.

### Definition of Done
- [ ] CE-5 ships with a passing client-only test; it changes no host state.
- [ ] Every blocked finding is inert with its field absent and has a fixture-backed harness test.
- [ ] token-identity 0-diff on the inbox CSS, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The inbox is today a snapshot over `AttentionItemDto` via `attention.ts`. These findings sit around that seam, fail-closed on every net-new host field.

**CE-5** (ready now) adds a device-local read/archive store under `shared/state/` that layers over host `resolved`. Reading a card hides it from this device's badge; the store never asserts a host `resolved`, and only the host moves a card to archived. This is buildable and testable today.

**CE-1..CE-4, CE-6, CE-7** consume a net-new inbox-event RPC where every event carries `sessionId`. The client render (a timeline keyed by `sessionId`, supersede/refire transitions, retained set, cross-surface ack, inline Approve/Deny reusing the in-transcript Review tickets) is built against a fixture in `screen-attention-inbox.svelte`/`attention.ts`. Dedup, supersede, retention, and ack behaviours are host-owned; the client renders only what the RPC emits and never fabricates them. With the field absent the timeline renders nothing.

**HP-3** adds multi-select plus a bulk-action bar chrome, inert until a bulk read-ack RPC exists. Kept low priority.

**AN-1** persists an atomic `{seq, epoch}` watermark and quarantines a partial catch-up; a host restart voids a stale seq. **AN-2** consumes a presence-aware hold-then-flush queue and drops what resolved while held. **AN-3** exposes independent per-kind toggles and orders the kind-gate before the throttle slot client-side. **AN-4** routes a notification tap to a typed session target with a credential-recovery branch (unknown host refused, missing credential to re-pair), composing with the phase-003 NL-1 coordinator. **AN-5** handles a host-driven banner retraction with a show-then-dismiss race guard. All five are built against fixtures in `attention.ts`, `routes/+layout.svelte`, `routes/attention/[lookupId]/+page.svelte`, and the service worker, and stay inert until the push contract lands.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · ship the ready-now piece
Build CE-5 device-local read/archive over host `resolved`, with a client-only test proving the local hide and the no-false-resolved rule. Capture the inbox token-identity and test:web baseline first.

### Phase 2 · fixture-backed harnesses
Build the inbox timeline render (CE-1) and the dedup/supersede/retention/ack/inline-action presentations (CE-2..CE-4, CE-6, CE-7) against a fixture; build the AN-1 watermark plus quarantine, the AN-2 queue consumption, the AN-3 toggle UI plus kind-before-throttle order, the AN-4 typed routing plus recovery branch, and the AN-5 retraction guard. Each stays inert with its field absent.

### Phase 3 · verification
Run the fail-closed inertness checks (every blocked finding renders nothing without its field), the fixture harness tests, token-identity on the inbox CSS, test:web, and the a11y-parity check. Confirm every task traces to a finding and every host request is filed. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching and cross-phase dependencies from master plan §6.1/§6.5/§8:

- **Inbox capability batch** - CE-1..CE-4, CE-6, CE-7 share the one inbox-event RPC (sessionId per event); build their render harness together so they light up as a unit when the RPC lands.
- **Notification contract batch** - AN-1..AN-5 share the push contract; build the watermark, queue, toggle, routing, and retraction against fixtures together.
- **Nav coordinator (cross-phase)** - NL-1 (phase 003) is a prerequisite for AN-4 clean deep-linking; build NL-1 before AN-4 renders live.
- **Ready-now first** - CE-5 ships independent of every host field; do it first so the phase has shipped value before the fields arrive.

| Finding | Depends On | Blocks |
|---------|------------|--------|
| CE-5 | None | None |
| CE-1..CE-4, CE-6, CE-7 | Inbox-event RPC (sessionId) | None |
| HP-3 | Bulk read-ack RPC | None |
| AN-1 | Event stream + {seq,epoch} + getMissedSince RPC | None |
| AN-2 | Host push + presence | None |
| AN-3 | Server per-kind gate + throttle | None |
| AN-4 | Payload (hostId+sessionId+recovery), NL-1 | None |
| AN-5 | DismissNotificationEvent | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Ready-now (CE-5) | Med | CE-5 M |
| Fixture harnesses | High | Inbox render + AN contract client, several fixtures |
| Verification | Med | Inertness + fixture tests + gates |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | CE-5 local hide; AN-1 watermark quarantine; AN-3 kind-before-throttle order | Vitest |
| Fixture | Inbox timeline render, dedup/supersede/retention presentation, AN-4 routing branches | Vitest fixtures |
| Fail-closed | Every blocked finding renders nothing with its field absent | Vitest |
| Visual | token-identity 0-diff on inbox CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Inbox-event RPC (sessionId per event) | External (host) | Red | CE-1..CE-7 inert |
| Notification/push contract | External (host) | Red | AN-1..AN-5 inert |
| Bulk read-ack RPC | External (host) | Red | HP-3 inert |
| NL-1 navigation coordinator | Internal (phase 003) | Yellow | AN-4 deep-linking relies on it |
| `attention.ts` fetch/subscribe seam | Internal | Green | All client render hooks pivot on it |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A fail-closed leak (a blocked finding rendering fabricated data) or a token-identity diff on the inbox.
- **Procedure**: All changes are confined to `app-mobile/src/pages/inbox/**`, `app-mobile/src/shared/{format,state}/**`, `app-mobile/src/routes/**`, and the service worker. `git checkout -- app-mobile` restores the prior inbox. The CE-5 read/archive store and the AN-1 watermark are client-only local storage; clearing their keys removes them. No host contract is created by this phase, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
