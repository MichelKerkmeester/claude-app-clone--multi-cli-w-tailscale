---
title: "Phase 5 checklist — streaming & ask/permission hardening barrier"
description: "Barrier sign-off for the eight Angle-5 recs: fail-closed proof (no synthetic progress, no duplicate echo, no approval against a working agent, stale stays unresolved), one-blocking-prompt precedence, ticket-only approval under single-flight, named empty/error copy with an assertive send-failure channel, a11y-parity preserved, token-identity 0-diff, and test:web green — every barrier open until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/005-streaming-ask"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Wrote the barrier checklist for recs 5.1–5.8; all barriers open, nothing proven yet."
    next_safe_action: "Await operator go; barriers are proven only from the final implemented state."
    blockers: []
    completion_pct: 0
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
focus order survived. Nothing here is checked yet — this is a plan.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The three pure derivations (`hasStreamingTokens`, `inputLockReason`, `activeBlockingPrompt`) are specified with a fail-closed default before any surface is touched. [evidence: derivation signatures + unit tables]
- [ ] **CHK-PRE-02** [P0] The token-identity and `test:web` baselines are captured from the pre-change tree. [evidence: `token-identity.mjs` snapshot + `test:web` baseline counts]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] The working dots show only while running with no token block; once an assistant text block exists for the running turn, that partial text is the streaming indicator (5.2). [evidence: `hasStreamingTokens` states rendered]
- [ ] **CHK-CQ-02** [P0] The optimistic echo reconciles by host message id with no duplicate row, and the exact raw draft is restored on reject (5.3). [evidence: reconcile path + reject-restore assertion]
- [ ] **CHK-CQ-03** [P0] The input lock names its reason (waiting-for-lease vs disconnected), applies the 600 ms settle, and never revokes the editable textbox (5.4). [evidence: `inputLockReason` mapping + settle edge; editable always-on]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] token-identity resolves 0-diff across the themes — any touched CSS is value-preserving. [evidence: `token-identity.mjs` diff vs baseline — 0 CHANGED / 0 VANISHED / 0 ADDED]
- [ ] **CHK-TEST-02** [P0] `test:web` passes from the final state. [evidence: `test:web` pass counts vs baseline]
- [ ] **CHK-TEST-03** [P0] The three derivations have pure-function unit coverage for their fail-closed boundaries (running/no-token, transient/hard lock, Ask precedence). [evidence: unit results]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] Every one of the eight recs (5.1–5.8) is implemented or explicitly proven-already-satisfied, and the two deferred sub-items (5.3 image-preview cache, 5.5 multi-question wizard) are marked `[~]` with their host dependency. [evidence: task→rec table]
- [ ] **CHK-FIX-02** [P0] At most one blocking prompt renders at a time, Ask taking precedence; no heuristic prose-scrape prompt was introduced (5.7). [evidence: `activeBlockingPrompt` selector + overlay audit]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed holds: no synthetic partial-text without a host running signal (5.2), no approval offered against a working agent (paused-states guard, 5.6), and unknown-session / dropped-socket / revision-mismatch state stays visibly unresolved. [evidence: fail-closed pass over the send/approval paths]
- [ ] **CHK-SEC-02** [P0] The client owns no session truth: approval buttons come only from the host ticket, a pending message is never persisted as the session, and no new host field is invented on the client. [evidence: ticket-only render; no client-owned mutable session state added]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exits 0 through its realpath. [evidence: `validate.sh` exit 0]
- [ ] **CHK-DOC-02** [P1] No spec path or artifact id was introduced into any code comment (comment hygiene). [evidence: comment-hygiene scan clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] Changes stay within `pages/chat/**` and `pages/review/screen-review.svelte` (plus the read-only derivation + tests); the composer internals owned by `004-composer` are only consumed via props, not edited. [evidence: `git status` scoped diff]
- [ ] **CHK-ORG-02** [P2] The a11y region split is correct: the runtime status region stays polite, the send-failure channel is assertive and clears on the next accepted write, and the ask-card focus/roving order is unchanged (5.8, a11y-parity). [evidence: a11y-parity check]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned, not yet verified. On implementation, the eight Angle-5 recs are proven by a fail-closed pass (no
synthetic progress, no duplicate echo, no approval against a working agent, stale stays unresolved), a
one-blocking-prompt overlay audit, a ticket-only single-flight approval check, an a11y-parity check of the
polite/assertive region split and the ask-card focus order, token-identity at 0-diff, and `test:web` green —
all from the final state, with every task traced to its rec number.
<!-- /ANCHOR:summary -->
