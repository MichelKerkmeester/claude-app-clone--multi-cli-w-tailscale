---
title: "Phase 1 - Composer input and send-ambiguity"
description: "Plan the composer/input surface and the send-ambiguity findings over the real app-mobile composer and transport files, host-authoritative and fail-closed. Ships the Wave-1 quick-wins (never-disable-the-textarea, per-session draft+attachment cache, hold-before-restore, three-outcome send) plus the scope-safe deferred error and the rejection-budget latch; plans the host-gated unified slash/skills picker inert behind its catalog RPC."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored Level-2 plan for the composer/send phase (CI + RS findings); no code."
    next_safe_action: "Await operator go, then implement the four Wave-1 P0 composer/send quick-wins first."
    blockers:
      - "CI-5 unified slash/skills picker needs a host skills-catalog RPC; plan the UI now, implement when it lands."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 - Composer input and send-ambiguity

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (Wave 1, §5.2, §5.5, §6.8) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P0 |
| **Status** | Planned |
| **Created** | 2026-08-27 |
| **Findings owned** | CI-1, CI-2, CI-4, CI-5, RS-1, RS-2, RS-3 (7) |
| **Constraint** | Host-authoritative, fail-closed - the client owns no editable session truth |
| **Client vs host** | 6 client-ready-now; CI-5 host-gated (skills-catalog RPC) |
| **Phase chain** | first phase · before `002-streaming-reader-media` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The composer is the client's one write surface, and the send path is where a flaky mobile connection does the most damage. Four verified bugs live here: the textarea is disabled on a transient reconnect lock so the iOS keyboard is dismissed mid-typing; a half-typed draft plus a staged photo are lost on A to Home to B to A navigation; a thrown send POST is treated as a definite rejection so a landed message can be duplicated; and an ambiguous send has no distinct copy from an outright reject. Two more findings harden the surface: a deferred send-error can paint the wrong session, and one auth blip can wrongly flip the banner to revoked.

### Purpose
Make the composer keep the keyboard through transient locks, preserve per-session drafts across navigation, and model send delivery as accepted, rejected, or unknown so a lost ack never invites a duplicate send. The unified slash plus reusable-skills picker is planned now and stays inert until the host publishes a skills catalog.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- CI-4: narrow the `<textarea>` disabled predicate so transient locks gate only Send, never editability.
- CI-1: a per-session (sessionId-keyed) composer draft plus attachment cache that survives leaving and returning.
- CI-2 and RS-1: three-outcome send (accepted, rejected, unknown) with hold-before-restore and outcome-specific copy.
- RS-2: scope-safe deferred send-error banner with a toast fallback.
- RS-3: rejection-budget latch (three consecutive E2EE-auth rejections before flipping to revoked/re-pair).
- CI-5 (host-gated, plan only): unified slash plus reusable-skills picker with a collision/duplicate-source badge, over a host skills-catalog RPC.
- Ancillary composer layout: any composer full-bleed/width work belongs in this phase (no mined finding owns it; note it here so it does not scatter across phases).

