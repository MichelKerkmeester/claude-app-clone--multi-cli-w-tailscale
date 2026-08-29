# Iteration 005 — Pairing, wait states, filesystem contract, and push events

## Focus

Map MobileCLI's no-account pairing/authentication, wait-state detection, filesystem safety contract, and push event model into adoptable patterns for the Pi Remote SvelteKit mobile PWA.

## Actions Taken

- Read the auth credential model and challenge-response wire messages in `specs/context/mobilecli-main/cli/src/auth.rs:10-156` and `specs/context/mobilecli-main/cli/src/protocol.rs:47-68,255-278`.
- Read the QR payload, setup configuration, and documented LAN/Tailscale/custom onboarding paths in `specs/context/mobilecli-main/cli/src/protocol.rs:628-705`, `specs/context/mobilecli-main/cli/src/setup.rs:12-21,75-103,124-200`, and `specs/context/mobilecli-main/README.md:80-86,208-216`.
- Read wait classification, prompt hashing, duplicate suppression, stale-wait clearing, and push dispatch in `specs/context/mobilecli-main/cli/src/detection.rs:35-79,194-242,245-387` and `specs/context/mobilecli-main/cli/src/daemon.rs:1457-1520`.
- Read the filesystem request/response types, path jail, rate limiter, scope gate, and destructive-operation branches in `specs/context/mobilecli-main/cli/src/protocol.rs:155-231,401-469,577-626`, `specs/context/mobilecli-main/cli/src/filesystem/security.rs:11-189`, `specs/context/mobilecli-main/cli/src/filesystem/rate_limit.rs:1-39`, and `specs/context/mobilecli-main/cli/src/daemon.rs:2268-2287,3811-3928,4184-4241`.
- Read push-token registration/retention and notification payload construction in `specs/context/mobilecli-main/cli/src/daemon.rs:127-154,3350-3412,4264-4316,4578-4622,5279-5311,5435-5484`.

## Findings

### 1. No-account pairing is a device credential, not a user session

MobileCLI creates a random 32-byte pairing token, stores only a domain-separated SHA-256 verifier on the daemon, and assigns the credential a stable ID, name, scopes, timestamps, and revocation timestamp (`auth.rs:10-12,46-69,93-118`). The client proves possession through `AuthStart` → `AuthChallenge` → `AuthResponse`; the transcript binds server ID, credential ID, both nonces, and the mobile installation ID, and the proof is HMAC-SHA256 with constant-time comparison (`protocol.rs:51-68,259-264`; `auth.rs:120-156`).

Adopt this in the PWA as a per-device pairing record: `server_id`, `credential_id`, endpoint, installation ID, and a token held only by the paired browser profile. Keep the server-side model credential-centric and scope each authenticated socket before allowing sessions, filesystem, or push registration. The daemon maps each message to one required scope and rejects missing/inactive credentials before dispatch (`daemon.rs:2268-2287,4184-4241`). Rotation/revocation should invalidate the credential, not merely the current socket; MobileCLI exposes both single-credential revoke and rotate-all-and-pair-again flows (`auth.rs:59-69`; `README.md:98-104,231-236`).

### 2. QR onboarding is self-hosted and endpoint-explicit

The QR is a compact device-level `mobilecli://` URI containing the WebSocket host/port, device metadata, auth version, server ID, credential ID, and one-time pairing token (`protocol.rs:628-705`). It intentionally pairs a device rather than a transient session, after which the client fetches the session list (`protocol.rs:665-669`). The documented UX is scan QR → connect using the embedded `ws://`/`wss://` endpoint → authenticate; manual setup must include the full credential tuple, because URL-only setup cannot complete auth-v2 (`README.md:80-86`; `cli/README.md:79-81`).

For the PWA, make the scanner/import route the single source of truth and show a reviewable connection card before persisting it. Preserve explicit mode metadata for LAN, Tailscale, and custom protected URLs: LAN is auto-detected, Tailscale selects a Tailnet IP, and custom mode requires a supplied endpoint (`README.md:208-216`). A useful server-side safety behavior is to expose only loopback when no active mobile credential exists and to avoid implicit all-interface binding (`daemon.rs:537-575`).

### 3. Wait detection is a normalized, conservative state machine

Raw ANSI output is stripped, reduced to the latest 1200 characters and last six lines, then classified in priority order as plan approval, tool approval, clarifying question, or awaiting response (`detection.rs:189-206,245-327,330-387`). Approval affordances are normalized to numbered, yes/no, arrow, or none; defaults vary by CLI (`detection.rs:35-52`). A prompt hash is derived from the last 300 characters (`detection.rs:347-384`).

