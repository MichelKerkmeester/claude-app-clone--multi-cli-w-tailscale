---
title: Deep Research Strategy - openclaude-android pattern mining
description: Runtime strategy tracking for the deep-research session mining specs/context/openclaude-android-main for Pi Remote-adoptable patterns.
trigger_phrases:
  - "deep research strategy"
  - "openclaude-android research"
  - "adoptable patterns"
importance_tier: normal
contextType: planning
version: 1.14.0.19
---

# Deep Research Strategy - Session Tracking

## 1. OVERVIEW

### Purpose

Persistent brain for this deep-research session. Read by the orchestrator and agents at every iteration.

### Usage

- **Init:** Orchestrator created this file with Topic, Key Questions, Known Context, and Research Boundaries from config.
- **Per iteration:** Agent reads Next Focus, writes iteration evidence, reducer refreshes machine-owned sections.
- **Mutability:** Mutable — analyst-owned sections stable; machine-owned sections rewritten by the reducer.

---

## 2. TOPIC

Mine the sibling app at `specs/context/openclaude-android-main` (READ-ONLY) for patterns adoptable by the Pi Remote SvelteKit mobile chat + remote-agent PWA, across ease-of-use, architecture, UX, and logic. Angles + where-to-look: read `specs/005-sveltekit-spa-migration/010-context-repo-research/openclaude-android/charter.md`. Produce adoptable-pattern findings with `specs/context/openclaude-android-main/file:line` citations. NEVER modify `specs/context/**`.

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
Generated from the reducer registry. Add external or late questions through `research/inbox.jsonl`; direct edits are imported as compatibility input.