### Out of Scope
- The host skills-catalog RPC contract itself (tracked in `../../007-host-requests/`); CI-5 ships inert until it lands.
- Dictation, slash-trigger, prompt-history recall, and paste-image (owned by the sibling `007-orca-nodeterm-ux-mining/004-composer` packet, already shipped).
- Streaming/reader presentation (phase 002), navigation coordination (phase 003).
- Any client-owned or client-edited session truth.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/pages/chat/chrome/session-composer.svelte` | Modify | CI-4: narrow the `disabled` binding (~L770) so transient locks leave the field editable |
| `app-mobile/src/shared/state/streaming-derivations.ts` | Modify | CI-4: `inputLockReasonWithSettle` carries the send gate instead of the textarea |
| `app-mobile/src/pages/chat/screen-chat.svelte` | Modify | CI-1 draft state (~L156), CI-2 `sendPrompt` (~L434-475), RS-1 outcome consumption, RS-2 `promptError` (~L468-474) |
| `app-mobile/src/pages/chat/attachments/attachment-draft-provider.svelte` | Modify | CI-1: stop wiping attachments on `sessionId` change; feed the keyed cache |
| `app-mobile/src/pages/chat/attachments/attachment-state.ts` | Modify | CI-1: attachment draft persistence hook |
| `app-mobile/src/shared/state/` (new keyed draft store) | Create | CI-1: sessionId-keyed draft+attachment cache; RS-2: held send-error store |
| `app-mobile/src/shared/transport/relay.ts` | Modify | RS-1: `submitPrompt` (~L566-591) tags accepted/rejected/unknown, reusing the `delivery-unknown` pattern (~L815/831) |
| `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` | Modify | RS-3: count consecutive auth rejections |
| `app-mobile/src/shared/transport/auth.ts` | Modify | RS-3: only a full auth clears the latch |
| `app-mobile/src/shared/state/app-state.svelte.ts` | Modify | RS-3: reconnect banner state via `state.ts` `connectionReducer` |
| `app-mobile/src/shared/commands/` (CI-5 picker, host-gated) | Create | CI-5: unified slash/skills picker over a host catalog RPC (analog of `host-command-catalog.svelte.ts`) |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (Wave-1 verified quick-wins)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [CI-4] The `<textarea>` stays editable through every transient lock (`connection !== 'live'`, `awaitingSnapshot`, sending); only the Send action is gated by the existing `canSubmit`/`inputLock` derivation. | A simulated reconnect blip mid-typing does not disable the field or dismiss the keyboard; a test asserts Send remains gated while the field stays editable. |
| REQ-002 | [CI-1] A sessionId-keyed draft and attachment cache survives A to Home to B to A navigation; leaving a chat parks the raw draft and staged attachments, returning restores them. | Type a draft and stage a photo in session A, navigate away and back, and both are restored exactly; storage failure degrades to an empty draft, never an error. |
| REQ-003 | [CI-2] On send, a thrown POST is held, not treated as definite rejection: watch the transcript for the echoed turn (epoch/optimistic reconcile) with a 20 second deadline before restoring the draft. | A send whose ack is lost but whose turn lands does not restore the draft or invite a resend; a send that truly fails restores the exact raw draft after the deadline. |
| REQ-004 | [RS-1] Send delivery is modeled as `accepted \| rejected \| unknown`; ambiguity is tagged on the Error itself so it survives re-throw, and each outcome has its own copy. | `submitPrompt` returns/throws a tagged outcome; the unknown outcome renders distinct copy from rejected; a test covers all three outcomes. |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-005 | [RS-2] A deferred send-error is stamped with its `scopeKey` (sessionId), checked against live scope before painting, and falls back to a toast when the banner has unmounted (the banner is primary because the keyboard covers the toast strip). | A send failure resolving after the user left that chat never paints the wrong session; when the banner region is gone the error surfaces as a toast; a test covers the scope-mismatch and unmounted-banner cases. |
| REQ-006 | [RS-3] A rejection-budget latch requires three consecutive E2EE-auth rejections before the reconnect banner flips to revoked/re-pair; only a full successful auth clears it (hysteresis). | One or two auth blips do not show revoked; the third consecutive rejection flips the banner; a subsequent full auth clears the latch; a test covers the 1/2/3-blip and recovery cases. |
| REQ-007 | [CI-5, host-gated] A unified slash plus reusable-skills picker inserts a canned prompt as an editable draft and shows a collision/duplicate-source badge; it reads a host skills-catalog RPC and is inert when the field is absent. | With no catalog field the picker shows nothing and never invents rows; when the field is present, entries insert as an editable draft (never auto-send) and duplicate-source entries carry the badge. Host dependency: a skills/reusable-prompt catalog RPC (analog of `host-command-catalog.svelte.ts`). Client-ready-now: the picker chrome and the badge logic against a fixture; blocked-on-host: the live catalog fetch. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: The four Wave-1 P0 findings (CI-4, CI-1, CI-2, RS-1) ship as pure interaction or local-state over existing DTO fields, each with a regression test, and none makes the client own session truth.
- **SC-003**: CI-5 ships inert behind the absent skills-catalog RPC and points at `../../007-host-requests/`; RS-2 and RS-3 each carry a scoped regression test.
- **SC-004**: token-identity resolves 0 diffs on the composer CSS, test:web is green, and the a11y contract (live regions, focus return) is preserved from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | CI-4 send gate leak | High: dropping locks from `disabled` could let a send fire mid-lock | The send gate (`canSubmit`, `inputLock`) must carry the whole lock; prove by a send-gating test |
| Risk | CI-2 false-positive echo match | Med: matching the wrong turn as the echo could suppress a real failure | Reconcile on epoch/optimistic id, not text; bound with the 20 second deadline |
| Risk | RS-2 scope leak | Med: a deferred error painting the wrong session erodes trust | Stamp scopeKey and check live scope before painting |
| Dependency | Host skills-catalog RPC (CI-5) | CI-5 body inert until it lands | Plan the picker shape now; track the request in `../../007-host-requests/` |
| Risk | RS-3 latch tuning | Low: too-eager or too-slow latch mislabels the pairing | Three-strike threshold cleared only by full auth; unit-test the blip sequence |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The keyed draft cache read/write on navigation adds no perceptible input latency; writes are debounced and never block the send path.

### Security
- **NFR-S01**: The draft cache is client-only (localStorage/session-scoped) and never reaches the host; no draft text or attachment bytes enter a DTO.

### Reliability
- **NFR-R01**: Every storage read is try/catch guarded so a cleared or unavailable store degrades to an empty draft, never an error.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty draft: parking an empty composer stores nothing and never shows a restore.
- Maximum length: a very long draft is capped to the store budget and never silently truncated on restore.

### Error Scenarios
- Lost ack on cellular: the unknown outcome holds rather than restoring, so no duplicate send.
- Banner unmounted before error resolves: RS-2 falls back to a toast.

### State Transitions
- Session switch mid-send: the held outcome is stamped with the originating scopeKey and never paints the new session.
- Auth blip during reconnect: RS-3 holds the banner at reconnecting until the three-strike threshold.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 14/25 | 7 findings across composer, transport, and 2 new stores; ~10 files |
| Risk | 12/25 | Touches the live send path and auth latch; no schema/breaking change |
| Research | 6/20 | Paths grounded; CI-5 needs a host contract decision |
| **Total** | **32/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Does the relay already expose a reusable-skills/prompt catalog, or must CI-5 wait on a new `../../007-host-requests/` line item?
- Should the CI-1 draft cache persist across an app restart (localStorage) or only within a session (in-memory), given the fail-closed constraint on stale content?
<!-- /ANCHOR:questions -->
