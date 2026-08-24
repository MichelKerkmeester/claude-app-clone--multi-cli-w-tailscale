# Iteration 010

## Focus

Final recovery-rotation synthesis of MobileCLI's wait-state classifier and notification state machine. Attach-v2 replay internals were intentionally not re-mined because they were saturated in iterations 1–4.

## Actions Taken

1. Read the research charter, prior iteration 009 narrative/delta, and the latest deep-research state log.
2. Located the read-only MobileCLI context repository at `specs/context/mobilecli-main` and read the complete detection module.
3. Read the daemon output/input transitions and the `WaitingForInput` / `WaitingCleared` protocol variants.
4. Compared server-internal fields with the fields exposed on the wire, then recorded the confirmed browser-transfer pattern and unresolved API decisions.

## Findings

### 1. Use a bounded, normalized tail before classifying waits

The server strips ANSI escapes, limits the input to the last 1,200 characters, then retains only the last six lines before lowercasing. This bounds work and prevents stale prompts elsewhere in a long terminal buffer from winning (`specs/context/mobilecli-main/cli/src/detection.rs:189-205`, `330-343`). Classification precedence is plan approval, tool approval, clarifying question, then awaiting response (`detection.rs:345-385`). A clarifying question is accepted only when the final line ends with `?`, and approval/allow language suppresses that category (`detection.rs:316-327`).

Adoptable PWA rule: normalize the server event, render the supplied prompt as data, and do not independently infer a wait from arbitrary streamed text unless the product explicitly accepts client/server disagreement.

### 2. Keep wait taxonomy and approval mechanics separate

The normalized wait taxonomy is `tool_approval`, `plan_approval`, `clarifying_question`, and `awaiting_response` (`detection.rs:54-70`). Approval mechanics are a separate four-value model: `Numbered`, `YesNo`, `Arrow`, or `None` (`detection.rs:46-52`). The detector chooses arrow cues before numbered and yes/no cues (`detection.rs:208-242`).

The daemon accepts normalized response intent (`yes`, `yes_always`, `no`) and maps it to CLI-specific keystrokes; the PWA should expose the normalized intent while keeping terminal encoding server-side. The current wire message does not include `approval_model`, so exact control rendering cannot be derived reliably from `WaitingForInput` alone (`specs/context/mobilecli-main/cli/src/protocol.rs:374-386`).

### 3. CLI identity is a hint stabilized by scored hysteresis

`CliTracker` accumulates weighted command and output signals, starts at `Terminal`, and switches identity only when the best score is at least 5 and exceeds the current score by at least 2 (`specs/context/mobilecli-main/cli/src/detection.rs:82-150`). Its confidence is a coarse bucket derived from score, not a probability (`detection.rs:142-150`).

Adoptable PWA rule: treat `cli_type` as a low-cardinality presentation/control hint with hysteresis, never as calibrated confidence or an authorization decision.

### 4. Notification deduplication and clearing are explicit state transitions

For each detected event, the daemon treats it as new only when either `prompt_hash` or `wait_type` differs from the stored waiting state; only then does it update state, broadcast `WaitingForInput`, and schedule push work (`specs/context/mobilecli-main/cli/src/daemon.rs:1457-1498`). The detector hashes a 300-character prompt suffix (`detection.rs:347-384`). When no wait is detected, an existing wait clears only after at least 10 non-whitespace characters arrive (`daemon.rs:1500-1519`); user input clears immediately and resets the hash (`daemon.rs:1571-1585`).

Adoptable PWA rule: model wait entry and wait exit as idempotent events keyed by session. For reconnects, reconcile the server's current wait snapshot rather than assuming all live transitions were observed.

### 5. The current wire contract leaves two fields unavailable to browser clients

`WaitingForInput` exposes session, timestamp, prompt content, wait type, and CLI type, while `WaitingCleared` exposes session and timestamp (`specs/context/mobilecli-main/cli/src/protocol.rs:374-386`). Neither `prompt_hash` nor `approval_model` is sent. Therefore, exact browser-side replay deduplication and exact approval-control selection require either adding those fields to the protocol or defining a documented equivalent key/capability response; they must not be inferred from rendered prompt text.

## Questions Answered

- [x] [logic] Raw output is converted into a bounded normalized tail, classified by an ordered wait taxonomy, and deduplicated by `(prompt_hash, wait_type)`; stale waits clear after meaningful output or explicit user input.
- [x] [ux] The server-side approval vocabulary can remain normalized at the PWA boundary while CLI-specific keystrokes remain server-owned.

## Questions Remaining

- [ ] [architecture] Attach-v2 replay ordering, snapshot watermarking, and explicit resync semantics remain unresolved and were intentionally not re-mined.
- [ ] [auth] The exact PWA error vocabulary for unsupported auth versions, revoked/unknown credentials, timeout, capability denial, and rotation remains unspecified by the server sources.
- [ ] [onboarding] The PWA still needs a policy for LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints.
- [ ] [ux] Product/API design must decide whether to expose `prompt_hash` and `approval_model` (or an equivalent server-issued dedup/control descriptor).
- [ ] [push] Browser push provider, token retention/expiry cleanup, and cross-tab ownership remain unspecified.

## Next Focus

Research is complete at the configured ten-iteration limit. Carry the confirmed wait-state contracts into the PWA design, and resolve the listed protocol/product decisions before implementing browser reconnect, approval controls, or push registration.