- [ ] [logic] How does the client keep a long-lived agent session alive and consistent across drops, compaction, and token expiry over a WebSocket relay (close-code taxonomy, 30s keepalive, FlushGate ordering, BoundedUUIDSet echo dedup, proactive JWT epoch refresh, 401 recovery latch)? Where: src/remote/SessionsWebSocket.ts, src/remote/RemoteSessionManager.ts, src/bridge/flushGate.ts, src/bridge/jwtUtils.ts, src/bridge/replBridgeTransport.ts
- [ ] [architecture] What is the exact tool-permission / approval control protocol between remote client and agent (canUseTool allow/deny/ask flow, PermissionUpdate suggestions powering always-allow + directory scoping, server-initiated control requests answered-within-deadline, 5-value permission-mode set)? Where: src/remote/RemoteSessionManager.ts, src/server/directConnectManager.ts, src/bridge/bridgeMessaging.ts, src/types/permissions.ts, src/entrypoints/sdk/controlSchemas.ts
- [ ] [security] What is the security model for authenticating a remote controller and restricting a viewer (ELEVATED tier, X-Trusted-Device-Token enrollment, worker-JWT kept out of process.env, outboundOnly gate, viewerOnly flag, untrusted web-composer filenames)? Where: src/bridge/trustedDevice.ts, src/bridge/workSecret.ts, src/bridge/jwtUtils.ts, src/bridge/bridgeMessaging.ts
- [ ] [ux] How are composer attachments resolved on the agent side and injected into prompts safely (file_uuid model, filename sanitization, last-text-block injection, quoted @refs, per-attachment best-effort failure)? Where: src/bridge/inboundAttachments.ts, src/bridge/inboundMessages.ts
- [ ] [ux] How does the app help returning/backgrounded users catch up and how are attention-worthy events surfaced (useAwaySummary gating, status/notification hook catalog)? Where: src/hooks/useAwaySummary.ts, src/services/awaySummary.ts, src/hooks/notifs/*
- [ ] [ease-of-use] What is the lowest-friction handshake for pairing a phone client to a running session (connect-URL + QR, SessionActivity indicator, direct-connect minimal config) and how is live activity surfaced? Where: src/bridge/bridgeUI.ts, src/components/BridgeDialog.tsx, src/commands/mobile/mobile.tsx, src/server/createDirectConnectSession.ts
- [ ] [architecture] How are raw streaming SDK events normalized into a render-ready transcript while staying forward-compatible (convertSDKMessage adapter, display decisions, unknown-type tolerance, isSessionsMessage acceptance)? Where: src/remote/sdkMessageAdapter.ts, src/remote/SessionsWebSocket.ts, src/types/message.ts
<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS

- On-device inference / native modules / anything platform-specific that does not transfer to a web PWA (charter).
- Findings-only packet: no code changes in this spec packet; no writes to the target repo.
- NEVER modify anything under `specs/context/**` (READ-ONLY target).
- No implementation work — this loop does not proceed to `/speckit:implement`.

---

## 5. STOP CONDITIONS

- Convergence: newInfoRatio < 0.05 (default mode) — charter stop condition.
- Hard cap: 10 iterations (config.maxIterations).
- All key questions answered.
- 3+ consecutive iteration errors → halt loop, enter synthesis with partial findings.

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet -- populated as iterations answer questions]
<!-- /ANCHOR:answered-questions -->

---

<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
[First iteration -- populated after iteration 1 completes]
<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
[First iteration -- populated after iteration 1 completes]
<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
[Populated when an approach has been tried from multiple angles without success]
<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
[Approaches investigated and definitively eliminated]
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
[None yet]
<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS

Iteration 1: Angle [logic] — session lifecycle over the WebSocket relay. Extract the close-code taxonomy (4003 vs 4001 vs others), 30s ping keepalive, FlushGate write-ordering, BoundedUUIDSet echo dedup, JWT epoch-refresh scheduler, and the authRecoveryInFlight latch from src/remote/SessionsWebSocket.ts, src/remote/RemoteSessionManager.ts, src/bridge/replBridgeTransport.ts, src/bridge/flushGate.ts, src/bridge/jwtUtils.ts — with file:line citations.
<!-- /ANCHOR:next-focus -->

<!-- MACHINE-OWNED: END -->

## 12. KNOWN CONTEXT

- prior_context: None (memory daemon unavailable at init; exit 75 non-fatal).
- resource-map.md not present; skipping coverage gate.

### Bounded Context Snapshot

- Source pointers (READ-ONLY): `specs/context/openclaude-android-main/` — community fork of Claude Code CLI packaged for Android via Termux/proot; ships agent host + remote-control WebSocket layer. Charter-listed files: src/remote/SessionsWebSocket.ts, src/remote/RemoteSessionManager.ts, src/remote/sdkMessageAdapter.ts, src/bridge/{remoteBridgeCore,flushGate,jwtUtils,replBridgeTransport,trustedDevice,workSecret,inboundAttachments,inboundMessages,bridgeMessaging,bridgePermissionCallbacks,bridgeUI}.ts, src/hooks/useAwaySummary.ts, src/services/awaySummary.ts, src/server/{directConnectManager,createDirectConnectSession}.ts, src/types/{permissions,message}.ts, src/entrypoints/sdk/controlSchemas.ts.
- Reuse candidates: patterns adoptable by Pi Remote SvelteKit mobile chat + remote-agent PWA (the consumer of this research).
- Integration points: findings feed `specs/005-sveltekit-spa-migration/010-context-repo-research/openclaude-android/research/research.md`.
- Constraints and risks: target repo is READ-ONLY; cite file:line under `specs/context/openclaude-android-main/...`; skip non-transferable platform-specifics.

---

## 13. RESEARCH BOUNDARIES

- Max iterations: 10
- Convergence threshold: 0.05
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true (default)
- research/research.md ownership: workflow-owned canonical synthesis output
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A
- Question injection surface: `research/inbox.jsonl`
- Canonical pause sentinel: `research/.deep-research-pause`
- Current generation: 1
- Session ID: dr-20260823T054458Z-openclaude-android
- Started: 2026-08-23T05:45:30.000Z
