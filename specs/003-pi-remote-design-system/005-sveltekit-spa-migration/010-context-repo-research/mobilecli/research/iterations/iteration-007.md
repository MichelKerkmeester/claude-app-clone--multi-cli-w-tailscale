# Iteration 007

## Focus

Recovery rotation on the filesystem/attachment contract and push-notification lifecycle. Attach-v2 replay internals were intentionally not re-mined because they are saturated in earlier iterations.

## Actions Taken

- Read the filesystem client and server message definitions, including request IDs, chunk metadata, and the structured `FileSystemError` enum.
- Read path validation and filesystem defaults for jail enforcement, symlink policy, denied/read-only patterns, and size/list/search limits.
- Read the per-client rate limiter and daemon dispatch sites to confirm retry behavior and operation coverage.
- Read push-token registration, scope mapping, active-credential pruning, token validation, notification text, and push payload construction.

## Findings

### F-007-01 — Filesystem operations use a request-correlated, structured response contract

Every filesystem request carries a caller-supplied `request_id`; responses preserve it on directory listings, file content, success, errors, search results, and file chunks. Chunk responses expose `chunk_index`, `total_chunks`, `total_size`, a checksum, and `is_last`, while errors are typed as a stable taxonomy including not-found, permission, traversal, type mismatch, existence, size, encoding, cancellation, and rate-limit failures (`specs/context/mobilecli-main/cli/src/protocol.rs:155-253`, `401-469`, `586-626`). A PWA should keep request identity through retries and assemble downloads by explicit chunk metadata rather than treating a websocket response order as sufficient.

### F-007-02 — Filesystem safety is defense in depth, not a single path check

Existing paths must be absolute and free of parent-directory components; when symlinks are disabled, the original path is checked before canonicalization; the canonical path is then checked against allowed jails and denied globs (`specs/context/mobilecli-main/cli/src/filesystem/security.rs:32-59`). New targets apply the same absolute/parent checks, validate the existing ancestor, enforce jail and denied-pattern checks for both canonical and caller-shaped paths, and separately apply read-only glob patterns (`specs/context/mobilecli-main/cli/src/filesystem/security.rs:61-143`, `146-189`). Defaults also disable symlink following, cap reads/writes at 50 MiB, cap directory listings at 10,000 entries and searches at 1,000 results, and deny common secret/config paths (`specs/context/mobilecli-main/cli/src/filesystem/config.rs:5-29`, `89-106`). The PWA should surface server policy errors directly and avoid implying that a visible path is writable merely because it can be listed.

### F-007-03 — Rate limiting is per websocket client and retryable by contract

The daemon stores a `RateLimiter` per socket address and maps exhausted tokens to `FileSystemError::RateLimited { retry_after_ms }` while preserving the original request ID and operation (`specs/context/mobilecli-main/cli/src/daemon.rs:331-335`, `3555-3560`, `3626-3641`). The limiter is a token bucket initialized with a burst, refills continuously at the configured requests-per-second rate, and returns the computed wait in milliseconds instead of silently dropping work (`specs/context/mobilecli-main/cli/src/filesystem/rate_limit.rs:3-39`). A browser client can therefore implement bounded, server-directed retry/backoff keyed by request ID and must distinguish rate limits from terminal permission/path errors.

### F-007-04 — Capability scope and destructive-operation checks are separate gates

Filesystem reads, writes, deletes, watches, and uploads map to distinct authorization scopes, and push registration has its own scope (`specs/context/mobilecli-main/cli/src/daemon.rs:4201-4219`). Delete and rename are additionally rejected when the server configuration flag is disabled, returning a structured permission error before rate-limit or filesystem execution; the flag defaults to false when configuration is unavailable (`specs/context/mobilecli-main/cli/src/daemon.rs:3807-3838`, `3853-3884`, `4318-4322`). Copy receives write scope and rate limiting but does not pass through that same destructive-operation gate (`specs/context/mobilecli-main/cli/src/daemon.rs:3899-3930`). The PWA should model capability denial and destructive confirmation as distinct states, and the product must decide whether copy is intentionally non-destructive or an uncovered overwrite risk before exposing it as a safe action.

### F-007-05 — Push tokens are authenticated, installation-scoped, deduplicated, and capped

Registration validates token shape, requires an authenticated mobile client, replaces the prior token for the same credential/install pair, deduplicates exact token values, and rejects a fourth token for one credential. Unregistration removes only a matching token belonging to the authenticated credential (`specs/context/mobilecli-main/cli/src/daemon.rs:3350-3412`). The token record carries token type, platform, credential ID, and mobile installation ID (`specs/context/mobilecli-main/cli/src/daemon.rs:137-146`). Before delivery, tokens tied to revoked or inactive credentials are pruned from the in-memory list (`specs/context/mobilecli-main/cli/src/daemon.rs:4264-4277`). This transfers to a PWA as an installation-level registration record with explicit replacement and revocation cleanup, but browser subscription persistence and cross-tab ownership remain product decisions not specified here.

### F-007-06 — Push delivery is decoupled from the stream and currently Expo-only in payload construction

A deduplicated waiting event broadcasts to websocket clients and snapshots active tokens, then launches notification I/O in a separate task so push latency does not block PTY processing (`specs/context/mobilecli-main/cli/src/daemon.rs:1459-1498`). The payload contains title, body, session identifiers, a `waiting_for_input` type, default sound, and high priority; the text is derived from CLI type and normalized wait type, with only a short question snippet included (`specs/context/mobilecli-main/cli/src/daemon.rs:5279-5311`, `5435-5484`). Although registration accepts `expo`, `apns`, and `fcm`, the sender filters to Expo tokens and posts to the Expo endpoint (`specs/context/mobilecli-main/cli/src/daemon.rs:5441-5468`). A PWA push adapter should preserve the event envelope and stream/push separation, while treating provider support as an explicit capability rather than assuming every registered token can receive delivery.

## Questions Answered

- [fs-contract] **Answered for the server contract:** request IDs correlate every operation, chunks carry ordering/size/checksum completion metadata, errors are typed, rate limits return retry timing, and path/capability/destructive checks are layered.
- [push] **Partially answered:** registration, replacement, deduplication, per-credential cap, revocation pruning, event trigger, and payload shape are concrete; browser subscription retention and provider coverage are not fully defined.

## Questions Remaining

- The PWA still needs a browser credential/subscription storage and cross-tab ownership policy for push registration.
- The product must decide whether `CopyPath` needs the same destructive/overwrite opt-in as delete and rename.
- The push API needs an explicit provider contract for Web Push versus the server's current Expo-only send path, including token expiry and delivery-failure cleanup.
- Attach-v2 replay, snapshot watermark, and explicit resync questions remain unresolved and were intentionally not re-mined.

## Next Focus

Use the final recovery rotation on auth/pairing edge semantics or onboarding connection-mode details, avoiding Attach-v2 internals unless new evidence invalidates the saturation record.
