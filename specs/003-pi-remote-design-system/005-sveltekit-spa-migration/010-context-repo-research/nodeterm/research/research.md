# Nodeterm Adoptable-Pattern Research for Pi Remote — Synthesis

<!-- BEGIN GENERATED: deep-research/research-md -->
Workflow-owned canonical synthesis. Compiled from 10 loop iterations (9 productive, 1 dispatch error) over the READ-ONLY target `specs/context/nodeterm-main`. Every finding cites target file:line and carries a Pi Remote PWA adoption note in its source iteration; this document consolidates them.

---

## 1. Executive Summary

Nodeterm solves the same remote-agent-control problem as Pi Remote (desktop/server/mobile trio over unreliable carriers) and has shipped production answers for every charter angle. Ten iterations mined 65 cited findings across eight questions (KQ1–KQ8), all answered on primary-source evidence:

- **Carrier abstraction (KQ1):** a four-method `FrameTransport` seam lets one agent core ride Electron IPC, browser WebSocket, or an E2EE relay tunnel with zero feature-code awareness.
- **Relay security (KQ2):** nine composed layers — NaCl box AE, per-session HKDF keys, sealed `[role][seq][tag]` header, anti-reflection role check, monotonic seq anti-replay, handshake freeze, out-of-band SAS mutual approval, approval-from-ciphertext-only, endianness discipline — each mapped to the specific attack it defeats.
- **Status logic (KQ3):** a guarded `reduceEntry` state machine (DONE_HOLDOFF, stale sweeper, interrupt inference, awaitingInput hold, idle rescue, newTurn gating) reduces raw hook events without race-condition flips.
- **Event normalization (KQ4):** one `NormalizedAgentEvent` union plus six per-agent normalizers absorb Claude/Codex/Gemini/Copilot/opencode/Grok dialects; capped transcript tails stream subagent fan-out and context fill.
- **Approvals (KQ5):** deterministic hold-hook + answer-file tickets replace keystroke injection, with path-traversal-proof ids, fail-open timeouts, and askKind-aware UX.
- **Mobile inbox (KQ6):** an additive `MirrorFile` side-channel with hard caps, title-based dedup, host-owned resolution, and live-card activity strings powers the companion screen.
- **Drop resilience (KQ7):** three-state session model, reconnect-in-place bookmarks, `ready()`-hang races, server-side heartbeat/reap, and frame caps keep remote sessions usable across drops.
- **Push decisioning (KQ8):** batch window, per-node throttle, presence-aware hold queue, capability-file grants, and deliver-on-idle queues decide when the phone should ring.

**Bottom line for Pi Remote:** adopt the FrameTransport seam, the RPC envelope (including `undef`), the answer-file approval contract, the mirror/inbox shape, and the push decisioning skeleton nearly verbatim; adopt the E2EE layer stack if/when a relay carrier enters scope; adopt the status-machine guards wholesale behind any webhook-driven status surface.

---

## 2. Research Charter & Method

- **Target:** `specs/context/nodeterm-main` (READ-ONLY; REQ-003 zero-write constraint held — no scope violations in any iteration).
- **Charter:** 8 angles (architecture, security, 2× logic, 2× ease-of-use, 2× ux) enumerated in `charter.md`.
- **Loop:** native deep-research LEAF dispatches, fresh context per iteration, externalized JSONL/delta state, mechanical post-dispatch verification (`iterations/iteration-001..010.md`, `deltas/iter-*.jsonl`).
- **Method pattern that won:** batched full reads of small focused files; doc-first ordering (protocol docs give vocabulary, code verifies and surfaces undocumented halves); design comments cite primary intent rather than inference.
- **Budgets honored:** ≤12 tool calls per iteration (one documented 13-call overrun in iteration 3, flagged by the leaf); READ-ONLY target untouched throughout.

---

## 3. Adoption Overview

