---
title: "Phase 6 — Navigation: fail-closed session→chat correctness"
description: "Carry the opaque session id raw into the router, encode it once at the router boundary, then re-validate id + epoch at the chat page before loading the transcript or issuing any command. Model selection precedence (selected / host-active / navigation-requested) as separate presentation states; keep the list jump-to-latest FAB distinct from the per-turn scroll arrow; record load-earlier as not-portable-now; and add a per-session device-local view-mode preference that fails closed when its store is unreadable. Plan only — nothing implements until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned fail-closed nav (6.1-6.5); tasks open; no code touched yet."
    next_safe_action: "On operator go, implement 6.1 entry re-validation first, then 6.2/6.3/6.5."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 — Navigation

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Research: [`../research/research.md`](../research/research.md) (Angle 6) · Prev: `005-streaming-ask` · Next: `007-host-requests`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Recs covered | 6.1, 6.2, 6.3, 6.4, 6.5 |
| Writer | Claude (plan only; implementation deferred until the operator says go) |
| Barrier | fail-closed entry re-validation + selection-precedence separation + FAB/arrow split + view-mode store fails closed + token-identity 0-diff + test:web green + a11y-parity + traceability |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

A URL param or a tapped session card is navigation *intent*, not proof that the session still exists at the
epoch we think it does. Today `routes/session/[id]/+page.svelte` reads `$page.params.id`, looks up the
session's `status` from the roster (`app.sessions.items.find(...)?.status ?? 'unknown'`), and renders the
full live chat regardless — a stale or dead id resolves to `status: 'unknown'` yet still opens the socket.
The router already does the right thing on the way in (`navigate()` in `routes/+layout.svelte` encodes the
id exactly once with `encodeURIComponent`, and the id reaches `+page.svelte` decoded/raw), but the chat page
never re-validates before loading the transcript or issuing a command.

This phase implements the verified Angle-6 recommendations that make session→chat navigation fail-closed and
correct: re-validate `id` + `epoch` at chat entry (6.1); separate the selection-precedence states so an
ordinary snapshot refresh cannot move the user off their session and only a host follow may supersede (6.2);
keep the list jump-to-latest FAB distinct from the per-turn scroll arrow (6.3); record load-earlier as
not-portable-now because the host already sends the full redacted snapshot (6.4); and add a per-session
device-local view-mode preference that fails closed if its store is unreadable (6.5). Every affordance reads
existing DTO fields (`id`, `status`, `epoch`) or is pure interaction / local preference — no client-owned
session truth.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **6.1 — Entry re-validation.** Keep the id raw through the router (already encoded once at the
  `routes/+layout.svelte` boundary); at `routes/session/[id]/+page.svelte` fail closed when the raw id is
  absent from the authoritative roster, and gate transcript load / command issuance on epoch confirmation
  via the existing `TranscriptState.epoch` guard and `transcript.awaitingSnapshot` barrier in
  `pages/chat/screen-chat.svelte`.
- **6.2 — Selection precedence.** Model "selected" (router URL, presentation), "host-active", and
  "navigation-requested" as separate states in `routes/+layout.svelte`; keep the selected session through
  ordinary roster refreshes; let only a host-issued follow supersede; restrict retries to idempotent
  activation (never `submitPrompt` / `abortPrompt`).
- **6.3 — FAB vs per-turn arrow.** Keep the list jump-to-latest FAB in
  `pages/chat/transcript/transcript-list.svelte` scrolled-up-gated and "latest"-only, and assert the
  per-turn scroll-to-top arrow (built under `../003-chat-message` rec 3.1) stays a distinct control.
- **6.4 — Load-earlier decision.** Confirm the host sends the full redacted snapshot; record load-earlier
  pagination as not built now.
- **6.5 — Per-session view-mode.** A device-local per-session view-mode preference store that fails closed
  on an unreadable store, mirroring the theme try/catch precedent.

**Out of scope:**
- The per-turn scroll-to-top arrow's own *implementation* (owned by `../003-chat-message`, rec 3.1); this
  phase only guarantees the split.
- Any host-published field: the true host "follow" intent (6.2 ⚠️) and the transcript `hasMore` page token
  (6.4 ⚠️) are requested in `../007-host-requests`, not invented here.
- orca's chat-vs-terminal view split (❌ — we have no PTY); synthesizing earlier messages from a stale
  client cache across epochs (❌); any client edit of session metadata.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** *(6.1)* — The opaque session id is carried raw into the router and encoded exactly once at
  the `routes/+layout.svelte` boundary. At `routes/session/[id]/+page.svelte` the chat page re-validates the
  id against the authoritative roster and fails closed (a visibly-unresolved "session unavailable" state, no
  socket, no command) when the id is absent.
