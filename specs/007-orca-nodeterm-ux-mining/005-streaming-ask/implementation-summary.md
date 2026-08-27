---
title: "Phase 5 implementation summary — streaming & ask/permission hardening"
description: "Implemented the eight Angle-5 recs: peek-safe session-scoped streaming, the working-vs-streaming dots/partial-text split, optimistic-echo reconciliation by host message id with draft restore on reject, named input-lock reasons with a 600 ms settle, verified option-identity + out-of-card ask dismissal, ticket-driven single-flight approval, one blocking prompt at a time, and named empty/error copy with an assertive send-failure channel. All fail-closed proofs pass."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Fixed input-lock settle wiring and removed dead activeBlockingPrompt"
    next_safe_action: "Closeout: verify all gates pass"
    blockers: []
    completion_pct: 100
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
| Status | Implemented |
| Requirements implemented | REQ-001 … REQ-008 (recs 5.1–5.8) + ND-2.6, ND-2.9, ND-6.8 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Two pure derivations introduced under `shared/state/streaming-derivations.ts` — `hasStreamingTokens`, `inputLockReason` (with a 600 ms settle variant), and `holdOffLateRunning` (ND-2.6 done-holdoff). The `activeBlockingPrompt` precedence selector was dropped as redundant before wiring — the one-blocking-prompt invariant is enforced structurally by the route split in `+layout.svelte`. Each defaults fail-closed to the safe state.

Applied to surfaces:
- **Transcript list** (`transcript-list.svelte`): the animated dots (`streaming--marker`) now show only while running with no token block; once an assistant text block exists for the running turn, that partial text IS the streaming indicator. The synthetic marker is dropped when `hasStreamingTokens` is true.
- **Screen chat** (`screen-chat.svelte`): input-lock reason derived with settle, gating `canSubmit`/`canDispatchSlash`; the settle stamps `lastTransientAt` at the transient→cleared edge (not reconnect-start) and arms a reactive `setTimeout` for release; turn-end tracking with the done-holdoff applied to the `running` signal; assertive a11y channel for send failures (cleared on next accepted write).
- **Echo reconciliation** (`state.ts`): proven by test that `reconcilePromptAccepted` removes the optimistic block by id, deduplicates against a synced host echo, and `reconcilePromptRejected` clears the pending id.
- **Ask card** (`ask-question-ephemeral-store.ts`, `use-ask-question-state.svelte.ts`): verified answers by stable option id with out-of-card ephemeral draft; multi-question wizard deferred to `007-host-requests`.
- **Review screen** (`screen-review.svelte`): verified approval buttons render only from the host `ApprovalCardDto` under single-flight `pendingId` guard.
- **ND-2.6 done-holdoff**: applied in `screen-chat.svelte` via turn-end tracking effect and `holdOffLateRunning` derivation; a late `running` re-report within ~3 s of an end is held unless the epoch advances.
- **ND-6.8 edge survival**: reconciled edges (dismissed ask, stopped indicator, cleared send-failure) are held outside the ephemeral view and survive a reconnect/gap.
- **ND-2.9 interrupted-not-finished**: proven by test that `holdOffLateRunning` treats `interrupted` as an end; stale-end host reason deferred to `007-host-requests`.

Two deferred items: the image-preview cache (5.3, → `004-composer`/`007-host-requests`) and the multi-question ask wizard (5.5, → `007-host-requests`).

<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Derivation-first approach: three pure functions introduced under `shared/state/streaming-derivations.ts` with 34 unit tests, then applied to each owning surface. Three recs were hardened and proven rather than built new (5.3 echo reconciliation, 5.5 option-identity + out-of-card draft, 5.6 ticket-driven single-flight approval). Two were genuine gap-closers (5.2 partial-text split, 5.4 named lock reasons + settle with edge-stamp and reactive timer). The result was proven by a fail-closed pass (17 constraint tests), token-identity (35/35 PASS), a11y-parity check, and `test:web` green from the final state.

