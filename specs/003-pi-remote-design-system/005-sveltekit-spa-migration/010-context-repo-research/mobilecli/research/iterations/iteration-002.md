# Iteration 002 — Snapshot boundary and replay-complete proof

## Focus

Determine whether Attach-v2 needs an explicit snapshot sequence (`snapshot_last_seq`), a replay-complete acknowledgment, or both, so the server can prove that bytes produced between snapshot capture and live handoff are not lost.

## Actions Taken

- Re-read the Attach-v2 protocol fields: `last_seen_seq`, `attach_id`, `AttachBegin`, `AttachClear`, `AttachSnapshotChunk`, `AttachReady`, and `PtyChunk`.
- Traced the daemon's subscribe path from session-state capture through snapshot transmission, `AttachReady`, and active-attach registration.
- Traced live sequence assignment, broadcast delivery, the 256-event receiver capacity, and the behavior when a connection has no active attach id.
- Checked the existing Attach-v2 tests and confirmed they cover capability gating and attach-map cleanup, but not snapshot/live interleaving or sequence continuity.

## Findings

### F6 — `AttachReady.last_live_seq` is a handoff barrier, not proof of snapshot coverage

The daemon captures PTY scrollback and `initial_live_seq` together under a read lock, then drops the lock before it sends `AttachSnapshotChunk` frames ([daemon.rs:2371-2424](specs/context/mobilecli-main/cli/src/daemon.rs:2371)). It later reads the current `session.live_seq` and puts that value in `AttachReady.last_live_seq` ([daemon.rs:2657-2677](specs/context/mobilecli-main/cli/src/daemon.rs:2657)). Therefore, the field describes a later point than the captured PTY bytes; it does not identify the sequence represented by the snapshot.

### F7 — The current ordering has a concrete loss window during replay

Live output increments `live_seq`, appends to scrollback, and broadcasts the tuple `(session_id, seq, bytes)` ([daemon.rs:1396-1437](specs/context/mobilecli-main/cli/src/daemon.rs:1396)). The per-socket loop emits Attach-v2 `PtyChunk` only when `mobile_attach_ids` already contains an id; otherwise it skips the broadcast item ([daemon.rs:1195-1248](specs/context/mobilecli-main/cli/src/daemon.rs:1195)). That map is populated only after clear, replay, and `AttachReady` ([daemon.rs:2694-2743](specs/context/mobilecli-main/cli/src/daemon.rs:2694)). Consequently, output with sequence `initial_live_seq < seq <= last_live_seq` can be absent from both the snapshot and the live stream. Setting a client discard barrier to `last_live_seq` would hide precisely those missing bytes.

### F8 — Add a snapshot boundary, but pair it with server-side catch-up

The adoptable PWA contract should expose a `snapshot_last_seq` (or an equivalent opaque snapshot version) that is captured at the same logical point as the snapshot. The server must retain or queue live chunks with `seq > snapshot_last_seq` while replay is in progress, flush them in sequence order, and only then send a replay-complete `AttachReady` containing the final `last_live_seq`. The client can then clear, assemble the ordered snapshot, apply queued chunks strictly above `snapshot_last_seq`, and deduplicate by `(session_id, seq, attach_id)`; a sequence gap triggers resync rather than silent continuation.

`AttachReady` already functions as a completion marker in the protocol ([protocol.rs:340-347](specs/context/mobilecli-main/cli/src/protocol.rs:340)), so a separate boolean acknowledgment is optional. It is not a substitute for the boundary and catch-up rule: an acknowledgment can prove that replay ended, but without a snapshot version/high-water mark it cannot prove which live bytes the replay included.

### F9 — A PTY sequence watermark is insufficient for tmux unless snapshot and sequence share a source

PTY replay copies the daemon's scrollback, while tmux replay obtains a fresh `capture-pane` snapshot asynchronously during subscribe ([daemon.rs:2522-2575](specs/context/mobilecli-main/cli/src/daemon.rs:2522); [daemon.rs:2578-2651](specs/context/mobilecli-main/cli/src/daemon.rs:2578)). Both use the same Attach-v2 frame lifecycle, but only the PTY path has an obvious byte buffer tied to the daemon's `live_seq`. For tmux, `snapshot_last_seq` must mean a server-defined capture/version token, or the capture operation must be coordinated with the event log; otherwise a numeric PTY sequence does not prove that the pane snapshot contains every earlier sequence.

### F10 — Existing tests do not establish the required gap-free invariant

The current tests verify Attach-v2 capability negotiation and pruning of stale attach mappings ([daemon.rs:6218-6267](specs/context/mobilecli-main/cli/src/daemon.rs:6218)), but there is no test demonstrating that output generated during chunked replay is delivered exactly once after handoff. The PWA adoption should require an integration test that injects output between snapshot capture and readiness, then asserts contiguous sequence application and resync on a forced receiver lag.

## Questions Answered

- **Should the product add `snapshot_last_seq`?** Yes, or an equivalent source-specific snapshot version. It is the missing boundary needed to distinguish bytes represented by the snapshot from bytes produced during replay.
- **Should the product add a replay-complete acknowledgment?** `AttachReady` already supplies that semantic. A separate acknowledgment is optional for naming/telemetry, but it does not solve loss without a snapshot boundary and post-boundary catch-up.
- **What client rule follows?** Treat `AttachReady` as permission to finish the handoff only after the snapshot is complete; apply every buffered live chunk above the snapshot boundary exactly once, require contiguous sequence progression, and request a full resync on a gap or receiver lag.

## Questions Remaining

- What server-side mechanism will retain post-snapshot chunks: an attach-local queue, a replayable event log, or an atomic subscription handoff under the session lock?
- What is the canonical version token for tmux pane snapshots, where `capture-pane` is not automatically identical to the PTY `live_seq` stream?
- What explicit resync request/response should the PWA use after a sequence gap or broadcast lag?

## Next Focus

Raw output wait-state classification: taxonomy, prompt identity, duplicate-notification suppression, and stale-wait clearing.
