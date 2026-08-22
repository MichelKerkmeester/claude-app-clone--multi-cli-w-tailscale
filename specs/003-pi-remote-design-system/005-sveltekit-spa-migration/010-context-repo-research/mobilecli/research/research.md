# MobileCLI Pattern Mining for Pi Remote SvelteKit PWA — Research Synthesis

**Session:** `dr-20260822T215957Z` · **Target:** `specs/context/mobilecli-main` (READ-ONLY) · **Iterations:** 10 · **Stop:** `maxIterationsReached`

---

## 1. Executive Summary

MobileCLI is the closest product analog to Pi Remote: a phone-side remote for AI coding CLIs with PTY streaming, wait detection, push notifications, and a jailed filesystem bridge — minus the client UI. Ten iterations mined its Rust daemon for patterns that transfer to the Pi Remote SvelteKit mobile PWA.

Five adoption themes emerged with file:line evidence:

1. **Attach-v2 is a replaceable attach state machine, but its handoff has a proven loss window.** The lifecycle (`AttachBegin → AttachClear → chunked snapshot → AttachReady → live PtyChunk`) is directly adoptable; the server's own ordering drops chunks produced during replay (no attach-local queue, post-replay attach registration, ignored `Lagged`). Pi Remote should adopt the lifecycle **plus** a `snapshot_last_seq` boundary, server-side post-snapshot queueing, and contiguous-sequence dedupe (iterations 1–4).
2. **Wait-state detection is a bounded, normalized, deduplicated state machine** — ANSI-stripped 1,200-char/6-line tail, four-type taxonomy, per-CLI approval models, `(prompt_hash, wait_type)` dedupe, 10-char meaningful-output clear threshold. Directly transferable as an idempotent event reducer; two fields (`prompt_hash`, `approval_model`) are missing from the wire event and must be added for exact browser dedupe/controls (iterations 5, 6, 9, 10).
3. **Pairing is a device credential with server-side-verifier-only storage** and an HMAC challenge-response bound to server, credential, both nonces, and installation ID; scopes are re-checked against revocation per operation. A clean web adaptation shape exists, with browser secret storage as an open product decision (iterations 5, 8).
4. **The filesystem bridge is a structured, request-correlated, defense-in-depth contract** — typed error taxonomy, path jail + denied/read-only globs + symlink rejection, per-socket token-bucket limits with `retry_after_ms`, and destructive ops disabled by default (with one gap: `copy` bypasses the destructive gate) (iterations 5, 7).
5. **Push is a decoupled projection of a deduplicated wait event** — authenticated installation-scoped token registration with caps and revocation pruning, payload built from normalized wait state, delivery spawned off the PTY loop. The event envelope transfers even though the sender is Expo-only (iterations 5, 7).

The single most important negative finding: **do not copy MobileCLI's reconnection ordering as-is** — its `last_seen_seq` is a label, not a replay cursor, and `AttachReady.last_live_seq` is a post-replay barrier that can mask bytes produced during replay (iteration 2 F7, iteration 3).

---

## 2. Research Charter & Scope

From `charter.md` (this packet):

- **Goal:** mine adoptable patterns for the Pi Remote SvelteKit mobile chat / remote-agent PWA; findings only; cite file:line.
- **Non-goals:** on-device inference, native modules, anything that does not transfer to a web PWA. Never modify `specs/context/**`.
- **Stop conditions:** convergence (newInfoRatio < 0.05) or 10 iterations.
- **Seven angles:** Attach-v2 reconnection; wait-state classification; pairing auth + scopes; QR/onboarding UX; protocol-encoded mobile affordances; FS error contract; push event model.

---

## 3. Methodology

- Executor: `cli-codex` (model `gpt-5.6-luna`, reasoning `high`, workspace-write sandbox, audited dispatch with INTENT/COMPLETION receipts and write containment).
- Fresh leaf context per iteration; externalized state (`deep-research-state.jsonl`, per-iteration deltas, reducer-owned strategy/registry/dashboard).
- Iterations 1–4 mined Attach-v2 deeply (architecture → snapshot boundary → server retention → client rule). Iteration 5 was a breadth pass across pairing, wait-states, FS, and push. After 3 consecutive failed dispatches (narrow stale focus; one run also edited out-of-scope files — reverted by write containment), a **recovery rotation** (runs 6–10) covered wait-state depth, FS/push depth, auth/onboarding depth, and a final wait-state synthesis, deliberately avoiding the saturated Attach-v2 direction.
- Ratios by iteration: 0.82, 0.79, 0.64, 0.56, 0.74, 0.78, 0.69, 0.74, 0.78, 0.82.

