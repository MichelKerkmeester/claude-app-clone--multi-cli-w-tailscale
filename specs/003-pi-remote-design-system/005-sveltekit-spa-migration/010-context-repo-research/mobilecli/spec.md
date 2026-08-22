---
title: "Context Repo Research — mobilecli Pattern Mining for Pi Remote"
description: "Deep-research packet mining specs/context/mobilecli-main (READ-ONLY) for adoptable patterns for the Pi Remote SvelteKit mobile PWA: Attach-v2 reconnection, wait-state detection, pairing auth, onboarding UX, protocol-encoded mobile affordances, FS error contract, and push-notification model."
trigger_phrases:
  - "mobilecli pattern mining"
  - "pi remote adoptable patterns research"
  - "attach-v2 reconnection research"
importance_tier: "important"
contextType: "research"
---

# Context Repo Research — mobilecli Pattern Mining

<!-- SPECKIT_LEVEL: 1 -->
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Type** | Research packet (deep-research owned) |
| **Target** | `specs/context/mobilecli-main` (READ-ONLY) |
| **Charter** | `charter.md` in this folder |
| **Created** | 2026-08-22 |

<!-- /ANCHOR:metadata -->
---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Pi Remote's SvelteKit mobile PWA needs proven patterns for terminal streaming, reconnection, wait-state detection, pairing/auth, and push notifications. MobileCLI (`specs/context/mobilecli-main`) is a Rust daemon in the exact same product category — it allocates a PTY per session, streams terminal bytes over LAN/Tailscale WebSocket to a paired phone, detects CLI wait-states and fires push notifications, and exposes a security-jailed filesystem bridge. Mining it yields field-tested adoptable designs without copying non-transferable native mechanisms.

Purpose: produce cited findings (file:line) identifying what transfers to a web PWA, synthesized in `research/research.md`.

<!-- /ANCHOR:problem -->
---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Reading `specs/context/mobilecli-main` (Rust daemon sources, README, docs) as READ-ONLY input.
- The seven charter angles: Attach-v2 reconnection; wait-state detection/dedup; pairing + challenge-response auth with scoped credentials; QR/onboarding/connection-mode UX; protocol-encoded mobile affordances (resize reasons, chunked history, approval vocabulary); filesystem error/rate-limit/destructive-op contract; push-notification event model.
- Findings documents under `research/` in this packet.

### Out of Scope
- Any modification of `specs/context/**` (hard READ-ONLY constraint).
- On-device inference, native modules, or platform-specific mechanisms that do not transfer to a web PWA.
- Code changes anywhere; implementation is downstream (`/speckit:plan` consumes the findings).

<!-- DR-SEED:SCOPE -->
<!-- /ANCHOR:scope -->
---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | Mine all seven charter angles from the READ-ONLY target | Each angle has findings with file:line citations |
| REQ-002 | Every finding marks transferability to a SvelteKit web PWA | Non-transferable native-only mechanisms are explicitly ruled out |
| REQ-003 | Never modify specs/context/** | No writes outside this research packet |

<!-- DR-SEED:REQUIREMENTS -->
<!-- /ANCHOR:requirements -->
---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: `research/research.md` synthesizes findings across all charter angles with citations.
- **SC-002**: Loop terminates via convergence (newInfoRatio < 0.05) or the 10-iteration cap.

<!-- /ANCHOR:success-criteria -->
---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Accidental writes to READ-ONLY target | Violates charter hard rule | Prompt-pack write-path allowlist scopes leaf writes to this packet only |
| Dependency | Target repo present at `specs/context/mobilecli-main` | Research cannot proceed | Verify path exists at iteration 1 |

<!-- /ANCHOR:risks -->
---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Which Attach-v2 replay primitives translate to WebSocket + SvelteKit store state management vs. need redesign?
- Do any detection heuristics assume PTY semantics unavailable in a browser xterm.js pipeline?

<!-- BEGIN GENERATED: deep-research/spec-findings -->
Abridged sync of `research/research.md` (canonical). 10 iterations; stop: maxIterationsReached.

**Adopt (with file:line evidence in research/research.md):**
1. **Attach state machine** — `(session_id, attach_id)` lifecycle: AttachBegin → AttachClear → 48 KiB chunked snapshot → AttachReady → live `PtyChunk{seq}` (protocol.rs:318-355). Bounded 8 MiB scrollback / capture-pane replay sources (daemon.rs:283-298, 2578-2642).
2. **Fix the handoff MobileCLI got wrong** — its ordering drops replay-window bytes (no attach queue; post-ready registration; ignored lag; daemon.rs:1195-1248, 2694-2743). Add `snapshot_last_seq`, server-side post-snapshot queueing, contiguous-sequence dedupe vs `highest_contiguous_applied_seq`, explicit resync on gap. `last_seen_seq` is a label, not a cursor; `AttachReady.last_live_seq` is not a discard barrier.
3. **Wait-state reducer** — ANSI-stripped 1200-char/6-line tail; taxonomy tool_approval|plan_approval|clarifying_question|awaiting_response; per-CLI approval models Numbered|YesNo|Arrow|None; dedupe key (session, wait_type, prompt_hash); clear on ≥10 meaningful chars or user input (detection.rs:189-387; daemon.rs:1457-1520). Wire gap to close: expose `prompt_hash` + `approval_model`.
4. **Device pairing auth** — verifier-only server storage; HMAC transcript over server_id+credential_id+both nonces+installation id, constant-time compare; per-operation scope gate incl. on-disk active check; rotation revokes by identity (auth.rs:46-156; daemon.rs:775-882, 4184-4241).
5. **QR onboarding** — device-level compact URI (endpoint, auth version, server/credential ids, one-time token, wss flag); scan→review card→challenge-response→session discovery; LAN/Tailscale/custom modes (protocol.rs:628-715; setup.rs:360-430).
6. **FS bridge contract** — request_id-correlated typed errors; path jail + denied/read-only globs + symlink rejection; per-socket token bucket returning retry_after_ms; delete/rename destructive opt-in — treat copy-overwrite as destructive too (source bypasses that gate) (protocol.rs:577-626; filesystem/security.rs; rate_limit.rs:3-39; daemon.rs:3807-3930).
7. **Push as decoupled projection** — spawned delivery off the PTY loop; installation-scoped tokens (replace, dedupe, cap 3, revocation pruning); minimal payload from normalized wait state (daemon.rs:1459-1498, 3350-3412, 4264-4277, 5279-5484).

**Open product decisions:** resync API shape; retention model (event log vs attach-local queue); browser secret storage + cross-tab ownership; Web Push provider contract; connectivity-mode policy (mixed content/secure context).

**Ruled out:** last_seen_seq delta replay; last_live_seq discard barrier; client-side wait re-classification; exact approval controls without approval_model; assuming push provider coverage.
<!-- END GENERATED: deep-research/spec-findings -->

<!-- /ANCHOR:questions -->
