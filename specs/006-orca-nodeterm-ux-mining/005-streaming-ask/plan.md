---
title: "Phase 5 plan — derivation-first streaming/ask hardening, proven fail-closed and behaviour-safe"
description: "How the eight Angle-5 recs land: introduce streaming-token, input-lock-reason, and one-blocking-prompt as pure derivations over existing state first, then apply each rec to its surface — peek-safe streaming and the working-vs-streaming split in the transcript, echo reconciliation by host message id in the send path, named lock reasons with a 600 ms settle on the composer gate, verified option-identity + out-of-card dismissal on the ask card, ticket-driven single-flight approval on Review, one-blocking-prompt precedence, and named empty/error copy with an assertive send-failure channel — then prove it with a fail-closed pass, token-identity, a11y-parity, and test:web."
trigger_phrases:
  - "streaming ask plan approach"
  - "streaming ask packet"
  - "plan approach"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added the done-holdoff and edge-vs-self-correcting approach for the ND fold-in."
    next_safe_action: "Await operator go before building the PHASE 1 derivations."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Land the eight Angle-5 recs derivation-first. Introduce three pure derivations over existing state —
streaming-token presence (5.1/5.2), the input-lock reason (5.4), and the one-blocking-prompt precedence
(5.7) — then apply each rec to its owning surface. Three recs are hardened-and-proven rather than built new
(5.3 echo reconciliation, 5.5 option-identity + out-of-card draft, 5.6 ticket-driven single-flight
approval); two are genuine gap-closers (5.2 partial-text split, 5.4 named lock reasons + settle); three
tighten peek-safety, precedence, and named copy (5.1, 5.7, 5.8). The result is proven fail-closed and
behaviour-safe by a stale/unknown-stays-unresolved pass, token-identity, an a11y-parity check, and test:web
from the final state.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Every task traces to a rec number (5.1–5.8). The fail-closed gate holds: no synthetic partial-text without a
host running signal, no duplicate user turn on echo reconciliation, no approval offered against a working
agent, and stale/unknown/mismatched state stays visibly unresolved rather than promoted to success. The
a11y-parity gate holds: the runtime status region stays polite, the new send-failure channel is assertive
and cleared on the next accepted write, and ask-card focus/roving order is unchanged. token-identity resolves
0-diff across the themes (any CSS touched is value-preserving), and `test:web` is green from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The seam is a small set of pure derivations that keep every affordance readable and fail-closed:

- **`hasStreamingTokens`** — a derivation over the transcript `blocks` and the running signal: true when the
  turn is running and the latest block is an in-progress assistant text block. It splits the dots (running,
  no token) from the partial text (token present), and it is the same signal that drops the synthetic
  `streaming--marker` once the host transcript carries the text. Reads only existing block data.
- **`inputLockReason`** — a derivation over the connection phase and transcript state mapping to
  `none | waiting-for-lease | disconnected`: `awaitingSnapshot`/reconnecting → waiting-for-lease (transient),
  offline/unenrolled → disconnected (hard). A 600 ms settle debounce sits on the transient→enabled edge so a
  dropping socket cannot flash send-enabled. `editable` is never derived off this — it stays always-on.
- **`activeBlockingPrompt`** — a precedence selector returning at most one of
  `ask | permission | none` (Ask wins), so two blocking overlays never render together. Permission already
  lives on the Review route; no heuristic prose-scrape prompt exists, so the "heuristic" tier is absent by
  construction.

The optimistic-echo path in `screen-chat.svelte` already dispatches `promptOptimistic` →
`promptAccepted`/`promptRejected` and restores the draft on reject; the change is to reconcile by host
message id (dedupe against a synced host echo) rather than the client optimistic id alone, leaning on the
id-keyed block normalization in `state.ts`. The ask card already answers by option id
(`use-ask-question-state.svelte.ts`) with the draft in the module-level ephemeral store
(`ask-question-ephemeral-store.ts`) — 5.5's index-not-label and out-of-card-dismissal invariants are
verified, not re-engineered. The Review screen already renders approve/deny from `ApprovalCardDto` under a
`pendingId` single-flight guard and only while pending-and-not-expired — 5.6 adds the explicit
paused-states guard as defence-in-depth. Named copy (5.8) splits the transcript's single empty state into
loading/error/empty and routes send failures through an assertive sibling of the polite
`runtime-status-region`.