| # | Pattern | Source (nodeterm) | PWA fit | Adoptability |
|---|---------|-------------------|---------|--------------|
| 1 | `FrameTransport` four-method seam + `ready()` gate | bridge/frame-transport.ts:13-22 | Native browser WS | **Adopt verbatim** |
| 2 | RPC envelope req/cast/res/ev + id correlation + `undef` indexes | shared/rpc.ts:6-77 | Direct | **Adopt verbatim** |
| 3 | Fail-pending-before-overlay on carrier close (`E_DISCONNECTED`) | bridge/ws-bridge.ts:88-114 | Critical on cellular | **Adopt verbatim** |
| 4 | Early-event replay buffer (capped, flush-on-first-subscribe) | bridge/ws-bridge.ts:78-81,152-199 | Svelte store mount race | **Adopt** |
| 5 | Typed stub api w/ `satisfies` completeness gate | bridge/stubs.ts | Desktop-only capabilities | **Adopt pattern** |
| 6 | Per-member routing table (core-bound vs app-global vs typed refusal) | relay-api.ts:10-19 | Multi-surface API assembly | **Adopt pattern** |
| 7 | E2EE relay layer stack (9 layers, attack-mapped) | main/remote/*, ios-protocol-migration.md | WebCrypto-native pieces | **Adopt when relay scope opens** |
| 8 | Status guards: DONE_HOLDOFF / sweeper / interrupt inference / awaitingInput hold | renderer/state/agentStatus.ts, core/agent-status-mirror.ts | Any webhook-fed status | **Adopt wholesale** |
| 9 | `NormalizedAgentEvent` union + per-provider normalizers + fixtures | shared/agents/normalize.ts | Single-agent MVP first | **Adopt shape now, extra agents later** |
| 10 | Capped transcript tails (byte-offset, tear-safe carries) | core/subagent-tail.ts, context-tail.ts | Server-side tailing | **Adopt** |
| 11 | Hold-hook + answer-file approvals (`pendingId`, PENDING_ID_RE) | core/agents/pending-approvals.ts | Decision tickets over HTTP | **Adopt verbatim** |
| 12 | askKind enrichment at production time (strip pendingId on questions) | core/agent-status-mirror.ts:1189-1236 | Kills wrong-action bugs | **Adopt** |
| 13 | Additive versioned MirrorFile side-channel w/ hard caps | docs/mobile-usage-inbox.md, agent-status-mirror.ts | Poll-based PWA feed | **Adopt verbatim** |
| 14 | Title-based bounded dedup w/ restart persistence | agent-status-mirror.ts:1329-1372 | Notification dedup | **Adopt** |
| 15 | Re-read-before-send quick actions | mobile-usage-inbox.md:135-140 | High-latency guard | **Adopt** |
| 16 | Three-state session model + reconnect-in-place bookmarks | renderer/session/session.ts, relay-tab.ts | Connection layer | **Adopt** |
| 17 | `Promise.race([ready, closeSignal, timeout])` hang fix | relay-tab.ts:183-212 | All handshakes | **Adopt verbatim** |
| 18 | Server-side heartbeat/reap (30 s ping, one-miss terminate) | server/ws.ts:24-33,126-146 | Pi backend link | **Adopt** |
| 19 | Explicit `maxPayload` frame cap + Origin check | server/ws.ts:35-54,80-102 | DoS guard | **Adopt** |
| 20 | Push: shared actionable seam, 2 s batch, 5 s/node throttle, presence hold queue | core/push-notify.ts | Web-push decisioning | **Adopt skeleton** |
| 21 | Capability-file push grants (zero open ports, self-healing) | core/push-grants.ts | Self-hosted pairing | **Adapt** |
| 22 | Deliver-on-idle queue w/ flush-time re-validation | core/agents/delivery-queue.ts | Send-to-busy-agent flows | **Adopt pattern** |

---

## 4. KQ1 — Carrier Abstraction (architecture)

One agent core drives three carriers because feature code only ever sees two things: a `NodeTerminalApi` object and a `FrameTransport` beneath it.

- **Four-method transport contract.** `send(json)` (outbound always JSON string), `onMessage(string | Uint8Array)` inbound sink, `onClose()` carrier-closed hook, `ready(): Promise<void>` single connection gate [frame-transport.ts:13-22]. Two implementations: WebSocket (open→resolve, error-before-open→reject, ArrayBuffer normalized to Uint8Array) [31-66] and Relay (E2EE tunnel addressed by connectionId; `ready()` resolves only on `onApproved`) [68-103].
- **Frame discrimination.** String frames route through strict `parseRpcMessage`; Uint8Array frames decode via `decodePtyData` (tag byte 0x01, BE uint16 sessionId length, UTF-8 id, payload) and fan out on the per-session pty channel [ws-bridge.ts:126-138; rpc.ts:117-141]. Only high-volume pty data is binary; control stays JSON.
- **Close semantics.** `onClose` calls `failPending()` FIRST — clearing the pending map before rejecting so reject handlers cannot observe stale ids — then notifies overlay hooks; every waiter rejects with coded `E_DISCONNECTED`. Rationale: unsettled promises block all downstream cleanup [ws-bridge.ts:88-114].
- **One api surface, rebuilt per carrier.** `buildRelayApi(connectionId)` reuses the same builders as the browser tab; routing is a documented PER-MEMBER decision (CORE-BOUND namespaces go remote; APP-GLOBAL stay local via preload spread; unsupported members refuse with coded errors rather than acting on the wrong machine) [relay-api.ts:1-118]. Two recorded gotchas: `pty.onData` bypasses RpcClient (decoded main-process-side), and `RelayFrameTransport` must be constructed while the approval dialog is still open (one-shot `onApproved`).
- **Envelope.** Five `t`-discriminated shapes (req/cast/res/ev), incrementing-id correlation, strictly validated parsing, and the `undef` index-list mechanism solving omitted-trailing-args-become-null WITHOUT an injectable sentinel [rpc.ts:6-77].
- **Early-event replay buffer.** Events for unsubscribed channels buffer (cap 4096, drop-oldest) and flush on first subscribe — closing the open-vs-subscribe race [ws-bridge.ts:78-81,152-161].
- **Typed stub degrade.** Where no bridge exists: subscriptions return no-op unsubscribe callables, boot-awaited members resolve benign values, everything else rejects `E_UNSUPPORTED`; `satisfies Omit<NodeTerminalApi,…>` makes the compiler enforce stub coverage [stubs.ts].

*(Full citations and per-finding adoption notes: `iterations/iteration-001.md`.)*

---

## 5. KQ2 — Relay E2EE Security Envelope (security)

Nine layers, each defeating a named attack, given the relay is untrusted and forwards opaque bytes:

1. **NaCl box AE** (Curve25519+XSalsa20-Poly1305), fresh 24-byte nonce per message, exact-length key decoding, decrypt-fail→null→drop [e2ee.ts:22-107]. *Defeats eavesdropping/tampering.*
2. **baseKey/sessionKey separation.** Raw ECDH never encrypts traffic; HKDF-SHA256(ikm=baseShared, salt=hostNonce‖clientNonce, info="nodeterm-relay-session-v2") derives the traffic key per session — static keys alone would give identical ECDH every reconnect, letting a relay replay a whole recorded session [e2ee.ts:41-73]. *Defeats cross-session replay.*
3. **Sealed `[role][seq][tag]` header inside the plaintext** (9 bytes; role 1/2, uint64-LE seq as two uint32 halves, payload tag) [relay-socket.ts:254-265]. *Metadata forgery dies on the MAC.*
4. **Role-byte-equals-peer check** after decrypt [relay-socket.ts:326-329]. *Defeats reflection.*
5. **Strictly-increasing inbound seq** (`recvSeq=-1`, drop `<=`), reset co-located with fresh-key derivation in `openConnection` so they cannot drift [relay-socket.ts:188-218,330-338]. *Defeats intra-session replay/reorder.*
6. **Handshake frozen after ready** — late hello/ready dropped WITHOUT re-keying or closing; peer key pinned per frame (`peerKeyIntact`) [relay-socket.ts:350-365; relay-client.ts:79-158]. *Defeats live re-key/MITM substitution.*
7. **Out-of-band 6-digit SAS mutual approval**, both-humans-confirm, pin-once peer keys, branded safe-by-construction `MutualApproval` state [e2ee.ts:86-95; mutual-approval-core.ts]. *The ONLY defense against a relay MITM.*
8. **Approval advances only from ciphertext** — single trust choke point; plaintext confirm frames die in `handleControl`; TRUST_CONFIRM is consumed, never routable; one gate per pairing attempt [relay-trust.ts:9-128]. *Defeats relay-injected confirms.*
9. **Endianness discipline** — box seq little-endian, pty sidLen big-endian, SAS fold big-endian; mixed orders blind the anti-replay check [ios-protocol-migration.md:590-592].

Iteration 10 upgraded every enforcement point above to primary file:line citations with **zero discrepancies** against the protocol doc, and added: recvSeq-advances-before-dispatch ordering, single-dispatch state machine, fire-once ws close/error latch, and the discovery that `RECONNECT_DELAYS_MS`/`scheduleReconnect` is dead code (reconnection is caller-owned via fresh-token mint).

---

## 6. KQ3 — Agent Status State Machine (logic)

`reduceEntry` turns raw parallel/out-of-order hook events into working/waiting/blocked/done without false flips:

- **DONE_HOLDOFF (3 s, duplicated renderer+mirror).** A late parallel PostToolUse `working` after Stop cannot resurrect the turn; only genuine `newTurn` bypasses; held-off events leave `updatedAt` untouched so the window keeps measuring from the done [agentStatus.ts:330-337; agent-status-mirror.ts:422-436].
- **Stale-working sweeper (20 min).** ONE shared constant, ONE decider (core mirror sweep every 60 s) firing a single synthetic `stale` end edge; `updatedAt` deliberately NOT touched during sweeps; long window because silent tool runs fire no hooks mid-flight [stale.ts:21; agent-status-mirror.ts:1690-1712].
- **Interrupt inference.** Esc/Ctrl-C with no cancel hook: settle 1500 ms, flip to done only if still working AND `stateAt` unchanged; wrong guesses self-heal on next event [agentStatus.ts:591-602].
- **awaitingInput hold (codex).** `request_user_input` ends the turn with the ask open; the flag holds `waiting` through the turn-end done using THIS POST's evidence, and the broadcast done is REWRITTEN to waiting once at the reducer boundary so all consumers agree [normalize.ts:311-328; agent-status-mirror.ts:409-421,1222-1228].
- **Idle-rescue.** CLI-at-prompt may only move a still-`working` node (blocked/waiting nodes are also idle — clearing would drop a live ask); result carries `idleInferred` provenance [agent-status-mirror.ts:401-405].
- **newTurn gating.** One explicit flag from genuine user-turn starts gates resurrection, per-turn fan-out reset, and guard clears; `<task-notification>` prompts explicitly NOT newTurn [normalize.ts:223-231].
- **Transient vs persisted.** Renderer persists identity only; `stateAt`/`lastEventAt`/`stateVerified` never persisted (each docblock names the relaunch bug it prevents). Mirror persists state for the phone but labels restored evidence `restored:true, stateVerified:false` with a 6 h expiry — messaging gates refuse unverified restored state [agentStatus.ts:289-311; agent-status-mirror.ts:1125-1131].

---

## 7. KQ4 — Event Normalization & Transcript Tails (logic)

- **Universal shape.** `NormalizedAgentEvent`: discriminated union (`state|subagent-start|subagent-end|recurring|session|background-task`) with semantically-named optional flags (`interrupted`, `idle`, `awaitingInput`, `newTurn`, `pendingId`), six per-agent normalizers behind one `normalizeFor(agentId, env)` dispatcher [normalize.ts:7-40,142-711].
- **Fixtures prove the dialect spread**: codex `{timestamp,type,payload}` envelopes; gemini event-sourced `$set` replays; grok summary.json; claude flat JSONL [core/__fixtures__/*].
- **Transcript reader.** 5 MB-from-end read cap; partial leading line dropped; tool_use rendered `$ name arg`; tool_result correlated by tool_use_id; `SESSION_ID_RE` traversal proof BEFORE any fs touch; account-scoped cache with access-healing; injected remoteReader checked first [transcript-reader.ts].
- **Index.** fs-free pure helpers; mtime-keyed incremental refresh; newest-200 KB text cap; one shared parser between search and detail [transcript-index-core.ts].
- **Subagent tail.** Per-subagent transcript + `.meta.json` correlated by spawning tool_use_id; non-blacklisting meta retries; 400 ms offset ticks capped 1 MB; byte-level torn-multibyte carries rejoined next tick; 1500 ms grace flush [subagent-tail.ts].
- **Context tail.** 1 Hz offset reads, backward scan with prefilter skips, used = input+cache_read+cache_creation tokens; per-agent parse dep OWNS the denominator — no stated window ⇒ no percentage pushed ("a used count over a guessed denominator is worse than no meter"); two free side-channels: task-notification sniffing (real async-subagent end) and any-tool_result-settled detection (Esc-ended asks) [context-tail.ts].
- **Activity strings.** Closed tool→verb mapping (Edit→"Editing x", Bash→"Running cmd", Task→"Delegating: …") feeds mobile live cards with zero transcript streaming on the phone [mobile-usage-inbox.md:91-96; agent-status-mirror.ts:537-587].

---

## 8. KQ5 — Hook-Reply Approve/Deny (ease-of-use)

Deterministic approvals without keystroke injection:

- **Held hook + answer file.** PermissionRequest branch generates `pendingId=<nodeId>-<ms>-$$`, writes request JSON to `~/.nodeterm/pending/<id>.json` (umask 077), polls `<id>.answer` every 0.5 s up to budget; reads `allow|deny`, removes both files, prints decision JSON — applied BEFORE the prompt paints. A file on the agent's host is reachable by every answerer (phone-over-SSH included) [hook-reply-approvals.md:3-35].
- **PENDING_ID_RE allowlist** (`^[A-Za-z0-9_-]+$` + ≤256 cap) validated everywhere an id becomes a path; generator charset kept in sync via `tr -c` [pending-approvals.ts:16-28].
- **Atomic writes, fail-open errors.** tmp+rename at mode 0600; any failure resolves false — the hook times out to the interactive prompt, legacy send-keys remains the fallback [pending-approvals.ts:36-60].
- **Bounded lifetimes.** Fail-open timeout; 10 min orphan sweep hourly; answerers re-check unresolved before writing (re-read-before-send) [hook-reply-approvals.md:57-60].
- **askKind enrichment.** The mirror's stash-priority classification enriches the broadcast once: AskUserQuestion gains `askKind:'question'` and pendingId STRIPPED (approve/deny buttons can never render on a picker); approvals keep theirs [normalize.ts:36-43; agent-status-mirror.ts:1189-1236].
- **Optimistic answered event.** Locally synthesized event shaped exactly like the authoritative second POST → instant UI, idempotent convergence [pending-approvals.ts:62-82].
- **Approval-mode mapping.** One dialect record per agent (flag+vocabulary inseparable); unexpressible modes emit NO flag (never nearest-match — default-valued settings would silently flip behavior); re-validation at the interpolation site because stored settings are user-editable data (`Object.hasOwn` prototype-hole guard) [approval-mode.ts].

---

## 9. KQ6 — Mirror/Inbox Mobile Contract (ux)

- **Additive side-channel, no new transport.** `MirrorFile.v` stays 1; `inbox?`/`usage?` are optional additive blocks old readers ignore; desktop writes atomically (tmp+rename, 0600, 300 ms debounce); SSH slices pushed per-project (2 s throttle, 60 s heartbeat); phone polls 8 s foregrounded [mobile-usage-inbox.md:5-29; remote-status-push.ts:15-22].
- **Shapes with hard caps.** `InboxEvent` (kind approval|question|done, title≤120, detail≤240, `${ts}-${seq}` ids, options/pendingId additions), `InboxNodeNow` (activity≤80, tool, contextPercent, prompt≤120), feed capped at 50 events [agent-status-mirror.ts:284-354].
- **Stash-priority classification.** Production folds the reduceEntry transition; fresh AskUserQuestion stash forces kind question even when signaled as permission-blocked; classification enriched onto ONE broadcast so canvas/notch/phone cannot disagree [agent-status-mirror.ts:1238-1498].
- **Title-based dedup, restart-persistent.** Same-title suppression within a 10 min window only; older lingering same-title asks supersede; new asks settle ALL older unresolved asks for the node first; dedup inputs persist across restarts (fix for triple-APNs field bug) [agent-status-mirror.ts:1329-1372,1076-1164].
- **Host owns resolution.** Leaving blocked/waiting via ANY newer state marks unresolved events resolved; node removal keeps history; ackDone dismisses on read; 6 h expiry ages out abandoned cards; protected trim keeps each node's newest done + newest unresolved even past cap [agent-status-mirror.ts:1255-1260,1530-1761].
- **Quick approve.** Approve/Deny send `1`/`Escape` to tmux only AFTER re-reading the status file and confirming still-blocked; else "already handled" [mobile-usage-inbox.md:135-140].
- **SSH slice filtering.** Per-project slices filter events/nodes to project ids while dropping settings/usage/server blocks [agent-status-mirror.ts:450-481].

---

## 10. KQ7 — Drop Resilience (ux)

- **Three-state model** `connected|connecting|offline` mutated in place on registry entries with memoized per-session stores [session.ts:17,111-117].
- **Involuntary drop ≠ user close.** `takeSessionOffline` runs teardowns exactly once, greys the tab, KEEPS entry + binding for reconnect-in-place; `disposeSession` (user close) drops everything [session.ts:97-130].
- **ready()-can-hang fixed** by racing approval against the REAL close signal plus a 60 s backstop with settled-once cleanup; construction-order rule (build api before awaiting ready) [relay-tab.ts:31,69,183-212].
- **Offline tab = connection bookmark.** Pure click triage (available→switch; unavailable+relay→reconnect; unavailable+local→ignore); reconnect mounts the EXISTING project id, prompts fresh pairing code, disposes the stale session only AFTER the replacement rebinds [relay-tab.ts:117-181].
- **Carrier-close contract.** One `onClose` seam whose documented job is "fail all in-flight RPCs + show reconnect overlay" — both carriers forward native closes there [frame-transport.ts:18-21,59-98].
- **Heartbeat/reap server-side.** Ping every 30 s, one missed round terminates (reaps ghosts in 30-60 s, survives proxy ~60 s idle timeouts, keeps connections alive through proxies); pong = protocol-layer liveness needing no page JS; teardown idempotent, releases pty subscriber [ws.ts:24-33,108-172].
- **8 MiB frame cap** rejects oversized frames pre-dispatch (close 1009) — sized from measured traffic with order-of-magnitude headroom vs the ws default 100 MiB shared-process DoS; Origin/Host upgrade gate; explicit socket error listeners [ws.ts:35-106,204-210].

---

## 11. Recommendations

Priority order for the Pi Remote SPA migration:

1. **P0 — Transport & envelope (week 1):** adopt FrameTransport seam + RPC envelope incl. `undef` + fail-pending close semantics + early-event replay buffer. These are small, dependency-free, and every later feature sits on them.
2. **P0 — Status pipeline:** adopt the NormalizedAgentEvent shape (single-agent normalizer first) and the reduceEntry guards (holdoff, newTurn gating, transient-vs-persisted discipline). Without these, webhook-driven status WILL false-flip on mobile.
3. **P1 — Approvals & inbox:** adopt the answer-file ticket contract (or its HTTP equivalent: durable ticket + atomic claim + TTL fail-open), askKind enrichment at production time, and the MirrorFile-style additive poll blob with hard caps + title dedup + host-owned resolution.
4. **P1 — Drop resilience:** three-state sessions, offline bookmarks with deferred disposal, `Promise.race` on every handshake, server-side heartbeat/reap, explicit frame caps.
5. **P2 — Push decisioning:** port the push skeleton (shared actionable seam, batch+throttle+presence hold, union targeting with per-device dedupe, deliver-on-idle with flush-time re-validation). Adapt grants to web-push subscription lifecycle.
6. **P2 — Security:** adopt the E2EE layer list as the checklist when a relay/E2E carrier enters scope; WebCrypto covers HKDF; tweetnacl/libsodium.js covers the box; the SAS/approval choke-point rules are protocol-level and transfer as-is.

Sequencing note (from iteration trails): KQ1+KQ7 together form the connectivity story; KQ6+KQ8 share one seam (`onInboxActionable`); KQ5 consumes KQ6's `pendingId` plumbing — build in that dependency order.

<!-- BEGIN GENERATED: deep-research/eliminated-alternatives -->

## Eliminated Alternatives

Consolidated negative knowledge (ruledOut records + Dead Ends sections):

| Approach | Reason Eliminated | Evidence | Iteration(s) |
|----------|-------------------|----------|--------------|
| Heartbeat/backpressure in ws-bridge.ts lines 400–907 | Not needed — both live server-side in `src/server/ws.ts`; the renderer bridge seam carries neither | iteration-004 Ruled Out | 1, 4 |
| Treating `PresenceHub` as the push-presence signal | Push deferral keys on an injected powerMonitor idle/lock present→away edge, not the team-presence peer table; hub contributes adjacent patterns only (token buckets, entry-point rate limiting) | push-notify.ts:207-222 | 6 |
| `framing.ts` as a live KQ2 security layer | Legacy opcode dialect deleted by the Stage-4 migration; residual relevance is the LE header pattern + shared backpressure constant only | ios-protocol-migration.md:471-489 | 9 |
| Direct relay-socket.ts/relay-client.ts reads in iteration 9 | Budget-deferred (12-call cap) — DISCHARGED in iteration 10 with zero discrepancies | iteration-009 Edge Cases → iteration-010 F-01..F-03 | 9, 10 |
| Re-verifying `ws.ts` heartbeat/reap constants | Already primary-cited in iteration 4; relay-socket.ts carries only the relay-side encrypted keepalive analog | iteration-010 Ruled Out | 10 |
| Citing `RECONNECT_DELAYS_MS`/`scheduleReconnect` as live auto-reconnect | Dead code — no call site; reconnection is caller-owned via fresh-token mint | relay-socket.ts:501-535 | 10 |
| Keystroke-injection approvals (implicit baseline) | Superseded by the hold-hook answer-file contract; injection kept only as legacy fallback when the env gate is absent | hook-reply-approvals.md:3-35 | 3 |

<!-- END GENERATED: deep-research/eliminated-alternatives -->

## Divergence Map

Single-executor run; divergent mode was OFF (config `antiConvergence.convergenceMode: "default"`).

- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated directions: none recorded (graph convergence repeatedly returned STOP_BLOCKED with empty blocker lists until the iteration cap; treated as insufficient graph evidence, not saturation)
- Pivot lineage: none
- Remaining frontier: none required — all eight charter angles answered on primary sources; iteration 10 closed the last citation-provenance debt.

---

## 12. Open Questions

All eight charter key questions are answered. Residual notes for future packets:

- **Registry bookkeeping:** KQ1 is answered in the narrative trail but remains `resolved=false` in `findings-registry.json` because the iteration-1 record carried a label-only `answeredQuestions` value the resolver cannot match (full-text convention adopted from iteration 2 onward). Semantic content is complete; only the registry flag lags.
- **backpressure.test.ts** (447 lines) was deferred twice under budget; behavior evidence comes from `ws.ts` constants + rationale. Read it when implementing Pi Remote's WS endpoint.
- **Pin-once vs full-SAS-every-time** is an open product decision inside nodeterm itself (ios-protocol-migration.md:376-386) — Pi Remote must make the same call if E2EE lands.
- **Union-targeting double-push** for doubly-connected phones is nodeterm's accepted tradeoff; Pi Remote's single-user model likely collapses it, but confirm during push design.

---

## 13. Iteration Trail

| Run | Focus | Ratio | Findings | Status |
|-----|-------|-------|----------|--------|
| 1 | KQ1 carrier abstraction | 1.0 | 7 | complete |
| 2 | KQ6 mirror/inbox contract | 1.0 | 6 | complete |
| 3 | KQ5 approvals | 1.0 | 7 | complete |
| 4 | KQ7 drop resilience | 0.93 | 7 | complete |
| 5 | KQ8 push decisioning | 0.0 | 0 | **error** (two empty leaf dispatches; redispatch budget consumed) |
| 6 | KQ8 push decisioning (retry) | 1.0 | 9 | complete |
| 7 | KQ3 status machine | 1.0 | 7 | complete |
| 8 | KQ4 normalization + tails | 0.93 | 7 | complete |
| 9 | KQ2 E2EE envelope | 1.0 | 9 | complete |
| 10 | Close-out primary citations | 0.75 | 6 | complete |

Totals: 65 findings, 9 productive iterations, 0 scope violations, READ-ONLY target intact.

---

## 14. Source Index

Primary nodeterm surfaces read (all under `specs/context/nodeterm-main/`):

- Bridge/RPC: `src/renderer/bridge/frame-transport.ts`, `ws-bridge.ts`, `relay-api.ts`, `stubs.ts`; `src/shared/rpc.ts`, `ipc.ts`
- Relay/E2EE: `src/main/remote/e2ee.ts`, `framing.ts`, `relay-trust.ts`, `mutual-approval-core.ts`, `relay-socket.ts`, `relay-client.ts`; `docs/ios-protocol-migration.md`
- Status/logic: `src/renderer/state/agentStatus.ts`, `src/core/agent-status-mirror.ts`, `src/shared/agents/normalize.ts`, `stale.ts`
- Tails: `src/core/transcript-index-core.ts`, `transcript-reader.ts`, `subagent-tail.ts`, `context-tail.ts`; `src/core/__fixtures__/{codex,gemini,grok}`
- Approvals: `src/core/agents/pending-approvals.ts`, `docs/hook-reply-approvals.md`, `src/shared/agents/approval-mode.ts`, `src/renderer/state/permissionMode.ts`
- Mobile/push: `docs/mobile-usage-inbox.md`, `src/core/push-notify.ts`, `push-grants.ts`, `remote-push-grants.ts`, `src/core/agents/delivery-queue.ts`, `src/core/presence/hub.ts`, `src/shared/presence.ts`, `src/main/remote-ssh/remote-status-push.ts`
- Sessions/server: `src/renderer/session/session.ts`, `relay-tab.ts`, `src/server/ws.ts`

`resource-map.md` was absent at init; the coverage gate was skipped (no placeholder citation fabricated).

---

## 15. Coverage Graph Summary

Session-scoped coverage graph (`convergence.cjs --persist-snapshot`): 70 nodes / 67 edges upserted across QUESTION/FINDING/SOURCE kinds with ANSWERS/CITES/SUPPORTS relations. Graph convergence returned STOP_BLOCKED (score ~0.74) on every evaluation with empty blocker lists — the loop therefore ran to its configured cap of 10 iterations rather than stopping early, and the final stop reason is `maxIterationsReached`.

---

## 16. Transfer Constraints & Risks

- **READ-ONLY integrity:** zero writes to `specs/context/**` across all iterations (REQ-003 satisfied; no SCOPE VIOLATIONS recorded).
- **Platform transfer:** everything adopted is browser-transferable per the charter non-goals; tmux send-keys quick-approve maps to Pi Remote's own PTX/exec channel; APNs-specific surfaces map to web-push.
- **Known nodeterm tradeoffs inherited by adoption:** union-targeting duplicate pushes (documented cheap-side), pin-once trust vs usability, dead reconnect table (do not copy it).
- **Evidence quality:** every finding carries file:line; iteration 10 closed the only doc-transcribed citation gaps with primary reads (zero discrepancies).

---

## 17. Appendix: Convergence Report

- Stop reason: maxIterationsReached (iteration cap 10; composite entropy signal fired at ≥0.85 coverage but graph convergence withheld STOP_ALLOWED)
- Total iterations: 10 (9 productive + 1 dispatch error)
- Questions answered: 8 / 8 (registry flag: 7 resolved + KQ1 label-gap, see §12)
- Last 3 iteration summaries: run 8: KQ4 normalization/tails (ratio 0.93); run 9: KQ2 E2EE envelope (ratio 1.0); run 10: close-out primary citations (ratio 0.75)
- Convergence threshold: 0.05 (never crossed by rolling average; entropy coverage reached 0.875)
- Divergence summary: no divergent pivots recorded; single-executor lineage `dr-20260823-000127`, generation 1
- Session: started 2026-08-23T00:03Z, completed 2026-08-23

<!-- END GENERATED: deep-research/research-md -->