- **REQ-002** *(6.1)* — No transcript is loaded and no command (`submitPrompt` / `submitSlashDraft` /
  `abortPrompt`) is issued until the authoritative epoch is confirmed: the existing reducer epoch guard
  (`state.ts` — epoch mismatch → awaiting-snapshot error) and the `transcript.awaitingSnapshot` barrier gate
  command issuance, reusing the existing exact-session command scope.
- **REQ-003** *(6.2)* — "selected", "host-active", and "navigation-requested" are distinct states. Local
  selection controls presentation only and survives ordinary snapshot refreshes; only a host-issued follow
  supersedes it; retries are limited to idempotent activation and never re-send a message or Stop. The true
  host follow needs a host `navigationIntent` field (⚠️); without it, only user-initiated navigation
  supersedes.
- **REQ-004** *(6.3)* — The list jump-to-latest FAB appears only when scrolled away from the live edge and
  means "latest" only; the per-turn scroll-to-top arrow is a distinct affordance and is never conflated with
  the FAB.
- **REQ-005** *(6.4)* — Load-earlier pagination is not built: the host already sends the full redacted
  snapshot. Real paging needs a host `hasMore` token (⚠️, deferred to `../007-host-requests`); inventing
  earlier messages from a stale cache across epochs is prohibited (❌).
- **REQ-006** *(6.5)* — A per-session device-local view-mode preference reads and writes through a store
  that fails closed: an unreadable store falls back to the canonical default and is treated as unresolved,
  never as "no overrides."
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The session id reaches the chat page raw, encoded once at the router boundary; entry re-validates id and
   fails closed on a missing roster entry; no transcript load or command issues against an unknown id.
2. Command issuance is gated on epoch confirmation via the existing epoch guard and awaiting-snapshot
   barrier; an epoch mismatch stays visibly unresolved.
3. "selected" / "host-active" / "navigation-requested" are separate states; a snapshot refresh never changes
   the selected session; only a host follow supersedes; no automatic retry of message-send or Stop.
4. The list FAB is scrolled-up-gated and "latest"-only; the per-turn arrow is a distinct control; load-earlier
   is recorded as not-portable-now with its `hasMore` dependency deferred; no cross-epoch cache invention.
5. The per-session view-mode store fails closed; `token-identity` resolves 0-diff and `test:web` is green
   from the final state; the a11y contract is preserved.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Entry re-validation locks out a valid session during a legitimate epoch handoff.** Mitigate by
  distinguishing the transient "awaiting an authoritative snapshot" state (already modeled by
  `transcript.awaitingSnapshot`) from the hard "unknown / dead session" fail — only the latter blocks entry;
  the former shows the existing reconciliation barrier and resolves on the next snapshot.
- **6.2 full host-follow is blocked on a host `navigationIntent` field (⚠️).** Without it, only
  user-initiated navigation (e.g. the existing inbox-resolution `navigate`) supersedes local selection; a
  client-invented follow would violate fail-closed. Tracked in `../007-host-requests`; the ✅ local-precedence
  core ships now.
- **6.4 real paging is blocked on a host `hasMore` token (⚠️).** Deferred to `../007-host-requests`; building
  pagination against a full-snapshot transcript, or synthesizing earlier turns from a stale cache across
  epochs, is prohibited (❌).
- **6.5 unreadable store misread as a clean slate.** The fail-closed default treats an unreadable store as
  unresolved, so a stale or foreign override is never silently applied.
- **Dependency:** the authoritative roster (`app.sessions.items`), `TranscriptState.epoch` + its reducer
  guard, and the device-local preference precedents (theme try/catch in `routes/+layout.svelte`, the
  composer-shift-tab and cache keys). No new host field is required for the ✅ scope.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Does the host expose an `epoch` on the session-card DTO (roster) as well as on the transcript stream? Today
  `epoch` is carried on `TranscriptState` and validated reactively once the snapshot arrives; a roster-level
  epoch would let entry pre-validate before the socket opens. If absent, entry validates the id against the
  roster and defers epoch validation to the first authoritative snapshot (still fail-closed via
  `awaitingSnapshot`). Not a blocker for the ✅ scope; noted for `../007-host-requests`.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent (constraint, phase map, invariants).
- `../research/research.md` — Angle 6 (6.1-6.5) and the Verification notes for the raw-route / navigation-intent citations.
- `../003-chat-message/` — owns the per-turn scroll-to-top arrow (rec 3.1) this phase keeps distinct from the list FAB.
- `../007-host-requests/` — the ⚠️ host `navigationIntent` (6.2) and transcript `hasMore` (6.4) requests.
<!-- /ANCHOR:cross-refs -->
