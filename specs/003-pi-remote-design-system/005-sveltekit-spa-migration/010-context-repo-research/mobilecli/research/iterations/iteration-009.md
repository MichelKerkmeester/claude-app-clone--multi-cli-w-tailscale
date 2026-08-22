# Iteration 009

## Focus

Recovery rotation on wait-state detection: normalized taxonomy, bounded tail matching, CLI identity hysteresis, notification deduplication, clear transitions, and the mobile protocol surface. Attach-v2 replay internals were intentionally not re-mined.

## Actions Taken

1. Read the full `cli/src/detection.rs` implementation in the read-only MobileCLI context repository.
2. Read the daemon output loop around `detect_wait_event`, notification deduplication, meaningful-output clearing, and user-input clearing.
3. Read the `WaitingForInput` / `WaitingCleared` protocol variants, current-state replay for newly connected clients, and approval response encoding.
4. Searched MobileCLI call sites and source references to distinguish the server’s internal state from fields exposed to a PWA.

## Findings

### 1. Classification is bounded, normalized, and ordered

The detector strips ANSI, keeps only the last 1,200 characters, then keeps the last six lines before lowercasing and matching. This prevents an old prompt in a long terminal buffer from winning over the current tail (`specs/context/mobilecli-main/cli/src/detection.rs:189-205`, `330-343`). Classification precedence is plan approval, tool approval, clarifying question, then awaiting response (`detection.rs:345-385`). A clarifying question is deliberately conservative: only the last line ending in `?` qualifies, and approval/allow text suppresses that category (`detection.rs:316-327`).

The normalized taxonomy is `tool_approval`, `plan_approval`, `clarifying_question`, and `awaiting_response` (`detection.rs:54-70`). Approval controls are separately modeled as `Numbered`, `YesNo`, `Arrow`, or `None` (`detection.rs:35-52`). The detector infers the model from visible prompt vocabulary, with arrow cues checked before numbered and yes/no cues (`detection.rs:208-242`).

### 2. CLI identity uses weighted evidence plus hysteresis

The tracker starts as `Terminal`, adds command evidence with weight 8 and output/banner evidence with weight 4, and selects a new CLI only when the best score is at least 5 and exceeds the current score by at least 2 (`detection.rs:89-150`). Confidence is a coarse bucket `(best_score / 3).clamp(0, 3)`, not a probability (`detection.rs:142-150`). For a PWA, the server’s `cli_type` should be treated as a low-cardinality hint for presentation and control selection, not as a calibrated confidence score.

### 3. Notification deduplication is keyed by prompt hash and wait type

The detector hashes a 300-character prompt suffix (`detection.rs:347-384`). On each detected event, the daemon compares the incoming hash and wait type with the stored waiting state; only a new pair updates state, broadcasts `WaitingForInput`, and schedules a push notification (`specs/context/mobilecli-main/cli/src/daemon.rs:1457-1498`). The session also stores `last_wait_hash`, but the shown notification predicate reads `waiting_state.prompt_hash` and `waiting_state.wait_type` directly (`daemon.rs:129-135`, `1461-1477`).

This is a useful browser-stream rule: key a client-side notification/UI transition by `(session_id, wait_type, prompt_hash)` and make repeated terminal redraws idempotent. However, the current wire message does not expose either `prompt_hash` or `approval_model`; `WaitingForInput` exposes only session, timestamp, prompt content, wait type, and CLI type (`specs/context/mobilecli-main/cli/src/protocol.rs:374-381`). A PWA cannot reproduce exact reconnect deduplication or choose exact approval controls from the wire alone without adding those fields or defining an equivalent client key.

### 4. Clearing is explicit and conservative

When no wait event is detected, an existing waiting state is cleared only if the normalized chunk has at least 10 non-whitespace characters; then the daemon broadcasts `WaitingCleared` (`daemon.rs:1500-1519`). User input clears waiting state immediately, resets the hash, emits `WaitingCleared`, and clears the local output buffer (`daemon.rs:1571-1585`). This gives the PWA two useful transitions: server-confirmed wait entry and server-confirmed wait exit, with a debounce threshold that avoids clearing on ANSI/control-noise fragments.

The protocol’s clear event carries only `session_id` and timestamp (`protocol.rs:382-386`). A browser client should therefore clear by session id and tolerate duplicate or late clear events. On a fresh connection, the daemon replays every currently waiting session as `WaitingForInput` (`daemon.rs:4682-4703`), so the PWA should reconcile current wait state from the server rather than rely solely on missed live events.

### 5. Approval vocabulary is stable, but transport encoding is CLI-specific

The server accepts normalized response names `yes`, `yes_always`, and `no`, then maps them to numbered input (`1/2/3`), `y/n`, or arrow-key escape sequences depending on `ApprovalModel` (`daemon.rs:4706-4726`). This is a strong PWA boundary: expose the normalized response vocabulary in UI actions and keep terminal-specific keystrokes server-side. `ApprovalModel::None` produces no approval input, so a generic “approve” button must not be shown merely because a wait event exists.

## Questions Answered

- [x] [logic] How is a raw output stream classified into a normalized wait-state, and how are duplicate notifications suppressed and stale waits cleared? The bounded-tail classifier, ordered taxonomy, weighted CLI tracker, `(prompt_hash, wait_type)` dedup predicate, 10-character clear threshold, immediate input clear, and replay behavior are confirmed above.

## Questions Remaining

- [ ] [architecture] Attach-v2 replay ordering, snapshot watermarking, and explicit resync semantics remain unresolved and were intentionally not re-mined.
- [ ] [auth] The exact PWA API/error vocabulary for unsupported auth versions, unknown/revoked credentials, timeout, capability denial, and credential rotation remains unspecified by the server sources.
- [ ] [onboarding] The PWA must decide how to infer or let users override LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints.
- [ ] [ux] The PWA protocol still needs a decision on whether to expose `prompt_hash` and `approval_model` so reconnect dedupe and exact approval controls can be implemented without inference.
- [ ] [push] Browser push provider, token retention, expiry cleanup, and cross-tab ownership remain unspecified.

## Next Focus

Final iteration: synthesize the adoptable MobileCLI patterns and explicitly separate confirmed server contracts from PWA decisions still requiring product/API design. Avoid re-mining saturated Attach-v2 internals.
