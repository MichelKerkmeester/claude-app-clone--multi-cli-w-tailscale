# Relay transport and session sync

> Authentication, relay requests, metadata-only cache and read-only sync socket for the mobile app.

---

## 1. OVERVIEW

`transport/` is the wire boundary between the Svelte app and the relay. It enrolls a device, establishes authenticated sessions, validates HTTP and WebSocket payloads, reads artifact bytes, stores a bounded history cache and owns the session socket lifecycle. State modules consume typed results from here. Components do not own retry timing, ticket creation or browser storage.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Four transport and lifecycle modules |
| Durable stores | One IndexedDB device record and one metadata-only local-storage cache |
| Cache limits | Seven days, eight sessions and 500 blocks |
| Resource limit | 50 MB per artifact read |
| Reconnect policy | Exponential retry capped at 15 seconds, with preemptive session refresh |

Close handling is deliberate. Close code `4001` means the session expired and triggers a fresh connection. Close code `4003` means device revocation and stops retries in the unenrolled state. Other closes use bounded reconnect backoff.

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Device enrollment | Validates an origin-bound QR challenge, signs it with a generated P-256 key and stores the private key in IndexedDB. |
| Session establishment | Signs a relay challenge and returns an application session with an expiry time. |
| Typed relay calls | Covers sessions, transcripts, commands, runtime controls, plan actions, attachments, approvals, questions and artifacts. |
| Read-only cache | Restores useful history while excluding runtime authority, tickets, plan tokens, todo projections and resource bytes. |
| Sync socket | Resumes from a cursor, validates sync messages, batches them per animation frame and refreshes runtime state when live data arrives. |
| Artifact safety | Enforces response headers, revision, length and digest checks before bytes reach a viewer. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Browser security APIs | Web Crypto and IndexedDB | Enrollment generates and stores the device key pair. |
| Same-origin session | A valid enrolled device or the explicit local demo gate | HTTP requests use same-origin credentials. |
| Browser transport | `fetch`, `WebSocket`, `XMLHttpRequest` and abort signals | Relay reads, attachment uploads and socket cleanup use these APIs. |
| State consumers | Connection, transcript, runtime and todo reducers | Transport delivers typed data. Reducers decide how it enters app state. |
| Artifact response | Matching content type, revision, digest, length and security headers | `readArtifact` rejects a response that misses any required boundary. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`auth.ts`](./auth.ts) | Enrollment, challenge signing, session establishment, revocation, logout, QR scanning and device storage. |
| [`relay.ts`](./relay.ts) | Typed HTTP, artifact and WebSocket operations plus heartbeat and transport error classification. |
| [`cache.ts`](./cache.ts) | Bounded read-only persistence for session cards, transcript history and artifact metadata. |
| [`use-sync-socket.svelte.ts`](./use-sync-socket.svelte.ts) | Cache hydrate, transcript page load, socket connect, retry, session refresh and teardown. |
| [`CODE.md`](./CODE.md) | Detailed ownership, close handling and data flow. |

---

## 5. USAGE EXAMPLES

| Situation | What happens |
|---|---|
| The app starts with cached history | `useSyncSocket` hydrates the matching transcript, then fetches an authoritative page before sync resumes. |
| A sync socket receives a valid message | `relay.ts` validates it, `useSyncSocket` updates its cursor and batches reducer actions for one animation frame. |
| The socket closes with `4001` | The lifecycle reconnects immediately so it can obtain a fresh authenticated session. |
| The socket closes with `4003` | The lifecycle stops retrying and dispatches the unenrolled connection state. |
| The device goes offline | The lifecycle reports offline and waits for the browser to become usable before retrying. |
| A viewer opens an artifact | `readArtifact` fetches no-store bytes and checks headers, size and digest before returning them. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| History appears but controls are disabled | The cache contains display history, not current runtime authority. | Wait for `useRuntime` to hydrate a live snapshot. |
| A socket reconnects repeatedly | The relay is unavailable, the device is offline or the session expires during connection. | Read the connection phase and relay heartbeat. The lifecycle caps retry delay and retries only while the session remains valid. |
| The app becomes unenrolled after a socket close | Close code `4003` indicates device revocation. | Enroll the device again. Do not bypass the state with cached credentials. |
| An artifact says it is unavailable or conflicted | The block is not ready or the response metadata does not match the expected revision and digest. | Re-read the current block and request the resource again through `readArtifact`. |
| A stale transcript remains after switching sessions | An old effect or socket is still writing into the new session. | Ensure the `useSyncSocket` cleanup aborts the page request, cancels timers and closes the old socket. |

---

## 7. FAQ

**Q: Is the local cache a source of current authority?**

A: No. It can restore session cards and safe transcript history. Runtime mode, revisions, tickets, executable plan tokens and todo projections require live state.

**Q: Why does the socket refresh before its expiry time?**

A: The lifecycle schedules a preemptive connection at 80 percent of the session lifetime. That avoids waiting for the relay to close a near-expired socket.

**Q: Why are some artifact reads rejected even with HTTP 200?**

A: The response must match the block's content type, revision, digest and length and include the required no-store security headers. A successful status alone is insufficient.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Transport topology, close handling and ownership rules. |
| [State documentation](../state/README.md) | Reducers that consume transport results. |
| [Fixtures documentation](../fixtures/README.md) | Local responses used when the explicit demo gate is active. |
| [Format documentation](../format/README.md) | Attention and push client helpers that sit beside transport. |
| [Shared layer documentation](../README.md) | The broader shared data and logic boundary. |
