# Iteration 003 — Attach-v2 post-snapshot retention

## Focus

Determine whether MobileCLI retains PTY chunks produced after snapshot capture and before `AttachReady` through an attach-local queue, a replayable event log, or an atomic subscription handoff under the session lock.

## Actions Taken

- Read the Attach-v2 message contract in `specs/context/mobilecli-main/cli/src/protocol.rs:76-80,318-355`.
- Traced PTY sequence assignment and publication in `specs/context/mobilecli-main/cli/src/daemon.rs:1396-1437,1544-1552`.
- Traced mobile broadcast receiver registration and filtering in `specs/context/mobilecli-main/cli/src/daemon.rs:1055-1078,1193-1249`.
- Traced the complete subscribe/replay/ready/view-registration sequence in `specs/context/mobilecli-main/cli/src/daemon.rs:2350-2777`.

## Findings

### 1. The server has no attach-local queue or replayable live event log

`DaemonState` stores a per-session `live_seq`, an 8 MiB scrollback buffer, and a Tokio broadcast sender with capacity 256; it does not store per-attach pending chunks or a sequence-indexed event log (`daemon.rs:285-321,345-379`). PTY bytes increment `live_seq`, enter scrollback, and are published once through `pty_broadcast` (`daemon.rs:1396-1437`; binary output increments and publishes at `1544-1552`). The scrollback is a snapshot source, not a replay log keyed by `live_seq`.

### 2. The closest mechanism is ordered handoff, but it is not atomic across replay

The subscribe handler snapshots scrollback and `initial_live_seq` under the state write lock, then explicitly drops that lock before sending `AttachBegin`, `AttachClear`, snapshot chunks, and the tmux snapshot (`daemon.rs:2357-2424,2440-2451,2458-2652`). It reads the current sequence only immediately before `AttachReady` (`daemon.rs:2657-2682`), and registers `mobile_attach_ids[addr][session_id] = attach_id` only after `AttachReady` (`daemon.rs:2694-2743`). This is therefore a post-replay registration boundary, not an atomic subscription handoff under the session lock.

### 3. Chunks arriving during the replay window are dropped for Attach-v2

The mobile connection subscribes to the broadcast channel before processing client messages (`daemon.rs:1055-1078`). Its PTY receive branch looks up the attach ID; for an Attach-v2 client, no attach ID means `continue`, so the chunk is discarded (`daemon.rs:1195-1226`). Because the attach ID is absent until after replay, any PTY chunk broadcast while snapshot capture or snapshot transmission is in progress is not retained for this socket. The 256-event channel can also report `Lagged`, which is ignored (`daemon.rs:1244-1249`), giving no resync path in this server branch.

### 4. `last_seen_seq` is a reconnect label, not a replay cursor

The protocol accepts `Subscribe.last_seen_seq` (`protocol.rs:76-80`), but the subscribe handler uses only its presence to set `AttachBegin.mode` to `"reconnect"` or `"fresh"` (`daemon.rs:2463-2467`). It does not replay events after that sequence or compare it with `initial_live_seq`/`last_live_seq`. `AttachReady.last_live_seq` is the current sequence read after replay, so it is a barrier value without proof that every sequence between snapshot capture and the barrier was delivered (`protocol.rs:340-355`; `daemon.rs:2657-2682`).

### Adoptable PWA pattern

Use the protocol shape, but add an explicit server-side retention boundary: create an attach record before snapshot capture, capture `snapshot_last_seq`, queue every subsequent chunk for that attach, send clear plus chunked snapshot, then flush queued chunks in sequence order and emit `AttachReady` carrying the snapshot/live barrier. A bounded replayable event log is preferable when reconnecting clients must use `last_seen_seq`; an attach-local queue is sufficient only for the in-progress snapshot window. A sequence gap or broadcast lag must produce an explicit resync response rather than being silently ignored.

## Questions Answered

- **Server-side retention mechanism:** MobileCLI implements neither an attach-local queue nor a replayable event log. Its closest behavior is an ordered, post-replay subscription handoff, but the state lock is released during network replay and the attach mapping is installed only afterward. Consequently, the implementation does not prove gap-free handoff for chunks emitted during replay.

## Questions Remaining

- What exact PWA resync request/response should recover a sequence gap or a broadcast receiver lag?
- Should the product retain a bounded per-session event log, or only an attach-local queue plus a fresh authoritative snapshot?
- What canonical version/watermark should identify tmux pane snapshots whose bytes are not identical to PTY `live_seq` output?
- What client rule should apply to `AttachReady.last_live_seq` once queued post-snapshot chunks are introduced?

## Next Focus

Define the client/server resync contract for sequence gaps and broadcast lag, including the authoritative snapshot watermark and dedupe rule.
