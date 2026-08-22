# Iteration 001 — Attach-v2 reconnection architecture

## Focus

Attach-v2 reconnection: deterministic clear, chunked snapshot replay, `AttachReady`, live handoff, sequence/attach identity, and bounded scrollback replay.

## Actions Taken

- Read the mobile protocol definitions for `Subscribe.last_seen_seq`, the Attach-v2 lifecycle frames, and `PtyChunk`.
- Traced daemon attach handling from attach-id allocation through clear, PTY/tmux snapshot replay, `AttachReady`, and active-attach registration.
- Traced live sequence assignment, scrollback retention, broadcast delivery, lag handling, and snapshot chunking helpers.
- Checked the existing Attach-v2 gating and scrollback-size tests.

## Findings

### F1 — Use a replaceable attach state machine, not incremental socket continuation

The protocol gives the client an explicit lifecycle: `AttachBegin` carries a fresh/reconnect mode and `attach_id`; `AttachClear` establishes an empty local terminal; ordered `AttachSnapshotChunk` frames carry `chunk_seq`, `total_chunks`, and `is_last`; `AttachReady` closes replay; and subsequent `PtyChunk` frames carry both `attach_id` and monotonic `seq` ([protocol.rs:318-355](specs/context/mobilecli-main/cli/src/protocol.rs:318)). This is directly adoptable for the PWA as a per-session state machine keyed by `(session_id, attach_id)`: ignore stale frames from older attaches, buffer or reject live frames before readiness, and make clear/replay idempotent at the UI boundary.

### F2 — Reconnect is labeled separately but currently replays a full snapshot

`Subscribe.last_seen_seq` is optional ([protocol.rs:76-81](specs/context/mobilecli-main/cli/src/protocol.rs:76)), and the daemon labels the attach `reconnect` when the field is present ([daemon.rs:2458-2468](specs/context/mobilecli-main/cli/src/daemon.rs:2458)). The inspected attach path logs `last_seen_seq` but still collects the current scrollback/tmux snapshot and sends it through the same clear-and-replay sequence ([daemon.rs:2371-2421](specs/context/mobilecli-main/cli/src/daemon.rs:2371)). Therefore, the adoptable PWA contract should model reconnect as deterministic full replacement unless an explicit delta-replay contract is added; do not assume `last_seen_seq` alone requests a gap-only replay.

### F3 — Snapshot replay is deliberately bounded and transport-friendly

PTY text sessions replay the daemon’s retained scrollback; Attach-v2 splits it into 48 KiB chunks and base64-encodes each chunk ([daemon.rs:2522-2558](specs/context/mobilecli-main/cli/src/daemon.rs:2522)). The daemon keeps an 8 MiB `VecDeque<u8>` ring and truncates from the front as new PTY bytes arrive ([daemon.rs:283-298](specs/context/mobilecli-main/cli/src/daemon.rs:283); [daemon.rs:1395-1405](specs/context/mobilecli-main/cli/src/daemon.rs:1395)). This gives the PWA a practical replay source and a predictable memory ceiling; chunk assembly should be incremental, with a bounded aggregate and an explicit incomplete-snapshot failure path.

### F4 — Bootstrap/live interleaving is intentionally prevented, but the high-water-mark contract needs to be explicit

The daemon sends `AttachReady` with the current session `live_seq` after replay ([daemon.rs:2654-2682](specs/context/mobilecli-main/cli/src/daemon.rs:2654)), then registers the active view and `(socket, session) -> attach_id` mapping only after the bootstrap sequence ([daemon.rs:2694-2704](specs/context/mobilecli-main/cli/src/daemon.rs:2694); [daemon.rs:2739-2743](specs/context/mobilecli-main/cli/src/daemon.rs:2739)). This is a strong server-side pattern: no live frame should interleave with clear/replay. However, the source does not establish whether `last_live_seq` means “already represented by the snapshot” or merely “latest sequence observed before handoff.” Since live PTY events are broadcast while the attach handler is awaiting sends ([daemon.rs:1435-1437](specs/context/mobilecli-main/cli/src/daemon.rs:1435)) and a lagged receiver simply continues ([daemon.rs:1244-1249](specs/context/mobilecli-main/cli/src/daemon.rs:1244)), the PWA and daemon need an explicit rule: either deliver all queued `seq > snapshot_seq` after `AttachReady`, or make the snapshot/high-water mark atomic and recover on any sequence gap.

### F5 — tmux and PTY sessions should share the lifecycle but not the snapshot producer

PTY sessions use the daemon ring, while tmux sessions obtain an authoritative `capture-pane` snapshot, truncate it to the configured byte ceiling, and then use the same Attach-v2 chunk frames ([daemon.rs:2578-2642](specs/context/mobilecli-main/cli/src/daemon.rs:2578)). The PWA can therefore keep one attach state machine while treating snapshot bytes as opaque terminal data; the server chooses the canonical source.

## Questions Answered

- **Gap-free dedup-safe attach shape:** Confirmed lifecycle and identity fields are present; the PWA should clear, assemble ordered chunks, wait for readiness, then accept only the active attach’s live stream.
- **Fresh versus reconnect:** Confirmed the mode flag is based on whether `last_seen_seq` is supplied, but the inspected server path still performs full snapshot replay.
- **Replay source and bounds:** Confirmed an 8 MiB PTY ring and 48 KiB Attach-v2 transport chunks; tmux uses capture-pane with the same lifecycle.
- **Live ordering caveat:** Confirmed active attach registration is deferred until after bootstrap, while broadcast lag is dropped; exact high-water-mark recovery remains an implementation contract to specify.

## Questions Remaining

- What exact client algorithm does the product want for `AttachReady.last_live_seq`: discard `seq <= barrier`, or apply queued chunks from the snapshot boundary onward?
- How should the PWA recover when it observes a sequence gap or a broadcast receiver has lagged beyond the 256-event channel capacity?
- Should the product add an explicit snapshot sequence (`snapshot_last_seq`) or a replay-complete acknowledgment so the server can prove that no bytes between snapshot capture and live handoff are lost?

## Next Focus

Wait-state classification taxonomy, duplicate-notification suppression, and stale-wait clearing.
