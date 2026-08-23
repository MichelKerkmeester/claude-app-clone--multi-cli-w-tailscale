# transport/: enrollment, wire calls, cache and sync lifecycle

---

## 1. OVERVIEW

`transport/` contains the browser edges that talk to the relay or persist safe local data. It has an authentication module, a typed request client, a metadata-only cache and a Svelte lifecycle that joins page loading to a read-only sync socket.

Current state:

- `auth.ts` validates enrollment and session challenges before saving a device key.
- `relay.ts` validates every important response, mints one-use tickets close to writes and records relay heartbeat evidence.
- `cache.ts` stores only bounded session and transcript history plus artifact metadata.
- `use-sync-socket.svelte.ts` owns cursor movement, message batching, retry timers, preemptive expiry refresh and cleanup.

---

## 2. ARCHITECTURE

The transport paths converge in state reducers but keep their concerns separate:

```text
Enrollment QR -> auth.ts -> IndexedDB device key -> authenticated session
UI read or write -> relay.ts -> typed HTTP response or typed socket message
Safe history -> cache.ts -> app-state initial cache -> transcript reducer
Session view -> use-sync-socket.svelte.ts -> fetchTranscript and openSyncSocket -> state reducers
Artifact block -> relay.ts readArtifact -> bounded verified bytes -> viewer
```

The socket lifecycle calls the request client rather than owning protocol parsing. The cache can seed a first paint but cannot supply current authority.

---

## 3. PACKAGE TOPOLOGY

The four modules have distinct storage and wire responsibilities:

```text
auth.ts -> device credential and session challenge
relay.ts -> HTTP, artifact and WebSocket protocol boundary
cache.ts -> localStorage read-only history boundary
use-sync-socket.svelte.ts -> Svelte lifecycle over cache, relay and state reducers
```

Allowed dependency direction:

- `auth.ts` owns the IndexedDB device record and same-origin authentication calls.
- `relay.ts` imports auth and local fixture gates, then exposes validated operations.
- `cache.ts` uses display parsing from state but strips resource state before persistence.
- `use-sync-socket.svelte.ts` calls relay operations and dispatches typed actions into connection, transcript, todo and runtime consumers.
- View and state modules consume transport results. They do not recreate ticket, retry or cache rules.

Disallowed dependency direction:

- The cache must not persist runtime authority, tickets, plan tokens, todo projections or artifact bytes.
- `navigator.onLine` must not replace relay heartbeat evidence.
- A component must not open a second session socket outside `useSyncSocket`.

---

## 4. DIRECTORY TREE

The folder is flat:

| File | Responsibility |
|---|---|
| [`auth.ts`](./auth.ts) | Enrollment, session establishment and device storage. |
| [`cache.ts`](./cache.ts) | Read-only history persistence and metadata sanitization. |
| [`relay.ts`](./relay.ts) | Typed relay operations, artifact validation and sync socket opening. |
| [`use-sync-socket.svelte.ts`](./use-sync-socket.svelte.ts) | Session sync lifecycle, retry and teardown. |
| [`README.md`](./README.md) | Feature orientation for the wire boundary. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`auth.ts`](./auth.ts) | Checks QR origin and expiry, signs enrollment and session challenges, and keeps the private key in IndexedDB. |
| [`relay.ts`](./relay.ts) | Mints tickets, validates typed responses, classifies failures and verifies artifact bytes and sync messages. |
| [`cache.ts`](./cache.ts) | Applies age, session and block limits and removes non-durable resource fields before local storage. |
| [`use-sync-socket.svelte.ts`](./use-sync-socket.svelte.ts) | Loads cache and transcript pages, resumes cursors, handles close codes and cancels all work on effect teardown. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Enrollment | The QR origin must match the current origin and the challenge must remain unexpired. |
| Session | The device signs a relay challenge. A missing or origin-mismatched device record cannot open a session. |
| Write ticket | Every prompt, command, runtime control, mode change, plan execution and attachment action gets a fresh one-use ticket. |
| Cache | Cache history is safe to render but cannot enable a mode or mutation. Artifact resources are metadata-only. |
| Artifact | Require no-store headers, matching revision and digest, bounded length and valid content metadata before returning bytes. |
| Socket | Validate session id and sync envelope payloads. Ignore malformed frames rather than entering display state. |

Main flow:

```text
Session effect -> loadCache -> hydrate matching history -> fetchTranscript
Session effect -> establishSession -> requestTicket -> openSyncSocket(cursor)
Socket message -> isReadOnlySyncMessage -> requestAnimationFrame batch -> reducers
Socket close 4001 -> connect expired -> fresh session and socket
Socket close 4003 -> stopForRevocation -> unenrolled connection
Other close -> exponential retry -> connect retry, capped at 15 seconds
Expiry timer at 80 percent -> preemptive connect -> replace old socket after open
Effect cleanup -> abort page and session work -> cancel frame and timers -> close socket
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `enrollDevice`, `establishSession`, `revokeDevice`, `logoutDevice`, `scanQrImage` | Async functions | Manage device enrollment, session challenges and device lifecycle. |
| `fetchSessions`, `fetchTranscript`, `fetchCommands` | Async functions | Read relay catalog and transcript data with response guards. |
| `requestTicket`, `submitPrompt`, `submitSlashCommand` | Async functions | Create one-use tickets and submit host-visible work. |
| `controlRuntime`, `setMode`, `executePlan` | Async functions | Run guarded runtime and plan control lanes. |
| `readArtifact` | Async function | Return verified artifact bytes or a typed read error. |
| `openSyncSocket`, `isReadOnlySyncMessage` | Functions | Open and validate the session sync stream. |
| `loadCache`, `saveCache`, `installCacheRevalidation` | Functions | Read and maintain bounded local history. |
| `useSyncSocket` | Svelte lifecycle | Join cache, page, socket, connection and reducer updates for one session. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 9. RELATED

- [`README.md`](./README.md)
- [State documentation](../state/CODE.md)
- [Fixtures documentation](../fixtures/CODE.md)
- [Format documentation](../format/CODE.md)
