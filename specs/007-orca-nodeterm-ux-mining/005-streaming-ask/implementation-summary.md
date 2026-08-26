---
title: "Phase 5 implementation summary — streaming & ask/permission hardening (planned)"
description: "Planned stub for the eight Angle-5 recs: peek-safe session-scoped streaming, the working-vs-streaming dots/partial-text split, optimistic-echo reconciliation by host message id with draft restore on reject, named input-lock reasons with a 600 ms settle, verified option-identity + out-of-card ask dismissal, ticket-driven single-flight approval, one blocking prompt at a time, and named empty/error copy with an assertive send-failure channel. Implementation deferred until the operator says go; no completion claims."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the planned Angle-5 stub with the ND-2.6/2.9/6.8 fold-in."
    next_safe_action: "Await operator go before implementing the PHASE 1 derivations."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Planned |
| Requirements planned | REQ-001 … REQ-008 (recs 5.1–5.8) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet — implementation is deferred until the operator says go. This phase will harden the mature
streaming and blocking-prompt surfaces against the eight verified Angle-5 recommendations. It will keep
streaming session-scoped and peek-safe (5.1), split the working dots from the streaming partial-text (5.2),
reconcile the optimistic user echo by host message id with the draft restored on reject (5.3), name the
input-lock reason with a 600 ms settle and never revoke the editable textbox (5.4), verify the ask card
answers by stable option identity with its draft held outside the card (5.5), render approval buttons only
from the host ticket under single-flight (5.6), allow one blocking prompt at a time (5.7), and name the
empty/loading/error transcript copy with a single assertive send-failure channel (5.8). Every affordance will
read existing DTO fields or be pure interaction; none will make the client own session truth. The primary
surfaces are `pages/chat/transcript/transcript-list.svelte`, `pages/chat/transcript/runtime-status-region.svelte`,
`pages/chat/features/ask-question/card-ask-question.svelte`, and `shared/transport/use-sync-socket.svelte.ts`.

It will also fold in three nodeterm Angle-2/6 reconciliation findings over these same surfaces: a done-holdoff
so a late out-of-order `running` never resurrects a finished turn (ND-2.6, extending orca 4.8 to status
transitions); retracted/cleared signals kept outside the ephemeral view as edges that survive a
reconnect/`sync.gap` (ND-6.8, reinforcing orca 5.5); and no celebration of a stale/interrupted end as a
completion (ND-2.9). All three are reconciliation over existing fields except the ND-2.9 stale-end reason,
which is a deferred host ask (→ `007-host-requests`).
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Planned, not yet delivered. The approach is derivation-first: three pure derivations over existing state —
`hasStreamingTokens` (5.1/5.2), `inputLockReason` (5.4), and `activeBlockingPrompt` (5.7) — will be
introduced with fail-closed defaults, then each rec applied to its owning surface. Three recs are hardened
and proven rather than built new — the optimistic echo already reconciles and restores the draft (5.3), the
ask card already answers by option id with an out-of-card ephemeral store (5.5), and the Review screen
already renders ticket-driven approve/deny under a single-flight guard (5.6). Two are genuine gap-closers —
the partial-text split (5.2) and the named lock reasons with a settle (5.4). The result will be proven by a
fail-closed pass, token-identity, an a11y-parity check, and `test:web` from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Reconcile the echo by host message id, not the client optimistic id alone (5.3).** The send path already
replaces the optimistic block and restores the draft on reject. The planned change is to dedupe against a
host echo arriving over the sync stream, so a synced host echo replaces rather than duplicates the optimistic
row — leaning on the id-keyed block normalization rather than a second source of truth.

**Treat 5.5 as verification, and gate the wizard on the host.** The ask card already answers by stable option
id (more robust than orca's numeric index) and holds its draft in a module-level ephemeral store outside the
card, so the index-not-label and out-of-card-dismissal invariants are already met. The stepped multi-question
wizard needs a host multi-question payload we do not have, so it is deferred to `007-host-requests` rather
than built on invented client grouping.

**Keep the composer Stop; do not fake progress.** For 5.2 the existing composer Stop is kept and a working-bar
Stop is treated as an optional separate affordance, avoiding a duplicated abort path. The partial-text
indicator is gated strictly on the host running signal plus an actual assistant text block, so no typing
ghost appears when the host has not reported a running turn.

**Reconcile status transitions with a done-holdoff and an edge-vs-self-correcting split (ND-2.6 / ND-6.8).** A
`running` re-reported within the ~3 s done-holdoff of an end is held off unless an `epoch`/turn-boundary marks
a new turn, so a stray post-`done` event never resurrects the turn — the status-transition analogue of orca
4.8's re-reported-value rule. A retracted signal (dismissed ask, stopped indicator, cleared error) is an edge
nothing re-announces, so it is held outside the ephemeral view and reconciled from the next snapshot rather
than left waiting on a superseding update — reinforcing orca 5.5.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| Fail-closed pass | No synthetic partial-text without a host running signal; no duplicate echo; no approval against a working agent; stale/unknown/mismatched stays visibly unresolved |
| One blocking prompt | `activeBlockingPrompt` renders at most one (Ask precedence); overlay audit shows no stacking |
| Ticket-only approval | Approve/deny come only from `ApprovalCardDto`; single-flight via the pending guard |
| a11y-parity | Runtime region stays polite; send-failure channel assertive + clears on next accepted write; ask-card focus/roving unchanged |
| Token identity | 0 CHANGED / 0 VANISHED / 0 ADDED across the themes (any touched CSS value-preserving) |
| `test:web` | Green from the final state |
| `validate.sh --strict` | exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two sub-items are gated on the host and are not built in this phase: the image-preview-kept-until-host-URI
cache of 5.3 depends on paste-image and its media lease (`004-composer` / `007-host-requests`), and the
stepped multi-question ask wizard of 5.5 depends on a host multi-question grouping payload
(`007-host-requests`). Both are planned as gated tasks. The partial-text indicator (5.2) is only as granular
as the host's revisioned assistant text blocks — it is not a per-token typing animation, by design, because
faking token-level progress the host never reported would violate fail-closed. A presumed-stale end is also
indistinguishable from a natural `idle` in our DTO, so distinguishing it needs a host end-reason (ND-2.9, ⚠️ →
`007-host-requests`); `interrupted` already suppresses a false "finished" celebration, so only the
stale-sweep case is deferred. This document is a planned stub; no completion is claimed.
<!-- /ANCHOR:limitations -->
