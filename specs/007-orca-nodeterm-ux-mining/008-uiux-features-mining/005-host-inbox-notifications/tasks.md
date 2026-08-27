---
title: "Phase 5 tasks - host inbox and notifications ledger (CE, AN, HP-3)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; all tasks open at 0%. Host-gated tasks marked [B]."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host inbox/notification task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1 (CE-5)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 tasks - host inbox and notifications

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked on a host field/RPC. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN; this packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_SHIP THE READY-NOW PIECE_

- [ ] T1.1 [CE-5 → REQ-001] Add a device-local read/archive store under `shared/state/`, layered over host `resolved`; wire the badge effect in `shared/format/attention.ts` and the card render in `pages/inbox/screen-attention-inbox.svelte`. Done: reading a card hides it from this device's badge only, no host state changes, client-only test green.
- [ ] T1.2 [baseline] Capture the inbox token-identity and test:web baseline for `screen-attention-inbox.svelte` before any change. Done: real starting numbers recorded.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_FIXTURE-BACKED HARNESSES (host-gated)_

- [ ] T2.1 [CE-1 → REQ-002] [B] Build the cross-session Inbox timeline render (newest-first, keyed by `sessionId`) in `pages/inbox/screen-attention-inbox.svelte` against a fixture. BLOCKED on the inbox-event RPC (sessionId per event, `../../007-host-requests/`). Done: renders nothing with field absent, renders history from a fixture.
- [ ] T2.2 [CE-2 → REQ-003] [B] Render the deduped stream (same title within 10 min = one card) in `screen-attention-inbox.svelte`. BLOCKED on dedup behaviour on the RPC. Done: fixture with a duplicate in-window shows one card; client invents no dedup.
- [ ] T2.3 [CE-3 → REQ-004] [B] Render supersede plus content-change transitions in `screen-attention-inbox.svelte`. BLOCKED on the supersede/content-change edge. Done: answered ask stops glowing with stale choices from a fixture.
- [ ] T2.4 [CE-4 → REQ-005] [B] Render the retained set (newest done + newest unresolved per node) in `screen-attention-inbox.svelte`. BLOCKED on retention behaviour. Done: shows only the retained set, resurrects nothing from local cache.
- [ ] T2.5 [CE-6 → REQ-006] [B] Emit an ack on open and clear on the re-broadcast in `shared/format/attention.ts`. BLOCKED on the `ackDone` re-broadcast edge. Done: a finished-unseen card clears on every surface after one view (fixture).
- [ ] T2.6 [CE-7 → REQ-007] [B] Inline Approve/Deny on the inbox card with a re-check-still-blocked guard, reusing the Review tickets (`pages/chat/features/ask-question/`, `pages/review/`). BLOCKED on the list-level ticket payload. Done: acting on a stale ticket shows already-handled (fixture).
- [ ] T2.7 [HP-3 → REQ-008] [B] Multi-select mode + bulk-action bar chrome for the roster in `screen-attention-inbox.svelte`. BLOCKED on a bulk read-ack RPC; low priority. Done: bar inert without the RPC, never fakes a batch ack.
- [ ] T2.8 [AN-1 → REQ-009] [B] Persist an atomic `{seq, epoch}` watermark and quarantine a partial catch-up in `routes/+layout.svelte` + `shared/format/attention.ts`. BLOCKED on the event stream + watermark + `getMissedSince` RPC. Done: host restart with stale seq quarantines rather than drops (fixture).
- [ ] T2.9 [AN-2 → REQ-010] [B] Consume a presence-aware hold-then-flush queue and drop what resolved while held, in the service worker + `attention.ts`. BLOCKED on host push + presence. Done: suppressed-while-foregrounded alert surfaces on background unless answered (fixture).
- [ ] T2.10 [AN-3 → REQ-011] [B] Independent per-kind toggles + client-side kind-before-throttle order, in `pages/home/push-settings.svelte` + `attention.ts`. BLOCKED on the server per-kind gate + throttle. Done: toggling a kind off stops it before a throttle slot (test).
- [ ] T2.11 [AN-4 → REQ-012] [B] Typed notification-tap routing with a credential-recovery branch in `routes/attention/[lookupId]/+page.svelte`, composing with phase-003 NL-1. BLOCKED on a payload (hostId+sessionId+recovery hint). Done: unknown host refused, missing credential to re-pair, never a blank chat (fixture).
- [ ] T2.12 [AN-5 → REQ-013] [B] Host-driven banner retraction with a show-then-dismiss race guard in the service worker + `attention.ts`. BLOCKED on a `DismissNotificationEvent`. Done: answered-elsewhere banner retracts with no show-after-dismiss flash (fixture).
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] T3.1 [fail-closed] Assert every blocked finding renders nothing with its host field absent (no fabricated card, no synthesized dedup/retention). Done: inertness proven per finding.
- [ ] T3.2 [token-identity + test:web] token-identity 0-diff on the inbox CSS; test:web green from the final state. Done: both captured.
- [ ] T3.3 [a11y-parity] Inbox list semantics, notification banner roles, and focus return preserved. Done: a11y contract confirmed.
- [ ] T3.4 [traceability] Every task cites a finding id and a real file; every host request filed in `../../007-host-requests/`. Done: no traceless task.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] CE-5 implemented with a passing client-only test, changing no host state.
- [ ] Every blocked finding shipped inert with a fixture-backed harness and its host field named + filed.
- [ ] No `[B]` task claimed done until its relay field lands; each is documented against `../../007-host-requests/`.
- [ ] token-identity, test:web, a11y-parity green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements, host fields, and ready-now/blocked splits.
- `plan.md` - the sequenced approach and the inbox/notification batches.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 3, §6.1, §6.5.
- `../../007-host-requests/` - the relay-side inbox-event RPC and push contract requests.
<!-- /ANCHOR:cross-refs -->
