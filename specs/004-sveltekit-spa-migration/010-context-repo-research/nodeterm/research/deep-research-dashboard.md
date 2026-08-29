---
title: Deep Research Dashboard
description: Auto-generated reducer view over the research packet.
---

# Deep Research Dashboard - Session Overview

Auto-generated from JSONL state log, iteration files, findings registry, and strategy state. Never manually edited.

<!-- ANCHOR:overview -->
## 1. OVERVIEW

Reducer-generated observability surface for the active research packet.

<!-- /ANCHOR:overview -->
<!-- ANCHOR:status -->
## 2. STATUS
- Topic: Mine specs/context/nodeterm-main (READ-ONLY) for adoptable patterns for the Pi Remote SvelteKit mobile PWA; full angles in specs/004-sveltekit-spa-migration/010-context-repo-research/nodeterm/charter.md
- Started: 2026-08-23T00:03:42Z
- Status: INITIALIZED
- Iteration: 10 of 10
- Session ID: dr-20260823-000127
- Parent Session: none
- Lifecycle Mode: new
- Generation: 1
- continuedFromRun: none

<!-- /ANCHOR:status -->
<!-- ANCHOR:progress -->
## 3. PROGRESS

| # | Focus | Track | Ratio | Findings | Status |
|---|-------|-------|-------|----------|--------|
| 1 | KQ1 [architecture] FrameTransport/RPC carrier abstraction | architecture | 1.00 | 7 | complete |
| 2 | KQ6 [ux] mirror/inbox data contract: MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow; event production, title/dedup, resolve/archive, live-card, quick-approve | ux | 1.00 | 6 | complete |
| 3 | KQ5 [ease-of-use] hook-reply Approve/Deny producer half: per-decision answer files, pendingId generation + PENDING_ID_RE validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send guard | ease-of-use | 1.00 | 7 | complete |
| 4 | KQ7 [ux] drop resilience: connected/connecting/offline model, takeSessionOffline reconnect-in-place, ready()-can-hang race fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps | ux | 0.93 | 7 | complete |
| 5 | KQ8 [ease-of-use] push-notification decisioning | - | 0.00 | 0 | error |
| 6 | KQ8 [ease-of-use] push-notification decisioning: batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation | ease-of-use | 1.00 | 9 | complete |
| 7 | KQ3 [logic] reduceEntry status state machine (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields) | logic | 1.00 | 7 | complete |
| 8 | KQ4 [logic] universal event shape + live transcript tails (NormalizedAgentEvent + per-agent normalizers vs __fixtures__ raw formats; transcript-index-core, transcript-reader, subagent-tail, context-tail, activity-string derivation) | logic | 0.93 | 7 | complete |
| 9 | KQ2 [security] E2EE relay security envelope: NaCl box, HKDF per-session keys, sealed [role][seq][tag] header, seq anti-replay, role check, no-re-key + peer-key pin, SAS mutual approval, approval-from-ciphertext-only | security | 1.00 | 9 | complete |
| 10 | CLOSE-OUT: direct-read relay-socket.ts + relay-client.ts upgrading iteration-9 doc-transcribed KQ2 enforcement points (sealed [role][seq][tag] header, role-byte-equals-peer, seq anti-replay recvSeq=-1 drop<=, handshake-frozen-after-ready, exactly-once processing, keepalive/timing constants) to primary file:line citations | security | 0.75 | 6 | complete |

- iterationsCompleted: 10
- keyFindings: 65
- openQuestions: 1
- resolvedQuestions: 7

<!-- /ANCHOR:progress -->
<!-- ANCHOR:questions -->
## 4. QUESTIONS
- Answered: 7/8
- [x] KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- [x] KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- [x] KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- [x] KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)?
- [x] KQ6 [ux] What data contract (MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow) powers the mobile companion screen, and what are its event production, title/dedup, resolve/archive, live-card, and quick-approve rules?
- [x] KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)?
- [x] KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?
- [ ] KQ1 [architecture] How does nodeterm drive one agent core over three carriers (Electron preload, browser WebSocket, E2EE relay tunnel) behind a single RpcClient/FrameTransport contract, and what is the exact transport interface, frame discrimination, in-flight failure, and RPC envelope shape? [angle-bank]

<!-- /ANCHOR:questions -->
<!-- ANCHOR:uncovered-questions -->
## Uncovered Questions
- Count: 1
- [ ] KQ1 [architecture] How does nodeterm drive one agent core over three carriers (Electron preload, browser WebSocket, E2EE relay tunnel) behind a single RpcClient/FrameTransport contract, and what is the exact transport interface, frame discrimination, in-flight failure, and RPC envelope shape?

<!-- /ANCHOR:uncovered-questions -->
<!-- ANCHOR:trend -->
## 5. TREND
- newInfoRatio sparkline: ███████▅▂▃▆███████▇▆
- score sparkline: ███████▅▂▃▆███████▇▆
- Last 3 ratios: 0.93 -> 1.00 -> 0.75
- Stuck count: 1
- Guard violations: none recorded by the reducer pass
- convergenceScore: 0.75
- coverageBySources: {"code":39,"other":54}
- Advisory events: none

<!-- /ANCHOR:trend -->
<!-- ANCHOR:dead-ends -->
## 6. DEAD ENDS
- None. All three named sources were readable and mutually consistent. (iteration 2)
- Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit. (iteration 2)
- Treating `PresenceHub` as the push-presence signal: the code shows push deferral keys on an injected desktop powerMonitor idle/lock present→away edge (`isUserPresent`/`subscribePresence` deps), not the team-presence peer table; hub.ts/presence.ts contribute adjacent adoptable patterns (token buckets, clearing-cast exemption, entry-point rate limiting) recorded under F-04. [SOURCE: specs/context/nodeterm-main/src/core/push-notify.ts:207-222] (iteration 6)
- Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end. (iteration 7)
- **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source. (iteration 9)
- **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases. (iteration 9)
- Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration. (iteration 10)
- Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06). (iteration 10)

<!-- /ANCHOR:dead-ends -->
<!-- ANCHOR:divergent-pivots -->
## 6A. DIVERGENT PIVOTS
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergent-pivots -->
<!-- ANCHOR:next-focus -->
## 7. NEXT FOCUS
None — all eight key questions answered.

<!-- /ANCHOR:next-focus -->
<!-- ANCHOR:active-risks -->
## 8. ACTIVE RISKS
- None active beyond normal research uncertainty.

<!-- /ANCHOR:active-risks -->
<!-- ANCHOR:blocked-stops -->
## 9. BLOCKED STOPS
No blocked-stop events recorded.

<!-- /ANCHOR:blocked-stops -->
<!-- ANCHOR:graph-convergence -->
## 10. GRAPH CONVERGENCE
- graphConvergenceScore: 0.73
- graphDecision: STOP_BLOCKED
- graphBlockers: none recorded

<!-- /ANCHOR:graph-convergence -->
