# Iteration 006

## Focus

Recovery rotation for wait-state detection and notification behavior. The target was the complete `cli/src/detection.rs` classifier, the daemon transition logic, and the protocol messages that expose waiting state to mobile clients. Attach-v2 replay internals were not re-mined.

## Actions Taken

- Read `specs/context/mobilecli-main/cli/src/detection.rs` end to end, including CLI identity scoring, approval-model detection, wait taxonomy, tail-window selection, and prompt hashing.
- Read `specs/context/mobilecli-main/cli/src/daemon.rs:1457-1520` for notification deduplication and clear transitions.
- Read `specs/context/mobilecli-main/cli/src/protocol.rs:374-386` plus the daemon broadcast/replay helpers and approval-input mapping.
- Searched the MobileCLI source for all waiting-state and approval-model references to confirm the server-to-client contract and late-client behavior.

## Findings

### F-006-01 — Wait classification is bounded, normalized, and precedence-ordered

`detect_wait_event` strips ANSI escapes, keeps only the last 1,200 characters, then rebuilds a six-line tail before lowercasing it. It classifies in this order: plan approval, tool approval, a final-line clarifying question, then generic awaiting-response phrases. The emitted event carries a normalized wait type, a prompt excerpt capped at 300 characters, the selected approval model, and a hash of that prompt (`specs/context/mobilecli-main/cli/src/detection.rs:189-205`, `330-387`). This is directly transferable to a browser chat stream as a bounded tail classifier, provided the PWA treats the result as a server-derived state rather than scanning the whole transcript.

### F-006-02 — The normalized taxonomy and CLI-specific approval models are explicit

The wire taxonomy is `tool_approval`, `plan_approval`, `clarifying_question`, and `awaiting_response` (`specs/context/mobilecli-main/cli/src/detection.rs:54-70`). Default approval models are Numbered for Claude/Codex, YesNo for Gemini, Arrow for OpenCode, and None for Terminal/Unknown (`specs/context/mobilecli-main/cli/src/detection.rs:23-43`). Text heuristics can override the default by detecting arrow navigation, numbered options, or yes/no markers (`specs/context/mobilecli-main/cli/src/detection.rs:208-243`).

### F-006-03 — CLI identity uses weighted evidence, hysteresis, and coarse confidence

`CliTracker` starts at Terminal, adds weight 8 for a command-name signal and weight 4 for an output/banner signal, and switches identity only when the best score is at least 5 and exceeds the current score by 2. Confidence is exposed as a 0–3 bucket derived from the best score (`specs/context/mobilecli-main/cli/src/detection.rs:81-150`). A PWA can use the server's resulting `cli_type` for labels and notification copy without reproducing identity inference locally.

### F-006-04 — Duplicate waiting notifications are suppressed by prompt hash plus wait type

On each normalized PTY chunk, the daemon re-runs detection over its bounded output buffer. A waiting state is considered new only when there is no prior state or either the prompt hash or wait type changes. Only a new state updates the stored waiting record and triggers both the websocket broadcast and asynchronous push notification (`specs/context/mobilecli-main/cli/src/daemon.rs:1457-1499`). This gives the PWA an idempotent event key of `(session_id, wait_type, prompt_hash)` even though the current wire message does not include `prompt_hash`.

### F-006-05 — Stale waits clear on meaningful non-prompt output or explicit user input

If the current chunk no longer classifies as a wait and its trimmed normalized content has at least 10 characters, the daemon clears the stored state and emits `WaitingCleared` (`specs/context/mobilecli-main/cli/src/daemon.rs:1500-1520`). Sending a tool-approval response also clears the state after translating the abstract response into model-specific PTY input (`specs/context/mobilecli-main/cli/src/daemon.rs:3414-3450`, `4706-4726`). The 10-character threshold is a debounce against control characters, partial echoes, and insignificant PTY fragments.

### F-006-06 — The protocol is a two-event state machine with late-join replay

`WaitingForInput` contains `session_id`, timestamp, prompt content, normalized wait type, and CLI type; `WaitingCleared` contains session ID and timestamp (`specs/context/mobilecli-main/cli/src/protocol.rs:374-386`). The daemon broadcasts these events to active mobile clients and re-sends every currently stored waiting state to a newly connected client (`specs/context/mobilecli-main/cli/src/daemon.rs:4578-4620`, `4682-4703`). A browser client should therefore model waiting as durable per-session state, apply clear events idempotently, and reconcile active waits after reconnect rather than relying only on events observed during the socket lifetime.

### F-006-07 — Approval response vocabulary is stable, but the current wire event omits approval_model

The server accepts abstract responses `yes`, `yes_always`, and `no`, mapping them to numbered input (`1/2/3`), `y/n`, or arrow-key sequences according to the retained approval model (`specs/context/mobilecli-main/cli/src/daemon.rs:3414-3450`, `4706-4726`). However, `WaitingForInput` serializes `wait_type` and `cli_type` but not `approval_model` (`specs/context/mobilecli-main/cli/src/protocol.rs:374-381`; construction at `4578-4596`). A PWA can render a generic action set and submit the stable vocabulary, but cannot faithfully display the CLI's exact interaction model from this event alone. If exact UI affordances are required, the API needs an additional approval-model field or a server-provided action descriptor.

## Questions Answered

- [logic] How is a raw output stream classified into a normalized wait-state, and how are duplicate notifications suppressed and stale waits cleared? **Answered for the server implementation:** ANSI normalization plus a 1,200-character/six-line tail, ordered taxonomy, prompt hash, hash/type deduplication, a 10-character meaningful-output clear threshold, and explicit clear-on-input transitions are all present in the cited sources.
- [ux] Which approval response vocabulary is encoded for mobile clients? **Partially answered:** the server accepts `yes`, `yes_always`, and `no`; the protocol carries the normalized wait type and prompt, but not the approval model needed for exact control rendering.

## Questions Remaining

- The PWA API still needs a decision on whether to expose `prompt_hash` and `approval_model` so reconnect dedupe and exact approval controls can be implemented without inference.
- The target product still needs a browser-side ownership rule for duplicate websocket tabs and push-vs-stream event deduplication.
- Attach-v2 replay, snapshot watermark, and explicit resync questions remain unresolved and were intentionally not re-mined in this recovery rotation.

## Next Focus

Continue the recovery rotation with the filesystem/attachment contract or push-token lifecycle, prioritizing concrete request/response fields and failure semantics. Preserve the wait-state findings above as the logic baseline.
