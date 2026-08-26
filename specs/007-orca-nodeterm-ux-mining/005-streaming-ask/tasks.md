---
title: "Phase 5 tasks — streaming & ask/permission hardening ledger"
description: "Build the three pure derivations, apply the eight Angle-5 recs to their surfaces, and prove the result fail-closed and behaviour-safe. Every task cites its rec number and the real app file(s) it touches; all open until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added open ND-2.6/2.9/6.8 fold-in rows across PHASE 1, 2 and 3."
    next_safe_action: "Await operator go before starting the ND-2.6 done-holdoff derivation."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its rec number and the
real app file(s) it will touch. Nothing is implemented yet — this is a plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** (5.1, 5.2) Introduce `hasStreamingTokens` as a pure derivation over the transcript `blocks` + the running signal: true when the turn is running and the latest block is an in-progress assistant text block. Fail-closed default is false. [files: `pages/chat/transcript/transcript-list.svelte`, `pages/chat/screen-chat.svelte`; reads `$shared/state/state.ts` blocks]
- [ ] **T1.2** (5.4) Introduce `inputLockReason` as a pure derivation over the connection phase + transcript state → `none | waiting-for-lease | disconnected` (awaitingSnapshot/reconnecting = transient; offline/unenrolled = hard), with a 600 ms settle on the transient→enabled edge. [files: `pages/chat/screen-chat.svelte`; reads `shared/transport/use-sync-socket.svelte.ts` connection phases]
- [ ] **T1.3** (5.7) Introduce `activeBlockingPrompt` as a precedence selector → at most one of `ask | permission | none` (Ask wins). [files: `pages/chat/screen-chat.svelte`, `pages/chat/transcript/transcript-list.svelte`]
- [ ] **T1.4** (all) Capture the token-identity and `test:web` baselines from the pre-change tree so the final-state delta is provable. [files: baseline capture only — no source change]
- [ ] **T1.5** (ND-2.6) Introduce `holdOffLateRunning` as a pure derivation over the host snapshot + `epoch`/turn-boundary: a `running` re-reported within the ~3 s done-holdoff (`DONE_HOLDOFF_MS`) of an `idle`/`interrupted` end does NOT move the card back to running; only a genuine new-turn marker (an epoch/turn-boundary advance) reopens idle→running. Fail-closed default holds the finished state. Extends orca 4.8 ("a re-reported identical value must not revert a user pick") to status transitions. [files: `shared/transport/use-sync-socket.svelte.ts` (snapshot reconcile), `$shared/state/state.ts`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** (5.1) Keep streaming session-scoped and peek-safe: confirm the sync socket's stream identity is keyed to the session (not a view toggle) and the existing rAF batch throttles UI updates; drop the synthetic `streaming--marker` once `hasStreamingTokens` shows the host transcript carries the text. [files: `pages/chat/transcript/transcript-list.svelte`, `shared/transport/use-sync-socket.svelte.ts`]
- [ ] **T2.2** (5.2) Split working from streaming: show the animated dots only while running with no token block; once an assistant text block exists for the running turn, that partial text IS the streaming indicator; keep the Stop affordance reachable on the working bar. Never render a typing ghost without the running signal. [files: `pages/chat/transcript/transcript-list.svelte` (`streaming--marker`), `pages/chat/screen-chat.svelte`]
- [ ] **T2.3** (5.3) Reconcile the optimistic user echo by host message id: the host block replaces the echo (dedupe against a synced host echo, not just the client optimistic id); on reject remove the echo and restore the exact raw draft (already present — harden + prove); never persist a pending message as the session. [files: `pages/chat/screen-chat.svelte` (send path), `$shared/state/state.ts` (`promptOptimistic`/`promptAccepted`/`promptRejected`)]
- [ ] **T2.4** (5.4) Name the input-lock reason from T1.2 in the composer gate: distinguish waiting-for-lease (transient) from disconnected (hard), apply the 600 ms settle so a dying socket never flashes send-enabled, and never revoke the editable textbox. [files: `pages/chat/screen-chat.svelte` (`canSubmit` + lock-reason props); consumed by `004-composer`'s `session-composer.svelte`]
- [ ] **T2.5** (5.5) Verify and document that the ask card answers by stable option id (not a pasted label) and that its in-progress draft lives in the out-of-card ephemeral store, so a view toggle cannot lose it. Mark the stepped multi-question wizard `[~]` deferred — it needs a host multi-question payload (→ `007-host-requests`). [files: `pages/chat/features/ask-question/card-ask-question.svelte`, `use-ask-question-state.svelte.ts`, `ask-question-ephemeral-store.ts`]
- [ ] **T2.6** (5.6) Render approval buttons only from the typed host ticket (primary = first option), never from assistant prose; offer a decision only while the ticket is pending-and-not-expired (the paused-states guard, add explicitly as defence-in-depth), never against a working agent; keep submit single-flight via the existing pending guard. [files: `pages/review/screen-review.svelte`]
- [ ] **T2.7** (5.7) Enforce one blocking prompt at a time via `activeBlockingPrompt`: the ask card takes precedence; permission stays on the Review route; confirm no heuristic prose-scrape prompt is introduced, so two blocking overlays never stack. [files: `pages/chat/transcript/transcript-list.svelte`, `pages/chat/screen-chat.svelte`, `pages/review/screen-review.svelte`]
- [ ] **T2.8** (5.8) Name the transcript's empty/loading/error copy distinctly so a failed transcript RPC never reads as "no messages yet"; route send failures through a single assertive a11y channel (an assertive sibling of the polite runtime region), cleared on the next accepted write. [files: `pages/chat/transcript/transcript-list.svelte` (`empty--transcript`), `pages/chat/transcript/runtime-status-region.svelte`, `pages/chat/screen-chat.svelte` (`promptError`)]
- [ ] **T2.9** (ND-2.6) Apply the done-holdoff (T1.5) in the host-snapshot reconciliation path: an out-of-order late `running` inside the holdoff window is ignored unless the `epoch`/turn-boundary marks a new turn; the runtime-status region never resurrects a finished turn from the re-report. [files: `shared/transport/use-sync-socket.svelte.ts`, `pages/chat/transcript/runtime-status-region.svelte`]
- [ ] **T2.10** (ND-6.8) Keep retracted/cleared signals as edges held OUTSIDE the ephemeral view so a reconnect/`sync.gap` can neither lose nor resurrect them: an answered/dismissed ask ticket, a stopped "Working…" indicator, and a cleared send-failure each survive a gap as an edge the next snapshot reconciles, never waiting on a superseding update that never arrives. Reinforces orca 5.5 (ask-card dismissal lives outside the card). [files: `pages/chat/features/ask-question/ask-question-ephemeral-store.ts`, `pages/chat/features/ask-question/use-ask-question-state.svelte.ts`, `pages/chat/transcript/runtime-status-region.svelte`, `shared/transport/use-sync-socket.svelte.ts`]
- [ ] **T2.11** (ND-2.9) Never celebrate a stale/interrupted end as a completion: suppress the "finished" affordance when the host end is `status: 'interrupted'` (we already carry `interrupted` — harden and prove). A presumed-stale sweep is indistinguishable from a natural `idle` in our DTO, so mark the stale-end host end-reason `[~]` deferred (⚠️ → `007-host-requests`), not faked on the client. [files: `pages/chat/transcript/runtime-status-region.svelte`; ⚠️ host end-reason → `007-host-requests`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** (all) Fail-closed pass: assert no synthetic partial-text without a host running signal (5.2), no duplicate user turn when the host echo arrives over sync (5.3), no approval offered against a working agent (5.6), and that unknown-session / dropped-socket / revision-mismatch state stays visibly unresolved rather than promoted to success. [files: unit + `test:web` assertions over the PHASE 1 derivations and the send/approval paths]
- [ ] **T3.2** (all with CSS) token-identity resolves 0-diff across the themes — any CSS touched by the marker, empty-state, or lock-reason copy is value-preserving. [evidence target: `token-identity.mjs` diff vs the T1.4 baseline]
- [ ] **T3.3** (all) `test:web` is green from the final state, and a11y-parity is preserved: the runtime region stays polite, the send-failure channel is assertive and clears on the next accepted write, and the ask-card focus/roving order is unchanged. [evidence target: `test:web` pass; a11y-parity check]
- [ ] **T3.4** (all) Traceability + gate: every task maps to a rec number (5.1–5.8) and `validate.sh <packet> --strict` exits 0 through its realpath. [evidence target: task→rec table; `validate.sh` exit 0]
- [ ] **T3.5** (ND-2.6, ND-2.9, ND-6.8) Fold-in fail-closed pass: a late `running` inside the holdoff window after an end does not resurrect the turn — only an `epoch`/new-turn advance reopens it (ND-2.6); a retracted/cleared signal survives a reconnect/`sync.gap` without loss or resurrection (ND-6.8); a stale/interrupted end is not celebrated as a finish (ND-2.9); `test:web` is green and every folded task traces to its ND id. [evidence target: unit + `test:web` assertions; task→ND table]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All eight recs are implemented or proven-already-satisfied and traceable to a rec number; streaming is
peek-safe with the dots/partial-text split; the echo reconciles by host id with the draft restored on reject;
approval comes only from the host ticket under single-flight; one blocking prompt shows at a time; empty/
error copy is named and the send-failure channel is assertive; and the fail-closed pass, token-identity,
a11y-parity, and `test:web` are all green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the derivation-first approach and the per-rec surface map.
- `checklist.md` — the barrier sign-off.
- `../research/research.md` — Angle 5 (recs 5.1–5.8).
<!-- /ANCHOR:cross-refs -->