---

## 4. Findings

### A. Attach-v2 reconnection: adopt the state machine, fix the handoff (iterations 1–4)

**A1. Lifecycle and identity are cleanly adoptable.** `AttachBegin` (fresh/reconnect mode + `attach_id`), `AttachClear` (deterministic empty canvas), ordered `AttachSnapshotChunk` (`chunk_seq`/`total_chunks`/`is_last`, 48 KiB, base64), `AttachReady`, then `PtyChunk{attach_id, seq}`. Model a per-session state machine keyed by `(session_id, attach_id)`; reject stale-attach frames; buffer/reject live frames before readiness. `protocol.rs:318-355`, `daemon.rs:2369-2680`.

**A2. Reconnect is a label, not a delta replay.** `Subscribe.last_seen_seq` only flips `AttachBegin.mode` to `"reconnect"`; the server still replays a full snapshot. `protocol.rs:76-81`, `daemon.rs:2458-2468`, `2371-2421`. *Adoption: treat reconnect as full deterministic replacement unless a delta contract is added.*

**A3. Bounded replay source.** 8 MiB `VecDeque<u8>` PTY ring (`daemon.rs:283-298`, `1395-1405`); tmux uses `capture-pane` truncated to the same ceiling (`daemon.rs:2578-2642`). One state machine, opaque snapshot bytes, server-chosen source.

**A4. The loss window (do-not-copy finding).** Live output increments `live_seq` and broadcasts; the per-socket forwarder drops broadcast items when no attach id is registered, and registration happens only after `AttachReady`; `Lagged` on the 256-event channel is ignored. Therefore bytes with `initial_live_seq < seq ≤ last_live_seq` can be absent from both snapshot and live stream, and `AttachReady.last_live_seq` (read after replay) would mask them if used as a discard barrier. `daemon.rs:1396-1437`, `1195-1248`, `2694-2743`, `2657-2682`, `2371-2424`.

