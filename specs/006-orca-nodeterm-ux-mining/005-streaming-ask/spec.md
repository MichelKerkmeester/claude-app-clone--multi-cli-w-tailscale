---
title: "Phase 5 — Streaming & ask/permission hardening: peek-safe streaming, working-vs-streaming split, and blocking-prompt discipline"
description: "Harden the mature streaming and blocking-prompt surfaces against the eight verified orca Angle-5 recommendations: keep streaming session-scoped and peek-safe, split the working dots from the streaming partial-text, reconcile the optimistic user echo by host message id, name the input-lock reasons with a settle window, verify the ask card answers by option identity with dismissal kept outside the card, render approval buttons from the host ticket under single-flight, allow one blocking prompt at a time, and name the empty/loading/error transcript copy with a single assertive send-failure channel. Every affordance reads existing DTO fields or is pure interaction; nothing owns session truth. Plan only — no implementation until the operator says go."
trigger_phrases:
  - "streaming ask spec requirements"
  - "streaming ask packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Folded nodeterm ND-2.6/2.9/6.8 reconciliation notes into the Angle-5 scope."
    next_safe_action: "Await operator go before implementing the PHASE 1 derivations."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 — Streaming & ask/permission hardening

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `004-composer` · Next: `006-navigation`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Writer | Claude (derivation seams, per-rec UI, fail-closed + a11y verification, git) |
| Recs | 5.1 · 5.2 · 5.3 · 5.4 · 5.5 · 5.6 · 5.7 · 5.8 (`research/research.md` Angle 5) |
| Constraint | Host-authoritative, fail-closed — the client owns no editable session metadata |
| Barrier | fail-closed proof + a11y-parity preserved + token-identity 0-diff + test:web green + every task traces to a rec |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Our streaming and blocking-prompt surfaces are already mature. The transcript virtualizes and follows the
live edge; the ask-question card is a one-use ticketed mutation; the Review screen decides approvals from a
typed host ticket. Angle 5 of the orca research is therefore mostly reconciliation refinements plus two real
gap-closers, not a rewrite.

This phase implements the eight verified Angle-5 recommendations. Three are largely present in our client
and are hardened and proven rather than built new: the optimistic user echo already reconciles by replacing
the echo with the host block and restores the draft on reject (5.3); the ask card already answers by stable
option identity with its draft held in an out-of-card ephemeral store (5.5); the Review screen already
renders approve/deny from the host ticket under a single-flight guard (5.6). Two are genuine gaps: there is
no partial-text typing feedback distinct from the "Working…" dots (5.2), and the composer's input lock does
not name its reason or settle a dying socket (5.4). The rest tighten peek-safety (5.1), blocking-prompt
precedence (5.7), and the named empty/error copy with an assertive send-failure channel (5.8).

Every affordance here reads existing DTO fields (`status`, transcript `blocks` with revisions and
`occurredAt`, `epoch`, the connection phase, the ask/approval tickets) or is pure interaction. No task makes
the client own or edit session truth.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** eight recs over these surfaces —
`pages/chat/transcript/transcript-list.svelte` (the streaming marker, the empty state, the live-edge
region), `pages/chat/screen-chat.svelte` (the optimistic-echo send path, the `canSubmit` gate, the
send-failure surfacing), `pages/chat/transcript/runtime-status-region.svelte` (the polite runtime region and
a new assertive send-failure channel), `pages/chat/features/ask-question/*`
(`card-ask-question.svelte`, `use-ask-question-state.svelte.ts`, `ask-question-ephemeral-store.ts` — verify
option-identity answers and the out-of-card draft store), `pages/review/screen-review.svelte` (approval
buttons from the ticket, single-flight, the paused-states guard), and
`shared/transport/use-sync-socket.svelte.ts` (session-scoped stream identity and the existing
requestAnimationFrame throttle). The streaming-token detection, the input-lock-reason mapping, and the
one-blocking-prompt precedence are introduced first as pure derivations over existing state.

