---
title: Deep Research Strategy - mobilecli pattern mining
description: Runtime tracking file for the deep-research session mining specs/context/mobilecli-main for adoptable Pi Remote PWA patterns.
trigger_phrases:
  - "deep research strategy"
  - "mobilecli pattern mining"
importance_tier: normal
contextType: planning
version: 1.14.0.19
---

# Deep Research Strategy - Session Tracking

Runtime tracking for `{spec_folder}/research/`. Read by the orchestrator and leaf agents every iteration.

## 1. OVERVIEW

### Purpose

Persistent brain for this session: what to investigate, what worked, what failed, where to focus next.

### Usage

- **Init:** Orchestrator populated Topic, Key Questions, Known Context, Research Boundaries from config + charter.md.
- **Per iteration:** Leaf reads Next Focus, writes iteration evidence; reducer refreshes machine-owned sections.
- **Mutability:** Analyst sections stable; Sections 3, 6-11A reducer-owned.

---

## 2. TOPIC
Mine specs/context/mobilecli-main (READ-ONLY) for adoptable patterns for the Pi Remote SvelteKit mobile PWA. Full angles and extract/where hints: `charter.md` in this spec folder. Findings only — cite file:line. NEVER modify specs/context/**.

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
- [ ] [architecture] How does Attach-v2 achieve gap-free, dedup-safe reconnection — deterministic clear -> chunked snapshot replay -> AttachReady -> live handoff, and how do seq/attach_id/last_live_seq/last_seen_seq order and dedupe frames across a dropped-and-restored socket?
- [ ] [logic] How is a raw output stream classified into a normalized wait-state, and how are duplicate notifications suppressed and stale waits cleared (taxonomy + debounce/clear logic)?
- [ ] [auth] How does the no-account pairing + challenge-response auth work, and how are per-credential capability scopes and revocation/rotation modeled?
- [ ] [onboarding] What is the end-to-end pairing UX: QR contents, connection-mode auto-detection (LAN vs Tailscale vs custom URL), scan-to-authenticated flow?
- [ ] [ux] Which mobile-specific affordances are encoded in the protocol/daemon — soft-keyboard-aware resize reasons, chunked history for perceived load, approval response vocabulary?
- [ ] [fs-contract] What is the structured request/response error contract for the filesystem/attachment surface — validation, rate limiting, destructive-op opt-in?
- [ ] [push] What is the push-notification event model — which events notify, payload shape, token registration/retention, decoupling from the stream?

<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS
From charter.md: on-device inference; native modules; anything platform-specific that does not transfer to a web PWA. Never modify specs/context/** (READ-ONLY target). Findings only — no code changes in the target repo.

---

## 5. STOP CONDITIONS
Convergence: rolling newInfoRatio below 0.05 (per convergence.md composite vote) or 10 iterations (maxIterationsReached). Stuck recovery after 3 consecutive no-progress iterations. Quality guards must pass before any non-cap STOP.

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet]

<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
[None yet]

<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
[None yet]

<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
[No exhausted approach categories yet]

<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
[None yet]

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
- How should the PWA recover when it observes a sequence gap or a broadcast receiver has lagged beyond the 256-event channel capacity? (iteration 1)
- What exact client algorithm does the product want for `AttachReady.last_live_seq`: discard `seq <= barrier`, or apply queued chunks from the snapshot boundary onward? (iteration 1)
- Should the product add an explicit snapshot sequence (`snapshot_last_seq`) or a replay-complete acknowledgment so the server can prove that no bytes between snapshot capture and live handoff are lost? (iteration 1)
- What explicit resync request/response should the PWA use after a sequence gap or broadcast lag? (iteration 2)
- What is the canonical version token for tmux pane snapshots, where `capture-pane` is not automatically identical to the PTY `live_seq` stream? (iteration 2)
- What server-side mechanism will retain post-snapshot chunks: an attach-local queue, a replayable event log, or an atomic subscription handoff under the session lock? (iteration 2)
- Should the product retain a bounded per-session event log, or only an attach-local queue plus a fresh authoritative snapshot? (iteration 3)
- What canonical version/watermark should identify tmux pane snapshots whose bytes are not identical to PTY `live_seq` output? (iteration 3)
- What exact PWA resync request/response should recover a sequence gap or a broadcast receiver lag? (iteration 3)
- What client rule should apply to `AttachReady.last_live_seq` once queued post-snapshot chunks are introduced? (iteration 3)
- What exact PWA resync request/response should recover a sequence gap or broadcast receiver lag? (iteration 4)
- How should the no-account pairing, wait-state detection, filesystem contract, and push event model map into the PWA? (iteration 4)
- The exact PWA API shape for pairing failure, credential rotation, and capability downgrade is not defined by MobileCLI's server-only sources. (iteration 5)
- The server's copy-operation semantics need an explicit decision about overwrite/destructive opt-in before the PWA exposes copy as a safe write action. (iteration 5)
- The target PWA still needs a concrete browser credential-storage and cross-tab ownership policy; the daemon evidence proves the server model but not a web-safe storage implementation. (iteration 5)
- The previously open Attach-v2 resync, snapshot watermark, and tmux snapshot-version questions remain unresolved. (iteration 5)
- The PWA API still needs a decision on whether to expose `prompt_hash` and `approval_model` so reconnect dedupe and exact approval controls can be implemented without inference. (iteration 6)
- The target product still needs a browser-side ownership rule for duplicate websocket tabs and push-vs-stream event deduplication. (iteration 6)
- Attach-v2 replay, snapshot watermark, and explicit resync questions remain unresolved and were intentionally not re-mined in this recovery rotation. (iteration 6)
- The push API needs an explicit provider contract for Web Push versus the server's current Expo-only send path, including token expiry and delivery-failure cleanup. (iteration 7)
- Attach-v2 replay, snapshot watermark, and explicit resync questions remain unresolved and were intentionally not re-mined. (iteration 7)
- The product must decide whether `CopyPath` needs the same destructive/overwrite opt-in as delete and rename. (iteration 7)
- The PWA still needs a browser credential/subscription storage and cross-tab ownership policy for push registration. (iteration 7)
- The exact PWA API/error vocabulary for unsupported auth versions, unknown/revoked credentials, timeout, capability denial, and credential rotation is not specified by the server sources. (iteration 8)
- The PWA still needs a browser-safe secret-storage policy, including whether the pairing secret is kept in IndexedDB, a platform credential store, or another protected boundary. (iteration 8)
- Scope downgrade/upgrade semantics are not defined; the server currently persists the credential's scope list, but no client-facing capability-management message was found. (iteration 8)
- The PWA must decide how to infer or let users override LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints. (iteration 8)
- [ ] [auth] The exact PWA API/error vocabulary for unsupported auth versions, unknown/revoked credentials, timeout, capability denial, and credential rotation remains unspecified by the server sources. (iteration 9)
- [ ] [ux] The PWA protocol still needs a decision on whether to expose `prompt_hash` and `approval_model` so reconnect dedupe and exact approval controls can be implemented without inference. (iteration 9)
- [ ] [push] Browser push provider, token retention, expiry cleanup, and cross-tab ownership remain unspecified. (iteration 9)
- [ ] [architecture] Attach-v2 replay ordering, snapshot watermarking, and explicit resync semantics remain unresolved and were intentionally not re-mined. (iteration 9)
- [ ] [onboarding] The PWA must decide how to infer or let users override LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints. (iteration 9)
- [ ] [auth] The exact PWA error vocabulary for unsupported auth versions, revoked/unknown credentials, timeout, capability denial, and rotation remains unspecified by the server sources. (iteration 10)
- [ ] [push] Browser push provider, token retention/expiry cleanup, and cross-tab ownership remain unspecified. (iteration 10)
- [ ] [onboarding] The PWA still needs a policy for LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints. (iteration 10)
- [ ] [ux] Product/API design must decide whether to expose `prompt_hash` and `approval_model` (or an equivalent server-issued dedup/control descriptor). (iteration 10)

<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
[ ] [ux] Product/API design must decide whether to expose `prompt_hash` and `approval_model` (or an equivalent server-issued dedup/control descriptor).

<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT

### Memory Context
None (Spec Kit Memory daemon unavailable at init; advisory only).

### Resource Map
resource-map.md not present; skipping coverage gate.

### Bounded Context Snapshot

Target (READ-ONLY): `specs/context/mobilecli-main` — MobileCLI Rust daemon (desktop server half of a phone-app remote for AI coding CLIs). PTY-per-session, LAN/Tailscale WebSocket streaming, wait-state detection with push notifications, Pro jailed filesystem bridge. Same product category as Pi Remote minus the client UI.

- Source pointers (from charter.md): cli/src/protocol.rs (message enums, ConnectionInfo/to_compact_qr, FileSystemError, PtyResizeReason); cli/src/daemon.rs (subscribe/attach handler ~2369-2680, live_seq assignment ~1396-1552, should_notify/clear-on-output ~1459-1520, scrollback ring ~285-298, push token mgmt); cli/src/detection.rs (WaitType, ApprovalModel, CliTracker); cli/src/auth.rs; cli/src/setup.rs; cli/src/qr.rs; cli/src/filesystem/security.rs; cli/src/filesystem/rate_limit.rs; README; docs/ARCHITECTURE_QUICK_REFERENCE.md.
- Reuse candidates: attach/replay sequencing, prompt-hash notification dedup, HMAC challenge-response auth, QR compact format, resize-reason semantics, FS error taxonomy + token-bucket limits, push event decoupling.
- Integration points: Pi Remote SvelteKit mobile PWA chat/remote-agent surfaces (consumer of these patterns).
- Constraints and risks: READ-ONLY target — never write under specs/context/**; cite file:line for every finding; findings must transfer to a web PWA (SvelteKit), not native/mobile-only mechanisms.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 10
- Convergence threshold: 0.05
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true (default)
- research/research.md ownership: workflow-owned canonical synthesis output
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A
- Question injection surface: `{spec_folder}/research/inbox.jsonl`
- Canonical pause sentinel: `research/.deep-research-pause`
- Current generation: 1
- Started: 2026-08-22T22:15:15.080Z
