---
title: Deep Research Strategy - Nodeterm Adoptable Patterns for Pi Remote
description: Session tracking for the deep-research loop mining specs/context/nodeterm-main for patterns adoptable by the Pi Remote SvelteKit mobile PWA.
trigger_phrases:
  - "deep research strategy"
  - "nodeterm pattern mining"
  - "Pi Remote research session"
importance_tier: normal
contextType: planning
version: 1.14.0.19
---

# Deep Research Strategy - Session Tracking

Runtime tracking file for `{spec_folder}/research/`. Read by the orchestrator and agents at every iteration. Machine-owned sections are rewritten by the reducer after each iteration; analyst-owned sections remain stable.

## 1. OVERVIEW

### Purpose

Persistent brain for this deep-research session: what to investigate, what worked, what failed, where to focus next.

### Usage

- **Init:** Orchestrator populated Topic, Key Questions, Known Context, and Research Boundaries from config and the research charter.
- **Per iteration:** Agent reads Next Focus, writes iteration evidence, and the reducer refreshes machine-owned sections.
- **Mutability:** Mutable — analyst-owned sections stable; Section 3 is a generated projection from the reducer registry.
- **Protection:** Shared state with explicit ownership boundaries.

### Question Injection Surface

Append external questions to `{spec_folder}/research/inbox.jsonl` (one JSON object per line: `id`, `text`, `source`, `origin`, `injectedAtIteration`, `promotedQuestionId`). The reducer reads the inbox on every reduce step; direct edits to Section 3 are imported as `legacy-import` compatibility input.

---

## 2. TOPIC

Mine specs/context/nodeterm-main (READ-ONLY) for adoptable patterns for the Pi Remote SvelteKit mobile PWA; full angles in specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/charter.md

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
- [ ] KQ1 [architecture] How does nodeterm drive one agent core over three carriers (Electron preload, browser WebSocket, E2EE relay tunnel) behind a single RpcClient/FrameTransport contract, and what is the exact transport interface, frame discrimination, in-flight failure, and RPC envelope shape?
- [x] KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- [x] KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- [x] KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- [x] KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)?
- [x] KQ6 [ux] What data contract (MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow) powers the mobile companion screen, and what are its event production, title/dedup, resolve/archive, live-card, and quick-approve rules?
- [x] KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)?
- [x] KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?

<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS

From charter.md: on-device inference, native modules, and anything platform-specific that does not transfer to a web PWA. Never modify specs/context/** (READ-ONLY target). Findings only — no code changes in any repo; implementation planning happens in later packets.

---

## 5. STOP CONDITIONS

- Composite convergence: newInfoRatio < 0.05 per charter, subject to the inline 3-signal vote plus graph convergence gates and the min-3-iterations floor.
- Iteration cap: 10 iterations (maxIterationsReached bypasses quality-guard overrides).
- Stuck recovery after 3 consecutive no-progress iterations; pause sentinel `research/.deep-research-pause` halts for operator input.

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)?
- KQ6 [ux] What data contract (MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow) powers the mobile companion screen, and what are its event production, title/dedup, resolve/archive, live-card, and quick-approve rules?
- KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)?
- KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?

<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
- reading the six named files in two batched passes gave complete coverage of the carrier seam in 8 tool calls; the files' own design comments carry the rationale (failPending ordering, undef security reasoning, construction-order gotcha), so findings cite primary intent, not inference. (iteration 1)
- reading the protocol doc FIRST gave the contract vocabulary, then the implementation pass verified every documented rule against code and surfaced the undocumented halves (stash-priority classification, bounded dedup, restart persistence, protected trim, mid-turn end edges) that live only in code comments — two batched passes covered 2000+ lines within budget. (iteration 2)
- reading the contract doc FIRST then verifying against code repeated iteration 2's winning sequence — every documented rule (atomic write, fail-open, sweep ages, askKind stripping) was confirmed at specific lines, and the code-only halves (syntheticAnsweredEvent optimism, Object.hasOwn prototype-hole guard, derived UI copy) surfaced where the doc is silent. One grep pass mapped three files' relevant regions before any read, keeping total calls at 12. (iteration 3)
- reading the four files in full (all under 300 lines) gave complete, line-cited coverage in a single batched pass; the code's own design comments carry the rationale (hang-trap history, proxy-timeout sizing, DoS math), so findings cite primary intent rather than inference — the same pattern that won iterations 1-3. (iteration 4)
- the batched full-read of six modest files (all ≤750 lines) in one parallel pass repeated the winning pattern of iterations 1–4 — nodeterm's design comments carry the rationale (union-targeting history, DECSET-2004 measurement, TS_UNIT invariant), so findings cite primary intent at specific lines rather than inference, and the whole answer fit in 11 of 12 tool calls. (iteration 6)
- the batched full-read of all four named files in one parallel pass (the pattern that won iterations 1-6) again gave complete, line-cited coverage — nodeterm's design comments carry the rationale (parallel-hook history, the duplicate-APNs field bug, the codex 0.145.0 live observation), so findings cite primary intent rather than inference. (iteration 7)
- the batched full-read of six modest files in two parallel passes (the pattern that won iterations 1–7) again gave complete line-cited coverage in 9 of 12 calls — nodeterm's design comments carry the rationale (torn-multibyte carries, denominator honesty, non-blacklisting meta retries), so findings cite primary intent rather than inference. (iteration 8)
- the batched full-read pattern that won iterations 1–8 again covered all five sources in a single parallel pass (5 of 12 calls), and nodeterm's own SECURITY comments carried the rationale — the relay-trust.ts and mutual-approval-core.ts header blocks state the exact degradation attack each rule prevents, so findings cite primary intent at specific lines instead of inference. Reading the four small code files before the doc meant the doc functioned as a cross-check (zero contradictions found) rather than a substitute. (iteration 9)
- the narrowest-reread discipline — reading only the two named source files plus the iteration-9 narrative (4 research calls) gave complete comparison coverage, because the doc-transcribed claims were already precisely anchored in the packet, so the direct reads only had to confirm or correct against known line ranges. Reading both files in FULL (not just the cited ranges) is what surfaced the two genuinely new evidence clusters (exactly-once mechanics, dead-code reconnect table) that a range-only read would have missed. (iteration 10)

<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
- nothing failed; ws-bridge.ts lines 400-907 (remaining builders) were left unread as redundant with relay-api.ts's assembly view — noted for KQ7 if heartbeat/backpressure live there. (iteration 1)
- nothing failed; the only friction was the file's 50 KB read cap requiring a second offset read (planned for, budget held). (iteration 2)
- nothing failed. Budget pressure was real: the 12-call cap forced folding the permissionMode.ts read into grep line-evidence instead of a full read — acceptable because the resolver's load-bearing behavior (claude-only gate, SSH branch) is visible in the matched lines and pinned by its test file's assertions in the same output. (iteration 3)
- nothing failed. Budget was tight enough that `backpressure.test.ts` had to be deferred; acceptable because the load-bearing constants and their rationale live in `ws.ts` itself. (iteration 4)
- nothing failed. Minor friction: two of the six named files (presence hub/shared) turned out to be adjacent rather than core to KQ8's presence semantics — the actual deferral signal lives in shell wiring referenced only by dep comments; recognized mid-read and scoped honestly instead of forcing a presence-hub narrative. (iteration 6)
- nothing failed; the only friction was the 50 KB read cap splitting the mirror file, which was planned for and absorbed by one offset continuation. (iteration 7)
- nothing failed; the only adjustment was re-reading `normalize.ts` narrowly (interface + signatures via grep) instead of a full re-read, since iteration 7 already documented its field semantics. (iteration 8)
- the focus list's inclusion of framing.ts cost one read that yielded no security layer — it is the deleted legacy dialect; and the budget left relay-socket.ts/relay-client.ts unread, so four enforcement points cite the doc's byte-for-byte transcription rather than primary code. (iteration 9)
- nothing failed. The only friction was budget arithmetic at the hard cap of 12 calls, resolved by batching the boundary check with the source reads. (iteration 10)

<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
### **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source. -- BLOCKED (iteration 9, 1 attempts)
- What was tried: **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source.

### **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases. -- BLOCKED (iteration 9, 1 attempts)
- What was tried: **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases.

### None. All three named sources were readable and mutually consistent. -- BLOCKED (iteration 2, 1 attempts)
- What was tried: None. All three named sources were readable and mutually consistent.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: None. All three named sources were readable and mutually consistent.

### Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit. -- BLOCKED (iteration 2, 1 attempts)
- What was tried: Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit.

### Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end. -- BLOCKED (iteration 7, 1 attempts)
- What was tried: Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end.

### Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration. -- BLOCKED (iteration 10, 1 attempts)
- What was tried: Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration.

### Treating `PresenceHub` as the push-presence signal: the code shows push deferral keys on an injected desktop powerMonitor idle/lock present→away edge (`isUserPresent`/`subscribePresence` deps), not the team-presence peer table; hub.ts/presence.ts contribute adjacent adoptable patterns (token buckets, clearing-cast exemption, entry-point rate limiting) recorded under F-04. [SOURCE: specs/context/nodeterm-main/src/core/push-notify.ts:207-222] -- BLOCKED (iteration 6, 1 attempts)
- What was tried: Treating `PresenceHub` as the push-presence signal: the code shows push deferral keys on an injected desktop powerMonitor idle/lock present→away edge (`isUserPresent`/`subscribePresence` deps), not the team-presence peer table; hub.ts/presence.ts contribute adjacent adoptable patterns (token buckets, clearing-cast exemption, entry-point rate limiting) recorded under F-04. [SOURCE: specs/context/nodeterm-main/src/core/push-notify.ts:207-222]
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating `PresenceHub` as the push-presence signal: the code shows push deferral keys on an injected desktop powerMonitor idle/lock present→away edge (`isUserPresent`/`subscribePresence` deps), not the team-presence peer table; hub.ts/presence.ts contribute adjacent adoptable patterns (token buckets, clearing-cast exemption, entry-point rate limiting) recorded under F-04. [SOURCE: specs/context/nodeterm-main/src/core/push-notify.ts:207-222]

### Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06). -- BLOCKED (iteration 10, 1 attempts)
- What was tried: Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06).

<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
- None. All three named sources were readable and mutually consistent. (iteration 2)
- Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit. (iteration 2)
- Treating `PresenceHub` as the push-presence signal: the code shows push deferral keys on an injected desktop powerMonitor idle/lock present→away edge (`isUserPresent`/`subscribePresence` deps), not the team-presence peer table; hub.ts/presence.ts contribute adjacent adoptable patterns (token buckets, clearing-cast exemption, entry-point rate limiting) recorded under F-04. [SOURCE: specs/context/nodeterm-main/src/core/push-notify.ts:207-222] (iteration 6)
- Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end. (iteration 7)
- **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source. (iteration 9)
- **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases. (iteration 9)
- Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration. (iteration 10)
- Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06). (iteration 10)

<!-- /ANCHOR:ruled-out-directions -->

---

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergence-frontier -->

---

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS
- KQ5 (hook-reply approvals) (iteration 1)
- KQ7 (drop resilience: heartbeat/reap, backpressure, frame caps — partially seeded by F3) (iteration 1)
- KQ4 (event normalization/transcript tails) (iteration 1)
- KQ2 (E2EE security layers) (iteration 1)
- KQ8 (push-notification decisioning) (iteration 1)
- KQ3 (reduceEntry status machine) (iteration 1)
- KQ6 (mirror/inbox data contract) (iteration 1)
- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)? (iteration 2)
- KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)? (iteration 2)
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill? (iteration 2)
- KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)? (iteration 2)
- KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)? (iteration 2)
- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat? (iteration 2)
- None. All 8 key questions are now answered (KQ2 closed this iteration; KQ1/3/4/5/6/7/8 closed in iterations 1–8). (iteration 9)
- None — all eight key questions answered. (iteration 10)

<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
None — all eight key questions answered.

<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT

None (memory_context unavailable at init; daemon cold — exit 75).

resource-map.md not present; skipping coverage gate.

### Bounded Context Snapshot

- Source pointers: charter.md enumerates per-angle extract/where lists under specs/context/nodeterm-main (src/renderer/bridge/*, src/main/remote/*, src/core/*, src/shared/*, src/server/ws.ts, docs/*).
- Reuse candidates: nodeterm patterns only — findings feed later Pi Remote planning packets, not direct reuse.
- Integration points: research/iterations/, research/deltas/, research/research.md (workflow-owned); spec.md Open Questions anchor.
- Constraints and risks: specs/context/nodeterm-main is READ-ONLY (REQ-003); per-iteration budget 12 tool calls / 10 minutes; citations must be file:line.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 10
- Convergence threshold: 0.05
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true (default)
- research/research.md ownership: workflow-owned canonical synthesis output
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred, not runtime-wired)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A, including Section 10A pivot lineage
- Question injection surface: `{spec_folder}/research/inbox.jsonl`
- Question conflict owner: reducer registry; `question_conflict` events surface inbox/registry disagreements for operator decision
- Canonical pause sentinel: `research/.deep-research-pause`
- Capability matrix: `.opencode/skills/system-deep-loop/deep-research/assets/runtime-capabilities.json`
- Capability matrix doc: `.opencode/skills/system-deep-loop/deep-research/references/guides/capability-matrix.md`
- Capability resolver: `.opencode/skills/system-deep-loop/deep-research/scripts/runtime-capabilities.cjs`
- Current generation: 1
- Started: 2026-08-23T00:03:42Z
