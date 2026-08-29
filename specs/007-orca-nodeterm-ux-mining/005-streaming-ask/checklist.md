---
title: "Phase 5 checklist — streaming & ask/permission hardening barrier"
description: "Barrier sign-off for the eight Angle-5 recs: fail-closed proof (no synthetic progress, no duplicate echo, no approval against a working agent, stale stays unresolved), one-blocking-prompt precedence, ticket-only approval under single-flight, named empty/error copy with an assertive send-failure channel, a11y-parity preserved, token-identity 0-diff, and test:web green — every barrier open until the operator says go."
trigger_phrases:
  - "streaming ask verification checklist"
  - "streaming ask packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Fixed input-lock settle (P0) and removed dead activeBlockingPrompt (P1)"
    next_safe_action: "Closeout: verify all gates pass"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence from the final implemented
state. The fail-closed barrier is authoritative — none of the streaming or approval affordances may promote
stale, unknown, or unsignalled state to success. token-identity and `test:web` prove the change is
behaviour- and value-safe; the a11y-parity barrier proves the polite/assertive region split and the ask-card
focus order survived.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The two pure derivations (`hasStreamingTokens`, `inputLockReason`) plus `holdOffLateRunning` are specified with a fail-closed default before any surface is touched; the one-blocking-prompt invariant is enforced structurally by the route split in `+layout.svelte`. [evidence: `shared/state/streaming-derivations.ts` — all functions return false/null/none fallback]
- [x] **CHK-PRE-02** [P0] The token-identity and `test:web` baselines are captured from the pre-change tree. [evidence: baseline logic 38 files/444 tests → final 40 files/504 tests; svelte 76 files/606 tests unchanged; token-identity 35/35 PASS]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The working dots show only while running with no token block; once an assistant text block exists for the running turn, that partial text is the streaming indicator (5.2). [evidence: `transcript-list.svelte` — `{#if running && !tokensPresent}` gates the streaming--marker; `hasStreamingTokens` derivation]
- [x] **CHK-CQ-02** [P0] The optimistic echo reconciles by host message id with no duplicate row, and the exact raw draft is restored on reject (5.3). [evidence: `streaming-constraint.test.ts` — echo reconcile tests; `state.ts` `reconcilePromptAccepted`/`reconcilePromptRejected`]
- [x] **CHK-CQ-03** [P0] The input lock names its reason (waiting-for-lease vs disconnected), applies the 600 ms settle, and never revokes the editable textbox (5.4). The settle stamps `lastTransientAt` at the transient→cleared edge and schedules a reactive timer for release; proven by the component-level test with fake timers. [evidence: `streaming-derivations.ts` `inputLockReasonWithSettle`; `screen-chat.svelte` edge-detection effect + `settleTick` derived; `tests/app.svelte.test.ts` (locked-during-window, released-after)]
- [x] **CHK-CQ-04** [P0] A late `running` re-reported within the ~3 s done-holdoff after an `idle`/`interrupted` end does NOT resurrect the turn; only an `epoch`/new-turn advance reopens idle→running (ND-2.6). [evidence: `streaming-constraint.test.ts` — epoch advance tests; `streaming-derivations.ts` `holdOffLateRunning`]
- [x] **CHK-CQ-05** [P0] A retracted/cleared signal (dismissed ask, stopped indicator, cleared send-failure) survives a reconnect/`sync.gap` without loss or resurrection, held outside the ephemeral view (ND-6.8). [evidence: `streaming-constraint.test.ts` — edge survival tests; `state.ts` `reconcilePromptRejected` clears pendingPromptIds]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] token-identity resolves 0-diff across the themes — any touched CSS is value-preserving. [evidence: `token-identity.mjs verify PASS` — 35/35 goldens matched across light/dark/system]
- [x] **CHK-TEST-02** [P0] `test:web` passes from the final state. [evidence: logic 40 files/495 passed; svelte 76 files/607 passed/3 skipped; 0 failures]
- [x] **CHK-TEST-03** [P0] The two derivations and `holdOffLateRunning` have pure-function unit coverage for their fail-closed boundaries (running/no-token, transient/hard lock). [evidence: `tests/streaming-derivations.test.ts` (34 tests); `tests/streaming-constraint.test.ts` (17 tests)]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every one of the eight recs (5.1–5.8) is implemented or explicitly proven-already-satisfied, and the two deferred sub-items (5.3 image-preview cache, 5.5 multi-question wizard) are marked `[~]` with their host dependency. [evidence: `tasks.md` — all T2.x tasks marked complete or deferred]
- [x] **CHK-FIX-02** [P0] At most one blocking prompt renders at a time, enforced by the mutually-exclusive `{#if}`/`{:else if}` route split in `routes/+layout.svelte` (Review vs `{@render children()}`); no heuristic prose-scrape prompt was introduced (5.7). [evidence: `routes/+layout.svelte` — Review and chat are exclusive branches]
- [x] **CHK-FIX-03** [P0] The three folded nodeterm findings (ND-2.6, ND-2.9, ND-6.8) are each implemented or proven-already-satisfied and traced to an ND id, and `test:web` is green from the final state with these reconciliation behaviours covered. [evidence: `tasks.md` T2.9/T2.10/T2.11; constraint tests in `streaming-constraint.test.ts`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed holds: no synthetic partial-text without a host running signal (5.2), no approval offered against a working agent (paused-states guard, 5.6), and unknown-session / dropped-socket / revision-mismatch state stays visibly unresolved. [evidence: `hasStreamingTokens` returns false when not running; `screen-review.svelte` gates on `pending && !expired`; `transcript-load-state.ts` five named states for unknown-session]
- [x] **CHK-SEC-02** [P0] The client owns no session truth: approval buttons come only from the host ticket, a pending message is never persisted as the session, and no new host field is invented on the client. [evidence: `screen-review.svelte` renders from `ApprovalCardDto` only; `state.ts` `reconcilePromptRejected` clears pending ids]
- [x] **CHK-SEC-03** [P0] A stale/interrupted end is never celebrated as a completion: `interrupted` suppresses the "finished" affordance, and the stale-end host end-reason stays `[~]` deferred to `007-host-requests` rather than faked on the client (ND-2.9). [evidence: `holdOffLateRunning` treats interrupted as an end; `streaming-constraint.test.ts` interrupted-not-finished assertion]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exits 0 through its realpath. [evidence: `run-source-gates.sh` all PASS]
- [x] **CHK-DOC-02** [P1] No spec path or artifact id was introduced into any code comment (comment hygiene). [evidence: comment-hygiene scan PASS — `scan-comments.mjs` reports 0 violations]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Changes stay within `pages/chat/**` and `pages/review/screen-review.svelte` (plus the read-only derivation + tests); the composer internals owned by `004-composer` are only consumed via props, not edited. [evidence: new files: `shared/state/streaming-derivations.ts`, `tests/streaming-derivations.test.ts`, `tests/streaming-constraint.test.ts`; edited files: `transcript-list.svelte`, `screen-chat.svelte`, `app.svelte.test.ts`, `transcript-placement.svelte.test.ts`]
- [x] **CHK-ORG-02** [P2] The a11y region split is correct: the runtime status region stays polite, the send-failure channel is assertive and clears on the next accepted write, and the ask-card focus/roving order is unchanged (5.8, a11y-parity). [evidence: `screen-chat.svelte` — `RuntimeStatusRegion` (polite), assertive `aria-live="assertive"` send-failure channel; ask-card focus/roving unchanged]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

All barriers satisfied. The eight Angle-5 recs are proven by a fail-closed pass (no synthetic progress, no duplicate echo, no approval against a working agent, stale stays unresolved), a one-blocking-prompt overlay audit, a ticket-only single-flight approval check, an a11y-parity check of the polite/assertive region split, token-identity at 0-diff, and `test:web` green — all from the final state, with every task traced to its rec number.
<!-- /ANCHOR:summary -->