**Out of scope:** any new host-published field or RPC (this phase's core is ✅ over existing data); the
composer internals owned by `004-composer` (`session-composer.svelte`) beyond the `canSubmit`/lock-reason
props it consumes; paste-image upload and its host media lease (the image-preview-kept-until-host-URI cache
of 5.3 is gated on that and cross-refs `004-composer` / `007-host-requests`); the multi-question ask wizard,
which needs a host multi-question grouping payload we do not have (⚠️ → `007-host-requests`); the home,
navigation, and card surfaces owned by the sibling phases.

**nodeterm fold-in (reconciliation over existing fields):** three nodeterm Angle-2/6 findings harden the
same streaming/ask surfaces — **ND-2.6** (a `running` re-reported within the ~3 s done-holdoff must not
resurrect a finished turn; only an `epoch`/new-turn advance reopens idle→running — extends orca 4.8 to status
transitions), **ND-6.8** (a retracted/cleared signal — a dismissed ask, a stopped "Working…" indicator, a
cleared send-failure — is an edge kept outside the ephemeral view so a reconnect/`sync.gap` can neither lose
nor resurrect it — reinforces orca 5.5), and **ND-2.9** (a stale/interrupted end is never celebrated as a
completion — `interrupted` already suppresses it, and the stale-end host end-reason is ⚠️ → `007-host-requests`).
All are ✅ reconciliation over existing fields except the ND-2.9 end-reason, which is a host ask.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** (5.1) — Streaming stays session-scoped and peek-safe: the stream identity is keyed to the
  session, not a view/tab toggle, so opening another surface never resets the running stream; UI updates stay
  throttled (the existing rAF batch in the sync socket); the synthetic streaming marker is dropped once the
  host transcript carries the same text.
- **REQ-002** (5.2) — Working and streaming are split: animated dots show only while the turn is running with
  no token block yet; once an assistant text block exists for the running turn, that partial text IS the
  streaming indicator; the Stop affordance stays reachable on the working bar. No typing ghost is faked when
  no running signal exists (fail-closed).
- **REQ-003** (5.3) — The optimistic user echo reconciles by host message id: the host block replaces the
  echo (never duplicates it, including when the host echoes the same message back over sync); on reject the
  echo is removed and the exact raw draft is restored; a pending message is never persisted as the session.
- **REQ-004** (5.4) — The input lock names its reason: "waiting for lease" (transient — awaiting snapshot /
  reconnecting) is distinguished from "disconnected" (hard — offline / unenrolled); a 600 ms settle prevents
  a dying socket from flashing the send control enabled for one frame; the editable textbox is never revoked.
- **REQ-005** (5.5) — The ask card answers by stable option identity (option id), not a pasted label, and its
  in-progress draft lives outside the card (the ephemeral store) so a view toggle cannot lose it; these are
  verified as already satisfied. The stepped multi-question wizard is planned as gated on a host
  multi-question payload (⚠️), not built on invented client grouping.
- **REQ-006** (5.6) — Permission/approval buttons render from the typed host ticket (primary = the first
  option), never scraped from assistant prose; a decision is offered only while the ticket is actionable
  (pending and not expired — the paused-states discipline), never against a working agent; submit is
  single-flight.
- **REQ-007** (5.7) — At most one blocking prompt is active at a time, with strict precedence
  (structured Ask > permission > heuristic); two blocking overlays never stack. No heuristic prose-scrape
  prompt is introduced.
- **REQ-008** (5.8) — The transcript names its empty, loading, and error states distinctly (a failed
  transcript RPC never reads as "no messages yet"); send failures route through a single assertive a11y
  channel, cleared on the next accepted write.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All eight recs are implemented or proven-already-satisfied, each traceable to its rec number in `tasks.md`.
2. Streaming survives a view toggle; the dots show only pre-token and the partial text carries streaming once tokens exist; no typing ghost appears without a running signal.
3. The optimistic echo reconciles by host message id with no duplicate, the draft restores exactly on reject, and stale/unknown/mismatched state stays visibly unresolved (fail-closed).
4. Approval buttons come only from the host ticket under single-flight; one blocking prompt shows at a time; empty/loading/error copy is named and the send-failure channel is assertive.
5. token-identity resolves 0-diff (CSS value-preserving), `test:web` is green from the final state, and the a11y contract is preserved.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A faked typing indicator with no host running signal (5.2).** Rendering a synthetic partial-text bubble
  when the host has not signalled a running turn would invent progress the host never reported. Mitigation:
  gate the partial-text-as-indicator strictly on the existing `running`/`streaming` signal and an actual
  assistant text block; show dots only while running-with-no-token; show nothing otherwise.
- **A duplicated user turn on echo reconciliation (5.3).** If the host echoes the sent message back over the
  sync stream while the optimistic echo is still present, reconciling by the client id alone can leave two
  rows. Mitigation: reconcile by host message id so the synced host echo replaces the optimistic block; lean
  on the existing id-keyed block normalization rather than a second source of truth.
- **A socket dying mid-frame flashes send-enabled (5.4).** Without a settle window the composer can present
  the send control as enabled for one frame as the socket drops. Mitigation: a 600 ms settle on the
  transient lock; never revoke `editable` (iOS yanks the keyboard).
- **Two blocking overlays stack (5.7).** An ask card and another blocking prompt appearing together would
  trap the user. Mitigation: a precedence selector that surfaces exactly one; permission lives on the Review
  route, and no heuristic prose-scrape prompt exists in our client.
- **Dependency (deferred, not blocking):** the image-preview-until-host-URI cache of 5.3 depends on
  paste-image landing (`004-composer` / `007-host-requests`); the multi-question wizard of 5.5 depends on a
  host multi-question payload (`007-host-requests`). Both are planned as gated tasks, not built here.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Does the host ever deliver a multi-question ask in a single ticket, or is each question always its own
  transcript block? The stepped-wizard sub-part of 5.5 is buildable only if the host groups questions; until
  confirmed it stays a `007-host-requests` item and each card remains one question.
- Where should the Stop affordance live for 5.2 — on the working bar (orca) or kept in the composer where it
  is today? The plan keeps the existing composer Stop and treats a working-bar Stop as an optional, separate
  affordance to avoid duplicating the abort path.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent and its invariants.
- `../research/research.md` — Angle 5 (recs 5.1–5.8) and the "already mature" framing.
- `../004-composer/` — owns the composer internals and paste-image; consumes the `canSubmit`/lock-reason props.
- `../007-host-requests/` — the multi-question grouping and paste-image media lease that gate two sub-items here.
<!-- /ANCHOR:cross-refs -->