**nodeterm fold-in — reconciliation discipline (ND-2.6 / ND-6.8 / ND-2.9).** Three Angle-2/6 findings sharpen
the host-snapshot reconciliation. A **done-holdoff** guard (ND-2.6, `DONE_HOLDOFF_MS` ≈ 3 s) holds a
just-finished card through a late out-of-order `running` re-report; only an `epoch`/turn-boundary advance
reopens idle→running, so a stray post-`done` event never resurrects the turn — the status-transition analogue
of orca 4.8's "a re-reported identical value must not revert a user pick." An **edge-vs-self-correcting-signal**
split (ND-6.8) governs `sync.gap`/reconnect handling: a self-correcting sample (a "Working…" tick) is safe to
drop, since the next one supersedes it, but a *retraction* — a dismissed ask, a stopped indicator, a cleared
error — is an edge nothing re-announces, so retracted/cleared state is held outside the ephemeral view and
reconciled from the next snapshot rather than left waiting on a superseding update that never comes
(reinforces orca 5.5). And a stale/interrupted end is never promoted to a "finished" celebration (ND-2.9):
`interrupted` already suppresses it; distinguishing a presumed-stale sweep from a natural `idle` needs a host
end-reason (⚠️ → `007-host-requests`), planned as a gated ask, not faked on the client.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup — derivations + baseline
Introduce `hasStreamingTokens` (5.1/5.2), `inputLockReason` (5.4), and `activeBlockingPrompt` (5.7) as pure
derivations over existing state, each with the fail-closed default. Capture the token-identity and `test:web`
baselines before any surface changes.

### Phase 2 · implementation — per rec
Apply each rec to its surface: peek-safe streaming + drop-marker-on-host-text (5.1), the working-vs-streaming
split (5.2), echo reconciliation by host message id + restore-draft-on-reject (5.3), named lock reasons +
600 ms settle + never-revoke-editable (5.4), verify option-identity + out-of-card dismissal and gate the
multi-question wizard on the host (5.5), ticket-driven single-flight approval + paused-states guard (5.6),
one-blocking-prompt precedence (5.7), and named empty/loading/error copy + assertive send-failure channel
(5.8).

### Phase 3 · verification
Run the fail-closed pass (no synthetic progress, no duplicate echo, no approval against a working agent,
stale stays unresolved), token-identity, the a11y-parity check (polite vs assertive regions, focus/roving),
`test:web`, and `validate.sh --strict` — all from the final state, with traceability from every task to a rec.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The three derivations get pure-function unit coverage: `hasStreamingTokens` (running/no-token → dots,
running/token → partial text, not-running → nothing), `inputLockReason` (transient vs hard, the settle edge),
and `activeBlockingPrompt` (Ask precedence, never two). Behaviour is proven by `test:web` from the final
state; the fail-closed boundaries (unknown session, dropped socket, host echo arriving over sync) are
asserted to stay visibly unresolved. a11y-parity is checked by confirming the runtime region stays polite,
the send-failure channel is assertive and clears on the next accepted write, and the ask-card focus/roving
order is unchanged. token-identity proves any touched CSS is value-preserving.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The existing transcript reducer and id-keyed block normalization in `$shared/state/state.ts` (echo
  reconciliation seam for 5.3).
- The sync socket's session-scoped identity and rAF batch in `use-sync-socket.svelte.ts` (5.1 throttle +
  peek-safety are largely present; the task confirms and enforces them).
- The ask-question ephemeral store and option-id answer path (5.5 verification).
- `ApprovalCardDto` and the Review decision path (5.6).
- Deferred, non-blocking: paste-image + host media lease (`004-composer` / `007-host-requests`) for the 5.3
  image-preview cache; a host multi-question payload (`007-host-requests`) for the 5.5 wizard.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change touches `app-mobile/src/pages/chat/**` and `app-mobile/src/pages/review/screen-review.svelte`
(plus the read-only derivation additions and their unit tests). `git checkout -- app-mobile` restores the
prior behaviour; there is no host-protocol change, no migration, and no data step, so rollback is a pure
working-tree revert.
<!-- /ANCHOR:rollback -->
