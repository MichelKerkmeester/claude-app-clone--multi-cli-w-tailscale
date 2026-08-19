---
title: 'replay/: Replay and Live Sync Barrier'
description: 'SyncHub joins replay plans and live deltas behind one coversThrough barrier.'
trigger_phrases:
  - 'sync hub'
  - 'replay barrier'
  - 'sync delta snapshot gap'
---

# replay/: Replay and Live Sync Barrier

> SyncHub joins replay plans and live deltas behind one coversThrough barrier without interleaving pre-snapshot messages.

---

## 1. TABLE OF CONTENTS

- [2. OVERVIEW](#2-overview)
- [3. ARCHITECTURE](#3-architecture)
- [4. KEY FILES](#4-key-files)
- [5. BOUNDARIES AND FLOW](#5-boundaries-and-flow)
- [6. ENTRYPOINTS](#6-entrypoints)
- [7. VALIDATION](#7-validation)
- [8. RELATED](#8-related)

---

## 2. OVERVIEW

`replay/` owns `SyncHub` in `sync.ts`, the delivery barrier that joins replay and live sync. `publish` redacts and persists an envelope through `RelayStore.appendEnvelope` before any subscriber hears about it. `subscribe` sends the cursor plan built by `store.createSyncPlan`, which yields `sync.snapshot`, `sync.delta` or `sync.gap` messages, and only then releases live deltas with `seq` past the plan barrier.

Current state:

- One subscription per device, matched by host id, workspace ref and session id
- Envelopes arriving during plan send are queued and flushed in ascending seq order
- Every sync message carries a `coversThrough` reconnect cursor
- `onCommitted` listeners run only after a committed insert
- The plan barrier is frozen at the committed high-water seq at subscribe time

The plan variants come from `store.createSyncPlan`. Without a cursor the plan is one `sync.snapshot` from the stream floor to the high-water mark. A cursor naming another epoch, a sequence below the retention floor or a sequence past the high-water mark yields a `sync.gap` with reason `epoch`, `retention` or `ahead`, followed by a fresh snapshot. An unknown stream id yields a `sync.gap` with reason `unknown-session`. A matching cursor yields one `sync.delta` from the cursor sequence to the high-water mark.

---

## 3. ARCHITECTURE

```text
publish(candidate)
        │ store.appendEnvelope (redact, dedupe, commit)
        ▼
inserted ? broadcast(envelope) + committed listeners
        │
        ▼
broadcast matches hostId, workspaceRef, sessionId
        │
        ├─ isInitializing ? queue the envelope
        └─ else send delta(envelope)

subscribe(identity, send, cursor?)
        │ store.createSyncPlan(identity, cursor)
        ▼
barrier = plan.barrier, send plan.messages
        │
        ▼
flush queued envelopes with seq > barrier, ascending
        │
        ▼
return unsubscribe
```

Dependency direction: `SyncHub` → `RelayStore`. `SyncHub` builds messages, the store owns persistence and the plan.

---

## 4. KEY FILES

| File      | Responsibility                                                           |
| --------- | ------------------------------------------------------------------------ |
| `sync.ts` | `SyncHub`, subscription set, barrier, delta builder, committed listeners |

---

## 5. BOUNDARIES AND FLOW

| Boundary      | Rule                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imports       | `RelayStore` type from `../store/relay-store.js`, protocol types `Envelope`, `SyncCursor`, `SyncDelta`, `SyncMessage` from `@pi-remote/pi-rpc-protocol` |
| Exports       | The `SyncHub` class only                                                                                                                                |
| Ownership     | Envelope persistence and plan building belong to the store, `SyncHub` orders delivery                                                                   |
| Delivery rule | Live deltas never precede the replay plan, queued deltas flush only past the barrier                                                                    |

Main flow:

```text
publish(candidate)
        │
        ▼
store.appendEnvelope(candidate)
        │
        ├─ inserted ? broadcast + committed listeners
        └─ not inserted ? return persisted envelope, no broadcast
```

---

## 6. ENTRYPOINTS

| Entrypoint                                   | Type   | Purpose                                                  |
| -------------------------------------------- | ------ | -------------------------------------------------------- |
| `SyncHub.publish(candidate)`                 | Method | Persist then broadcast, return the committed envelope    |
| `SyncHub.subscribe(identity, send, cursor?)` | Method | Send a cursor plan then live deltas, return unsubscribe  |
| `SyncHub.onCommitted(listener)`              | Method | Register a post-persistence listener, return unsubscribe |

---

## 7. VALIDATION

Run from the Pi Remote root.

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes `tests/sync.test.ts` alongside the other suites.

---

## 8. RELATED

- [`src README`](../README.md)
- [`store README`](../store/README.md)
- [`relay package README`](../../README.md)
