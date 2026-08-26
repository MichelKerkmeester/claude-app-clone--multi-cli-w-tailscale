---
title: "Phase 6 checklist — fail-closed navigation barrier"
description: "Barrier sign-off for the Angle-6 navigation recs: fail-closed entry re-validation (id + epoch), selection-precedence separation with idempotent-only retry, the FAB/arrow split, load-earlier recorded as not-portable-now, and a per-session view-mode store that fails closed — proven with token-identity 0-diff, a11y-parity, and test:web green. All barriers open; nothing implements until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added nodeterm ND reconnect, connection, and enrollment barriers, all open"
    next_safe_action: "On operator go, satisfy the ND-6.1 stale-working barrier first"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Fail-closed navigation is
proven by behaviour — an unknown/stale id and an unconfirmed epoch each stay visibly unresolved with no load
and no command — not by a line diff. The FAB/arrow split is proven behaviour-preserving by `token-identity`
(no rendered-value change) and the a11y checks (roles/labels/focus/dismissal). All items are open; nothing
implements until the operator says go.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The nav/entry seam is inventoried: id decoded/raw at the route, encoded once at the
  `routes/+layout.svelte` boundary, and `TranscriptState.epoch` + the reducer guard identified as the epoch
  second-check. [evidence: T1.1 — planned]
- [ ] **CHK-PRE-02** [P0] The device-local preference precedents (theme `try/catch`, composer/cache keys) are
  captured as the fail-closed read/write shape for 6.5. [evidence: T1.2 — planned]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] *(6.1)* Entry re-validation keeps the id raw and fails closed on a missing roster
  entry — no socket, no command against an unknown id. [evidence: T2.1 — planned]
- [ ] **CHK-CQ-02** [P0] *(6.1)* No command issues until the authoritative epoch is confirmed via the existing
  epoch guard and awaiting-snapshot barrier. [evidence: T2.2 — planned]
- [ ] **CHK-CQ-03** [P0] *(6.2)* "selected" / "host-active" / "navigation-requested" are separate states;
  retries are idempotent-activation-only; message-send and Stop are never auto-retried. [evidence: T2.3 — planned]
- [ ] **CHK-CQ-04** [P0] *(ND-6.1, ND-6.5, ND-6.6)* On reconnect a stale `working` card never flips to
  `done`/`idle` locally — it stays `working (stale)`, dimmed via the Live/Stale banner; the restored marker
  holds until the live snapshot; liveness rides `noteRelayHeartbeat()`, never `updatedAt`. [evidence: T2.8 /
  T2.12 / T2.13 — planned]
- [ ] **CHK-CQ-05** [P0] *(ND-6.2, ND-6.3)* A host-connection drop greys the chat in place and reconnects the
  SAME id (no second view, no bounce Home); no open/reconnect/enroll promise hangs without a close-signal +
  60 s timeout. [evidence: T2.9 / T2.10 — planned]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] Fail-closed nav holds: unknown/stale id → unavailable state; epoch mismatch → held
  at the barrier; roster refresh → selection unchanged. [evidence: T3.1 `test:web` — planned]
- [ ] **CHK-TEST-02** [P0] *(6.3)* `token-identity` resolves 0-diff for the transcript-list CSS (the FAB/arrow
  split changes no rendered value). [evidence: T3.2 — planned]
- [ ] **CHK-TEST-03** [P0] `test:web` passes from the final state. [evidence: T3.1-T3.3 — planned]
- [ ] **CHK-TEST-04** [P0] The folded reconnect / connection-boundary / enrollment behaviours (ND-6.1-6.7)
  hold under `test:web` from the final state. [evidence: T3.5-T3.7 — planned]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] *(6.3)* The list jump-to-latest FAB (scrolled-up-gated, "latest"-only) and the
  per-turn scroll-to-top arrow (owned by `../003-chat-message` rec 3.1) are distinct controls — never merged.
  [evidence: T2.5 — planned]
- [ ] **CHK-FIX-02** [P0] *(6.5)* The per-session view-mode store fails closed: an unreadable store returns
  the canonical default and is treated as unresolved, never "no overrides"; the preference is per-session
  isolated. [evidence: T2.7 / T3.3 — planned]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed, host-authoritative: no client-owned or client-edited session truth; a
  URL param / tapped card is treated as intent, not proof; stale/unknown/mismatched data stays unresolved.
  [evidence: T2.1-T2.3 — planned]
- [ ] **CHK-SEC-02** [P0] *(6.4)* Load-earlier is recorded as not-portable-now; real paging is deferred to a
  host `hasMore` token; no earlier messages are synthesized from a stale cache across epochs. [evidence:
  T2.6 — planned]
- [ ] **CHK-SEC-03** [P0] *(ND-6.4, ND-6.9)* A not-found / `id`+`epoch`-invalid target fails closed to Home
  ("session no longer available"), never a phantom; identity resolves strictly by session id, never a fuzzy
  "newest for this context" fallback. [evidence: T2.11 / T2.15 — planned]
- [ ] **CHK-SEC-04** [P0] *(ND-6.7)* The QR/enrollment offer parser returns a typed null (never throws) on
  malformed input, requires TLS (loopback-only for plaintext), and treats the pairing token as single-use.
  [evidence: T2.14 — planned]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: T3.4 — planned]
- [ ] **CHK-DOC-02** [P1] No spec path or artifact id introduced in a code comment (comment hygiene).
  [evidence: T3.4 — planned]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] Every task traces to a rec number (6.1-6.5); the two host-gated enhancements
  (6.2 true-follow, 6.4 real-paging) are deferred to `../007-host-requests`, not invented. [evidence: T3.4 — planned]
- [ ] **CHK-ORG-02** [P2] The a11y contract is preserved across the FAB/arrow split and the unavailable-state
  addition (roles, labels, focus, dismissal). [evidence: T3.2 a11y-parity — planned]
- [ ] **CHK-ORG-03** [P1] Every folded task traces to an ND id (ND-6.1-6.7, ND-6.9); the handoff *mechanism*
  (ND-6.9) is recorded as a ❌ exclusion, not built. [evidence: T3.8 — planned]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned. On operator go, this phase lands fail-closed session→chat navigation: entry re-validates the raw id
against the roster and gates command issuance on epoch confirmation (6.1); selection precedence keeps the
user's session through snapshot refreshes with only a host follow superseding and idempotent-only retry (6.2);
the list FAB and per-turn arrow stay distinct (6.3); load-earlier is recorded as not-portable-now with its
host `hasMore` dependency deferred (6.4); and the per-session view-mode store fails closed (6.5). The barrier
closes on `token-identity` 0-diff, a11y-parity, and `test:web` green from the final state. No evidence is
recorded yet — all barriers are open.
<!-- /ANCHOR:summary -->
