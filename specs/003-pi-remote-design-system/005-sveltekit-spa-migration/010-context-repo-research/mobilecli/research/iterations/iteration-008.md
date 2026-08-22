# Iteration 008

## Focus

Recovery rotation on auth/pairing edge semantics and onboarding connection-mode details. Attach-v2 replay internals were intentionally not re-mined because earlier runs saturated that direction.

## Actions Taken

- Read the auth model and challenge-response helpers in `cli/src/auth.rs`.
- Read the WebSocket auth message contract and server-side validation path in `cli/src/protocol.rs` and `cli/src/daemon.rs`.
- Read credential rotation/revocation commands and scope-to-operation mapping.
- Read QR serialization, setup configuration, LAN/Tailscale detection, and custom-URL onboarding paths.
- Compared the implementation with the repository README and architecture quick reference.

## Findings

### F-008-01 — Pairing stores a verifier while the raw secret remains a one-time client handoff

Credential generation creates 32 random token bytes, exposes the base64 token only in the returned pairing object, and stores a domain-separated SHA-256 verifier in `AuthCredential`; the credential record contains identity, scopes, timestamps, and revocation state but not the raw token (`specs/context/mobilecli-main/cli/src/auth.rs:46-57`, `93-118`). This is a useful PWA contract: the QR/import step is the only point where the client receives the pairing secret, while the server persists only a verifier.

### F-008-02 — The auth proof is bound to server, credential, both nonces, and installation identity

The transcript joins an auth-v2 domain marker with `server_id`, `credential_id`, `client_nonce`, `server_nonce`, and `mobile_installation_id`; the proof is HMAC-SHA256 over that transcript and comparison is constant-time (`specs/context/mobilecli-main/cli/src/auth.rs:120-155`). The wire flow requires an auth-versioned `AuthStart`, returns an `AuthChallenge` containing server identity and nonce, and accepts an `AuthResponse` only when every echoed field matches before validating the proof (`specs/context/mobilecli-main/cli/src/protocol.rs:51-68`, `259-264`; `specs/context/mobilecli-main/cli/src/daemon.rs:775-882`). A browser client should preserve the challenge fields exactly and treat any mismatch as a fresh-auth failure, not as a reconnectable stream event.

### F-008-03 — Capabilities are credential data and are rechecked against revocation at operation time

The server defines separate scopes for session read/control/spawn, filesystem read/write/delete/watch/upload, and push registration; newly generated credentials receive the default scope set (`specs/context/mobilecli-main/cli/src/auth.rs:19-44`). Unknown or revoked credentials fail active lookup, successful authentication copies the credential scopes into the authenticated client, and each incoming operation maps to a required scope; the gate also checks that the credential is still active on disk (`specs/context/mobilecli-main/cli/src/daemon.rs:808-816`, `818-882`, `4190-4241`). This gives the PWA a stable capability vocabulary and implies that capability-denied UI must be distinct from transport/auth failure.

### F-008-04 — Rotation and revocation are explicit, persistent, and invalidate existing access by identity

`pair --rotate` marks every existing credential revoked before creating and saving a fresh credential/QR; individual credential revocation persists the same timestamped state (`specs/context/mobilecli-main/cli/src/main.rs:472-520`, `590-604`). The daemon also records `last_used_at` after successful authentication and applies a ten-second response timeout during the challenge exchange (`specs/context/mobilecli-main/cli/src/daemon.rs:970-1033`). A PWA pairing store should therefore model credential identity and active/revoked state separately from the secret, and should surface rotation as a device-wide invalidation event when the server reports an auth failure.

### F-008-05 — QR pairing is device-level and carries enough metadata for multi-machine enrollment

`ConnectionInfo::to_compact_qr` removes the WebSocket scheme from the authority, encodes device ID/name, auth version, server ID, credential ID, and the one-time token, and adds `wss=1` when the source URL is secure (`specs/context/mobilecli-main/cli/src/protocol.rs:628-715`). The implementation explicitly treats the QR as persistent device pairing rather than a session-specific link, after which the mobile client fetches sessions (`specs/context/mobilecli-main/cli/src/protocol.rs:663-669`). The PWA should store a server/device record and then discover sessions, rather than making the QR itself the identity of a chat/session.

### F-008-06 — Onboarding exposes three deliberate network modes with concrete detection/fallback behavior

The setup model distinguishes Local, Tailscale, and Custom URL modes (`specs/context/mobilecli-main/cli/src/setup.rs:12-21`). Local mode records the detected local IP; Tailscale mode checks installation, login/backend state, and the first Tailscale IP; Custom mode accepts an explicit `ws://` or `wss://` URL (`specs/context/mobilecli-main/cli/src/setup.rs:360-430`, `581-686`). The documented UX is scan QR, store the device and pairing secret, connect over the selected path, then run `auth_start → auth_challenge → auth_response` (`specs/context/mobilecli-main/README.md:80-86`, `208-216`; `specs/context/mobilecli-main/docs/ARCHITECTURE_QUICK_REFERENCE.md:20-30`). For a PWA, the connection-mode selector can be inferred from the QR's authority and secure-scheme flag, but browser reachability, mixed-content restrictions, and Tailscale availability still require product-specific handling.

## Questions Answered

- [auth] **Answered for the server model:** the raw token is converted to a stored verifier; the proof is HMAC-bound to server, credential, nonce, and installation identity; scopes are copied into the authenticated client; and active-state checks gate later operations. Rotation revokes all existing credentials before issuing a new one, while individual revocation is persistent.
- [onboarding] **Answered for the documented flow:** setup selects LAN, Tailscale, or custom URL; QR carries connection and credential metadata; the client stores the pairing secret; and authentication follows the three-message challenge-response sequence before sessions or other data are exposed.

## Questions Remaining

- The PWA still needs a browser-safe secret-storage policy, including whether the pairing secret is kept in IndexedDB, a platform credential store, or another protected boundary.
- The exact PWA API/error vocabulary for unsupported auth versions, unknown/revoked credentials, timeout, capability denial, and credential rotation is not specified by the server sources.
- The PWA must decide how to infer or let users override LAN versus Tailscale versus custom connectivity, including secure-context and mixed-content constraints.
- Scope downgrade/upgrade semantics are not defined; the server currently persists the credential's scope list, but no client-facing capability-management message was found.
- Attach-v2 replay, snapshot watermark, and explicit resync questions remain unresolved and were intentionally not re-mined.

## Next Focus

Final iteration should synthesize the adoptable PWA contract across auth, onboarding, wait-state, filesystem, push, and reconnect findings, while preserving the unresolved product decisions instead of inferring browser-specific behavior from the server-only sources.
