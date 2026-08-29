# Iteration 004 — Client rule for `AttachReady.last_live_seq`

## Focus

Determine how the PWA should interpret `AttachReady.last_live_seq` after the server adds a queue for PTY chunks emitted after snapshot capture and before attach completion.

## Actions Taken

- Read the client subscribe field and Attach-v2 server-message definitions in `specs/context/mobilecli-main/cli/src/protocol.rs:76-80,318-355`.
- Re-read live sequence assignment and broadcast publication in `specs/context/mobilecli-main/cli/src/daemon.rs:1396-1437,1544-1552`.
- Re-read the mobile PTY forwarding filter in `specs/context/mobilecli-main/cli/src/daemon.rs:1193-1249`.
- Re-read the attach replay, ready barrier, and post-ready registration order in `specs/context/mobilecli-main/cli/src/daemon.rs:2350-2777`.

## Findings

### 1. `last_live_seq` should be an inclusive post-flush barrier

The current protocol labels `AttachReady.last_live_seq` as the latest live sequence and emits it after replay, while `PtyChunk` carries the individual sequence number (`protocol.rs:340-355`; `daemon.rs:2657-2682`). With a post-snapshot queue, the server should flush queued chunks in ascending `seq` order before sending `AttachReady`; the client should then interpret `last_live_seq` as an inclusive confirmation that all sequences through that value have been delivered. It is not a command to discard queued frames whose sequence is below the barrier.

### 2. Dedupe against the client’s contiguous applied watermark, not the ready barrier

The client should maintain a per-session `highest_contiguous_applied_seq`. For the active `attach_id`, a `PtyChunk` with `seq <= highest_contiguous_applied_seq` is a duplicate and may be discarded; `seq == highest_contiguous_applied_seq + 1` is applied and advances the watermark; `seq > highest_contiguous_applied_seq + 1` is a gap and must trigger resync or remain buffered while resync is negotiated. This avoids losing a queued chunk merely because the eventual `AttachReady.last_live_seq` is already greater than it. `attach_id` remains the stale-socket fence because each live frame is tagged with it (`protocol.rs:349-355`), while the current server drops frames when no attach ID is registered (`daemon.rs:1219-1226`).

### 3. A snapshot watermark is required to make the rule verifiable

Snapshot chunks have `chunk_seq` and `total_chunks`, but no live PTY sequence (`protocol.rs:331-339`). Therefore the client cannot establish the first expected live sequence from the snapshot alone. The attach contract should expose `snapshot_last_seq`—the live sequence covered by the snapshot—on `AttachBegin` or a replay metadata frame. After the snapshot is applied, the client sets its expected live sequence to `snapshot_last_seq + 1`, applies queued chunks contiguously, and verifies at `AttachReady` that its applied watermark equals `last_live_seq`. The existing implementation reads `initial_live_seq` under the lock but only emits the later ready-time value; it does not expose a snapshot watermark or prove coverage (`daemon.rs:2371-2421,2657-2682`).

### Adoptable PWA algorithm

Use this state transition for each attach:

1. Accept only frames for the current `attach_id`; clear the terminal on `AttachClear`.
2. Apply snapshot chunks in `chunk_seq` order without changing the live sequence watermark.
3. Set the expected live sequence from `snapshot_last_seq`; apply queued/live `PtyChunk`s only when contiguous, deduping `seq <= highest_contiguous_applied_seq`.
4. Treat a sequence above the next expected value as a gap and request a fresh authoritative snapshot/resync; do not silently apply it.
5. Require `AttachReady.last_live_seq` to equal the highest contiguous applied sequence before leaving replay mode. Persist that value as `last_seen_seq` for the next reconnect.

This recommendation is inferred from the numbered-frame contract; the inspected MobileCLI server has no PWA client implementation to confirm the consumer behavior. The current server also installs `mobile_attach_ids` only after `AttachReady` (`daemon.rs:2694-2743`), so the queue and flush ordering must be implemented server-side before this client rule can provide gap-free handoff.

## Questions Answered

- **Client rule for `AttachReady.last_live_seq`:** apply queued chunks first in contiguous sequence order; use `last_live_seq` as an inclusive ready-time barrier and verification point. Never pre-discard queued chunks solely because their `seq` is `<= last_live_seq`.
- **Dedupe rule:** dedupe against the highest contiguous sequence already applied for the active attach, with `attach_id` fencing stale sockets.
- **Boundary requirement:** add an explicit `snapshot_last_seq` (or equivalent replay metadata) so the client can detect a missing first queued sequence.

## Questions Remaining

- What exact PWA resync request/response should recover a sequence gap or broadcast receiver lag?
- Should the product retain a bounded per-session event log, or only an attach-local queue plus a fresh authoritative snapshot?
- What canonical version/watermark should identify tmux pane snapshots whose bytes are not identical to PTY `live_seq` output?
- How should the no-account pairing, wait-state detection, filesystem contract, and push event model map into the PWA?

## Next Focus

Define the client/server resync request and response, including whether a gap response returns a fresh attach ID, an authoritative snapshot watermark, and a bounded replay window.
