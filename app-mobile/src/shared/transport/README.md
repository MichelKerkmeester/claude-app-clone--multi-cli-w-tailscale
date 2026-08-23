# Transport

The wire boundary — device enrollment, relay requests, the read-only cache, and the session sync socket. UI state consumes the typed results from here; it does not own authentication, retry timing, or browser storage. This folder changes when the relay contract, session authority, or cache boundary changes.

## What lives here

- **`auth.ts`** — device enrollment from QR data, ECDSA signing, session establishment, revocation, logout, QR image scanning, and the IndexedDB device record.
- **`relay.ts`** — authenticated HTTP and WebSocket operations for sessions, transcripts, commands, runtime controls, attachments, approvals, questions, and artifacts; also owns heartbeat evidence and bounded transport errors.
- **`cache.ts`** — the age- and size-bounded read-only cache for session cards, transcript blocks, and artifact metadata. Resource bytes and other non-durable state are stripped before persistence.
- **`use-sync-socket.svelte.ts`** — the Svelte lifecycle that hydrates cached history, loads the authoritative page, opens the sync socket, batches messages, retries connections, and tears everything down.

## Why it's shaped this way

- **The wire stays below state.** Relay validation and transport failures are handled at the boundary; reducers decide how accepted data appears in the app.
- **Cache is history, not authority.** A cached transcript can make the first paint useful, but it cannot establish the current runtime mode, revision, ticket, or plan state.
- **Socket lifecycle is one owner.** Cursor tracking, aborts, retry timers, animation-frame batching, and cleanup stay together so a session switch cannot leave an old connection writing into the new one.
- **Authentication is origin-bound.** Enrollment and session establishment validate the relay origin, challenge lifetime, protocol response, and device key before a session is considered usable.

Structure and transport do-nots are in `CODE.md`.