The daemon emits a waiting event only when the new hash or wait type differs from the stored state, then clears the state only after a non-prompt chunk contains at least ten non-whitespace characters (`daemon.rs:1459-1520`). The PWA should model this as an idempotent event reducer keyed by `session_id + wait_type + prompt_hash`, render approval controls from the normalized vocabulary, and treat `WaitingCleared` as authoritative. This avoids client-side notification storms while retaining enough prompt content for a question card.

### 4. Filesystem access has a structured envelope, layered authorization, and bounded work

Every filesystem request carries a `request_id`; success responses identify the operation and path, while failures use `OperationError { request_id, operation, path, error }` (`protocol.rs:155-231,401-469`; `daemon.rs:4324-4342`). The error taxonomy distinguishes not-found, permission, traversal, type mismatch, conflict, non-empty directory, size, encoding, cancellation, I/O, and rate-limit failures (`protocol.rs:577-626`).

The server first applies credential scope checks (`daemon.rs:4184-4241`), then a per-socket token bucket returns `RateLimited { retry_after_ms }` (`filesystem/rate_limit.rs:11-39`; `daemon.rs:3543-3561`). Paths must be absolute, cannot contain parent traversal, are checked against allowed jails and denied globs, and reject symlinks by default (`filesystem/security.rs:32-58,61-143,166-189`). Defaults restrict roots, deny common secret material, cap reads/writes at 50 MiB, cap listings/searches, and mark system paths read-only (`filesystem/config.rs:31-106`).

The PWA should expose these as stable machine-readable error codes with retry UI only for rate limits, preserve `request_id` across retries, and never infer that an operation succeeded from a socket write. Destructive delete and rename are additionally disabled unless the daemon config opts in (`daemon.rs:3811-3895,4318-4322`). Copy is scope- and rate-limited but its dispatch path does not apply the same destructive opt-in (`daemon.rs:3899-3928`); treat copy-overwrite as destructive in the PWA contract until the server contract is made explicit.

### 5. Push is a decoupled projection of a deduplicated wait event

The daemon broadcasts `WaitingForInput` to authenticated live sockets and independently spawns push delivery so the PTY loop is not blocked (`daemon.rs:1483-1498,4578-4622`). Push payloads are built from the normalized wait type, session name, CLI label, and session ID; the Expo payload includes `type: "waiting_for_input"`, both camelCase and snake_case session keys, default sound, and high priority (`daemon.rs:5279-5311,5435-5484`).

Registration requires authentication and validates token shape, replaces an installation's prior token, deduplicates exact values, caps each credential at three tokens, and supports explicit unregister (`daemon.rs:3350-3412,4301-4316`). Before sending, tokens tied to revoked credentials are pruned (`daemon.rs:4264-4277`). The PWA should therefore register push independently of the stream, attach the active credential and browser installation identity, deep-link notification taps by `session_id`, and tolerate push failure without changing stream state. This model is directly transferable even if the PWA uses Web Push rather than Expo.

## Questions Answered

- **No-account auth:** Pair a browser/device credential, store only a verifier server-side, and authenticate with a nonce-bound HMAC transcript before any privileged message.
- **Onboarding:** Scan/import a device-level QR payload, preserve the explicit endpoint/mode, then complete challenge-response before showing sessions.
- **Wait state:** Normalize raw output into four wait types, dedupe by wait type plus prompt hash, and clear only on meaningful non-prompt output or an explicit clear event.
- **Filesystem contract:** Use request-correlated structured responses, scope gates, path-jail validation, token-bucket retry hints, and explicit destructive-operation policy.
- **Push model:** Treat push as an asynchronous projection of a deduplicated waiting event, with credential-bound token retention and revocation pruning.

## Questions Remaining

- The target PWA still needs a concrete browser credential-storage and cross-tab ownership policy; the daemon evidence proves the server model but not a web-safe storage implementation.
- The exact PWA API shape for pairing failure, credential rotation, and capability downgrade is not defined by MobileCLI's server-only sources.
- The server's copy-operation semantics need an explicit decision about overwrite/destructive opt-in before the PWA exposes copy as a safe write action.
- The previously open Attach-v2 resync, snapshot watermark, and tmux snapshot-version questions remain unresolved.

## Next Focus

Define the PWA-facing resync request/response and recovery UX for sequence gaps, broadcast lag, and authoritative snapshot reload, including how it composes with the pairing and wait-state reducers above.