**A5. The fix contract (recommended for Pi Remote server+client).**
- Capture `snapshot_last_seq` atomically with the snapshot (on `AttachBegin` or replay metadata — snapshot chunks carry no live sequence today, `protocol.rs:331-339`).
- Queue every post-snapshot chunk for the attach; flush in sequence order; then send `AttachReady` carrying the final `last_live_seq`.
- Client: clear → apply snapshot chunks (watermark unchanged) → set expected live seq to `snapshot_last_seq + 1` → apply queued chunks only when contiguous, deduping `seq ≤ highest_contiguous_applied_seq` for the active `attach_id` → verify `last_live_seq == highest contiguous applied` before leaving replay → persist as `last_seen_seq`. Gap ⇒ explicit resync (fresh authoritative snapshot), never silent continuation. (Iteration 4's algorithm; server-side queueing must exist first — MobileCLI has neither queue nor event log, `daemon.rs:285-321`.)
- tmux snapshots need a server-defined capture/version token; a PTY seq alone cannot prove pane-snapshot coverage (iteration 2 F9).
- No existing test proves gap-free handoff; require an integration test injecting output between capture and readiness (iteration 2 F10).

### B. Wait-state detection and notification dedup (iterations 5, 6, 9, 10)

**B1. Bounded tail classifier.** Strip ANSI → last 1,200 chars → last 6 lines → lowercase → classify in precedence order: plan approval → tool approval → clarifying question (final line ends `?`; approval language suppresses) → awaiting-response phrases. `detection.rs:189-205`, `316-327`, `330-387`.

**B2. Taxonomy and approval models are separate axes.** Wait types: `tool_approval | plan_approval | clarifying_question | awaiting_response` (`detection.rs:54-70`). Approval models: `Numbered | YesNo | Arrow | None` with per-CLI defaults (Claude/Codex Numbered, Gemini YesNo, OpenCode Arrow) and text-cue overrides (`detection.rs:23-43`, `208-243`). Server accepts normalized intent `yes | yes_always | no` and owns the CLI-specific keystroke mapping (`daemon.rs:3414-3450`, `4706-4726`). *Adoption: render normalized intent in the PWA; never show an approve control for `ApprovalModel::None`; keep terminal encoding server-side.*

**B3. CLI identity via scored hysteresis.** `CliTracker`: command signal weight 8, output/banner weight 4, switch only when best ≥ 5 and exceeds current by ≥ 2; confidence is a coarse 0–3 bucket (`detection.rs:81-150`). Treat `cli_type` as a presentation hint, not calibrated confidence.

**B4. Dedupe and clear transitions.** New wait only when `(prompt_hash, wait_type)` differs from stored state (hash = 300-char prompt suffix, `detection.rs:347-384`; predicate `daemon.rs:1457-1498`). Clear only on ≥ 10 non-whitespace chars of non-prompt output (`daemon.rs:1500-1519`) or immediately on user input (`daemon.rs:1571-1585`). *Adoption: idempotent event reducer keyed by `(session_id, wait_type, prompt_hash)`; treat `WaitingCleared` (session-scoped, `protocol.rs:382-386`) as authoritative and tolerate duplicates.*

**B5. Wire gaps to close in Pi Remote's protocol.** `WaitingForInput` carries session/timestamp/prompt/wait_type/cli_type but **not** `prompt_hash` or `approval_model` (`protocol.rs:374-386`) — reconnect dedupe and exact approval controls can't be derived without adding them (or a server-issued descriptor). Late-join behavior: server replays all currently-waiting sessions on connect (`daemon.rs:4682-4703`) — reconcile from server snapshot after reconnect.

### C. Pairing and challenge-response auth (iterations 5, 8)

**C1. Device credential, verifier-only server storage.** 32 random bytes; base64 token shown once at pairing; server stores domain-separated SHA-256 verifier plus identity/scopes/timestamps/revocation (`auth.rs:46-69`, `93-118`).

**C2. Nonce-bound HMAC transcript.** `AuthStart → AuthChallenge → AuthResponse`; transcript = domain marker + server_id + credential_id + client_nonce + server_nonce + installation_id; HMAC-SHA256 proof with constant-time compare; 10s challenge timeout; echoed fields must match exactly. `auth.rs:120-156`, `protocol.rs:51-68, 259-264`, `daemon.rs:775-882`, `970-1033`. *Adoption: mismatch = fresh-auth failure, not a reconnectable stream error.*

**C3. Scopes are credential data, re-checked per operation.** `session:read/control/spawn`, `fs:read/write/delete/watch/upload`, `push:register`; auth copies scopes into the client state and every operation maps to a required scope with an on-disk active check (`auth.rs:19-44`, `daemon.rs:808-882`, `4184-4241`). *Adoption: capability-denied UI ≠ transport error; re-check on the server per operation.*

**C4. Rotation/revocation invalidate by identity.** `pair --rotate` revokes all credentials before issuing a new one; individual revoke persists timestamped state; `last_used_at` tracked (`main.rs:472-520`, `590-604`, `daemon.rs:970-1033`). *Adoption: surface rotation as a device-wide invalidation event on auth failure.*

### D. QR onboarding and connection modes (iterations 5, 8)

**D1. Device-level compact QR.** `mobilecli://host:port?...` with scheme stripped from authority, device id/name, auth version, server_id, credential_id, one-time token, `wss=1` when secure (`protocol.rs:628-715`). QR pairs a device; sessions are discovered after auth (`protocol.rs:663-669`). *Adoption: scanner/import route is the single source of truth; show a reviewable connection card before persisting; QR ≠ session identity.*

**D2. Three explicit modes with detection/fallback.** Local (detected IP), Tailscale (install/login/backend checks + first Tailnet IP), Custom URL (`ws://`/`wss://`) (`setup.rs:12-21`, `360-430`, `581-686`; `README.md:80-86`, `208-216`). Server safety: loopback-only exposure until a credential exists (`daemon.rs:537-575`). *Adoption: mode inferable from QR authority + `wss` flag, but browser mixed-content/secure-context and reachability need product handling.*

### E. Filesystem/attachment contract (iterations 5, 7)

**E1. Request-correlated structured envelope.** Every request carries `request_id`; success/error/chunk responses preserve it; errors are a typed taxonomy (not-found, permission, traversal, type-mismatch, conflict, non-empty, size, encoding, cancellation, I/O, rate-limit) (`protocol.rs:155-253`, `401-469`, `577-626`; `daemon.rs:4324-4342`). Chunks carry `chunk_index/total_chunks/total_size/checksum/is_last`.

**E2. Defense in depth.** Absolute paths, no parent traversal; pre-canonicalization + canonical jail/denied-glob checks; read-only globs; symlinks rejected by default; 50 MiB read/write caps; 10k listing / 1k search caps; secret-path denials (`filesystem/security.rs:32-189`; `filesystem/config.rs:31-106`).

**E3. Rate limiting is retryable by contract.** Per-socket token bucket; exhaustion returns `RateLimited{retry_after_ms}` with original request_id preserved (`filesystem/rate_limit.rs:3-39`; `daemon.rs:3555-3560`, `3626-3641`). *Adoption: bounded server-directed backoff keyed by request_id; never treat socket write success as operation success.*

**E4. Capability vs destructive gates — and a gap.** Delete/rename additionally require a config opt-in (default off) returning a structured permission error (`daemon.rs:3807-3884`, `4318-4322`); **`copy` bypasses that destructive gate** (`daemon.rs:3899-3930`) — treat copy-overwrite as destructive in the PWA until the server contract is explicit.

### F. Push event model (iterations 5, 7)

**F1. Decoupled delivery.** A deduplicated `WaitingForInput` broadcasts to live sockets while push I/O runs in a spawned task — notification latency never blocks PTY streaming (`daemon.rs:1459-1498`, `4578-4622`).

**F2. Installation-scoped token lifecycle.** Registration requires auth, validates token shape, replaces prior token per (credential, installation), dedupes values, caps 3 tokens/credential, supports explicit unregister; revoked-credential tokens are pruned before send (`daemon.rs:137-146`, `3350-3412`, `4264-4277`).

**F3. Minimal payload; provider is a capability.** Payload = title/body/session ids/type/sound/priority derived from normalized wait state — no terminal data (`daemon.rs:5279-5311`, `5435-5484`). Registration accepts `expo|apns|fcm` but the sender is **Expo-only** (`daemon.rs:5441-5468`). *Adoption: keep the event envelope and stream/push separation; treat Web Push as an explicit provider capability with its own expiry/cleanup contract.*

---

## 5. Pi Remote SvelteKit Adoption Map

| Pi Remote surface | Adopt from MobileCLI | Key change vs source |
|---|---|---|
| Terminal/chat stream store | Attach state machine keyed by `(session_id, attach_id)`; clear→snapshot→ready→live | Add `snapshot_last_seq`, server-side post-snapshot queue, contiguous-seq dedupe, explicit resync |
| Reconnect | Persist `last_seen_seq`; full-snapshot reconnect | Do NOT treat `last_seen_seq` as a replay cursor |
| Wait/approval UX | Bounded tail classifier taxonomy; normalized approval intent; idempotent `(session, wait_type, prompt_hash)` reducer; 10-char clear | Add `prompt_hash` + `approval_model` to the wire event |
| Pairing | Device credential + verifier-only storage + HMAC transcript + per-op scope gate | Browser secret storage policy is a product decision (IndexedDB vs platform store) |
| Onboarding | Device-level QR → review card → challenge-response → session discovery | Mixed-content/secure-context handling for LAN vs Tailscale vs custom |
| FS bridge | request_id envelope, typed errors, jail/globs/symlinks, token bucket with retry_after | Expose copy as destructive until server adds the opt-in gate |
| Push | Decoupled projection of deduped wait event; installation-scoped tokens with caps/pruning | Web Push provider contract + expiry cleanup |

---

## 6. Evidence Boundaries & Unknowns

- All findings are from server-side Rust sources; no MobileCLI client code exists in the target to confirm consumer behavior. Client rules (iteration 4's algorithm) are inferred from the wire contract.
- Browser-specific concerns (credential storage, Web Push subscription persistence, cross-tab ownership, mixed content) are explicitly out of the target's evidence and remain product decisions.
- The daemon's `last_wait_hash` field vs the predicate reading `waiting_state.prompt_hash` was noted but not behaviorally tested (iteration 9 §3).

## 7. Negative Knowledge (Ruled-Out Directions)

- **`last_seen_seq` as a replay cursor:** ruled out — presence-only label (`daemon.rs:2463-2467`).
- **`AttachReady.last_live_seq` as a client discard barrier:** ruled out — post-replay barrier masks replay-window bytes (iteration 2 F7).
- **Assuming an attach-local queue or event log exists:** ruled out — `DaemonState` has neither (`daemon.rs:285-321`).
- **Rendering exact approval controls from `WaitingForInput` alone:** ruled out — `approval_model` not on the wire (`protocol.rs:374-381`).
- **Client-side CLI identity inference:** unnecessary — server's hysteresis tracker supplies `cli_type` (`detection.rs:81-150`).
- **Assuming push provider coverage from registration acceptance:** ruled out — Expo-only sender (`daemon.rs:5441-5468`).

## Eliminated Alternatives

- **Delta replay from `last_seen_seq` (incremental socket continuation):** eliminated for adoption; the server never implemented it, and a bounded event log would be required to make it honest. Full deterministic snapshot + boundary + queue is the recommended alternative.
- **Separate replay-complete acknowledgment frame:** eliminated as necessary; `AttachReady` already carries completion semantics (`protocol.rs:340-347`). Optional for telemetry only — and useless without a snapshot boundary.
- **Client-side wait re-classification from raw transcript:** eliminated; adopt the server's normalized event as the single source to avoid client/server disagreement (iteration 10 §1).
- **Copy as a "safe" action:** eliminated pending server change; it bypasses the destructive opt-in gate (`daemon.rs:3899-3930`).

## Divergence Map

- **Saturated direction:** Attach-v2 replay internals (runs 1–4; explicitly excluded from recovery rotations 6–10).
- **Pivots taken:** recovery rotation after 3 consecutive dispatch failures (audited override; runs 6–10 rotated to wait-state, FS/push, auth/onboarding, synthesis).
- **Pivot failures:** runs 6–8 (first round) produced no artifacts — narrow stale focus; one run edited out-of-scope files and was reverted by write containment (see `deep-research-state.jsonl` `containment_violation` events).
- **Remaining frontier (product/API decisions, not target-repo evidence):** browser secret storage; Web Push provider contract; resync request/response API; `prompt_hash`/`approval_model` wire exposure; copy destructive opt-in; LAN/Tailscale/custom connectivity policy.

## 12. Open Questions

1. Exact resync request/response after a sequence gap or receiver lag (fresh attach id? authoritative snapshot watermark? bounded replay window?).
2. Bounded per-session event log vs attach-local queue + fresh snapshot — which retention model for Pi Remote's server?
3. Canonical version token for tmux/pane-equivalent snapshots where bytes ≠ PTY sequence stream.
4. Browser credential-storage boundary for the pairing secret (IndexedDB vs platform credential store) and cross-tab ownership.
5. Pi Remote error vocabulary for auth-version mismatch, unknown/revoked credential, timeout, capability denial, rotation.
6. Whether to expose `prompt_hash` and `approval_model` (or a server-issued dedup/control descriptor) in the PWA protocol.
7. Web Push provider contract: subscription persistence, token expiry, delivery-failure cleanup.

## References

- Target sources: `specs/context/mobilecli-main/cli/src/{protocol.rs, daemon.rs, detection.rs, auth.rs, setup.rs, qr.rs, main.rs, filesystem/security.rs, filesystem/rate_limit.rs, filesystem/config.rs}`; `README.md`; `docs/ARCHITECTURE_QUICK_REFERENCE.md` (all READ-ONLY; citations inline as `file:line`).
- Iteration narratives: `research/iterations/iteration-001.md` … `iteration-010.md` (full per-iteration evidence).
- Charter: `charter.md` in this packet.

## Appendix: Convergence Report

- Stop reason: `maxIterationsReached` (10/10 successful iterations; convergence floor 3 cleared; graph convergence `STOP_BLOCKED` at boundaries — treated as telemetry per the max-iterations policy).
- Questions answered: [logic] fully (server contract); [ux] approval vocabulary (server side); [auth], [onboarding], [fs-contract], [push] answered for the server model with browser-side decisions remaining; [architecture] answered as "adopt lifecycle, fix handoff" with the resync API still to design.
- Ratios: 0.82, 0.79, 0.64, 0.56, 0.74, 0.78, 0.69, 0.74, 0.78, 0.82 (mean ≈ 0.74; recovery rotation restored novelty after the mid-run dip).
- Registry: 24 key findings, 7 tracked questions (formally open pending product decisions above).