<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Reconcile the echo by host message id, not the client optimistic id alone (5.3).** The send path already replaces the optimistic block and restores the draft on reject. The existing `reconcilePromptAccepted` removes the optimistic block by its id and adds the host block; `normalizeBlocks` deduplicates by id across both sources. Tests prove no duplicate survives when the host echo arrives via sync delta before promptAccepted fires.

**Treat 5.5 as verification, and gate the wizard on the host.** The ask card already answers by stable option id (more robust than orca's numeric index) and holds its draft in a module-level ephemeral store outside the card, so the index-not-label and out-of-card-dismissal invariants are already met. The stepped multi-question wizard needs a host multi-question payload we do not have, so it is deferred to `007-host-requests`.

**Keep the composer Stop; do not fake progress.** For 5.2 the existing composer Stop is kept and the streaming marker is gated strictly on `running && !tokensPresent`, so no typing ghost appears when the host has not reported a running turn. The contrary condition (running + tokens present) means the assistant text block IS the streaming indicator.

**Reconcile status transitions with a done-holdoff and an edge-vs-self-correcting split (ND-2.6 / ND-6.8).** A `running` re-reported within the ~3 s done-holdoff of an end is held off unless an `epoch`/turn-boundary marks a new turn, so a stray post-`done` event never resurrects the turn. A retracted signal (dismissed ask, stopped indicator, cleared error) is an edge nothing re-announces, so it is held outside the ephemeral view and reconciled from the next snapshot.

<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Fail-closed pass | 17 constraint tests pass; no synthetic partial-text without running; no duplicate echo; no approval against stale agent; stale stays unresolved |
| One blocking prompt | Enforced structurally by the mutually-exclusive `{#if}`/`{:else if}` route split in `routes/+layout.svelte` (Review vs `{@render children()}`); no heuristic prose-scrape prompt exists |
| Ticket-only approval | Approve/deny come only from `ApprovalCardDto`; single-flight via `pendingId` guard |
| a11y-parity | Runtime region stays polite; send-failure channel assertive + clears on next accepted write; ask-card focus/roving unchanged |
| Token identity | 0 CHANGED / 0 VANISHED / 0 ADDED — 35/35 goldens matched |
| `test:web` | Logic 40 files/495 passed; svelte 76 files/607 passed/3 skipped |
| `validate.sh --strict` | all source gates PASS |
| Typecheck | 0 errors |
| Lint | 0 errors on changed files |

---

### Files changed

**New files:**
- `app-mobile/src/shared/state/streaming-derivations.ts` — three pure derivations
- `app-mobile/tests/streaming-derivations.test.ts` — 34 unit tests
- `app-mobile/tests/streaming-constraint.test.ts` — 17 constraint tests

**Edited files:**
- `app-mobile/src/pages/chat/transcript/transcript-list.svelte` — streaming marker gated on `running && !tokensPresent`
- `app-mobile/src/pages/chat/screen-chat.svelte` — turn-end tracking, input-lock derivation, assertive a11y channel
- `app-mobile/tests/app.svelte.test.ts` — tightened `findAllByText` assertions to also confirm the visible `.inline-alert` banner; added input-lock settle component test with fake timers (locked-during-window, released-after)
- `app-mobile/tests/transcript-placement.svelte.test.ts` — adjusted stall test data for new streaming marker condition

<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two sub-items are gated on the host and are not built in this phase: the image-preview-kept-until-host-URI cache of 5.3 depends on paste-image and its media lease (`004-composer` / `007-host-requests`), and the stepped multi-question ask wizard of 5.5 depends on a host multi-question grouping payload (`007-host-requests`). Both are planned as gated tasks. The partial-text indicator (5.2) is only as granular as the host's revisioned assistant text blocks — it is not a per-token typing animation, by design, because faking token-level progress the host never reported would violate fail-closed. A presumed-stale end is also indistinguishable from a natural `idle` in our DTO, so distinguishing it needs a host end-reason (ND-2.9, ⚠️ → `007-host-requests`); `interrupted` already suppresses a false "finished" celebration, so only the stale-sweep case is deferred.
<!-- /ANCHOR:limitations -->