---
title: 'Relay Source: Zone Map and Dependency Direction'
description: 'Zone map of the relay source folders and the allowed dependency direction between them.'
trigger_phrases:
  - 'relay source zones'
  - 'src zone map'
  - 'relay dependency direction'
---

# Relay Source: Zone Map and Dependency Direction

---

## 1. OVERVIEW

`src/` is the relay implementation. `index.ts` is the composition root and the only production entrypoint. Twelve folders each own one concern, from the loopback server to the SQLite store. Code inside the package imports the shared protocol package `@pi-remote/pi-rpc-protocol` for types, guards, and digest helpers.

Current state:

- All runtime paths start at `index.ts` and flow inward to `store/`
- `fixtures/` holds a recorded Pi RPC JSONL stream used when `pi` is unavailable
- Dependencies point inward, no folder imports another folder upward

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                           src/ (relay)                           │
╰──────────────────────────────────────────────────────────────────╯

┌─────────────┐      ┌────────────────┐      ┌─────────────────┐
│ index.ts    │ ───▶ │ http/          │ ───▶ │ auth/           │
│ composition │      │ loopback API   │      │ ingress, proof  │
└──────┬──────┘      └───────┬────────┘      └─────────────────┘
       │                     │
       │                     ├──▶ approval/ ──▶ policy/
       │                     ├──▶ prompt/ ──▶ rpc/ ──▶ fixtures/
       │                     └──▶ push/
       │
       ├──────────────▶ replay/ ────────▶ store/ (SQLite)
       └──────────────▶ rpc/ ───────────▶ fixtures/
```

---

## 3. PACKAGE TOPOLOGY

```text
src/
+-- index.ts              # Composition root, public exports
+-- approval/             # Leases, audit, final gate
+-- auth/                 # Enrollment, sessions, tickets, rate limit
+-- fixtures/             # Recorded Pi RPC JSONL fallback
+-- http/                 # Loopback HTTP and WSS server
+-- policy/               # Mutation family policy
+-- prompt/               # Steering prompt submission
+-- push/                 # Web Push and attention items
+-- release/              # Rollback drill
+-- replay/               # Sync hub for replay and live deltas
+-- rpc/                  # Pi RPC supervisor, framing, demux
+-- sessions/             # Opaque session catalog
+-- store/                # Redaction, migrations, ledger, transcript
`-- README.md
```

Allowed dependency direction:

```text
index.ts → http/, approval/, policy/, prompt/, push/, replay/, rpc/, sessions/, store/
http/ → auth/, approval/, prompt/, push/, replay/, sessions/, store/
prompt/ → rpc/, replay/, store/
approval/ → policy/, replay/, store/
push/ → store/
sessions/ → store/
replay/ → store/
rpc/ → fixtures/
release/ → approval/, policy/, replay/, store/
store/ → migrations/ (package level)
```

Disallowed dependency direction:

```text
store/ → http/, auth/, or rpc/
auth/ → approval/ or store/
policy/ → approval/
fixtures/ → code (it is data only)
```

---

## 4. DIRECTORY TREE

| Folder or file | Responsibility                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `index.ts`     | Composition root, exports `runRelay`, `mutationPiArguments`, `bindPushNotifications`, `publishPiEvent` |
| `approval/`    | Approval leases, decisions, accept-edits grants, final gate                                            |
| `auth/`        | Device enrollment, proof, sessions, tickets, action policy, rate limit                                 |
| `fixtures/`    | Recorded Pi RPC JSONL stream for supervisor fallback                                                   |
| `http/`        | Loopback HTTP and WSS server, ingress auth, extension authority routes                                 |
| `policy/`      | Mutation family enablement and default-deny check                                                      |
| `prompt/`      | Steering prompt submission through the RPC child                                                       |
| `push/`        | Web Push delivery, attention items, subscription encryption                                            |
| `release/`     | Rollback drill against a disposable database                                                           |
| `replay/`      | Sync hub joining replay snapshot and live deltas                                                       |
| `rpc/`         | Persistent Pi RPC child, JSONL framing, response demux                                                 |
| `sessions/`    | Opaque session catalog                                                                                 |
| `store/`       | Redaction, migrations, ledger, transcript projection                                                   |

---

## 5. KEY FILES

| File                           | Responsibility                                                 |
| ------------------------------ | -------------------------------------------------------------- |
| `index.ts`                     | Wires all services and owns the process lifecycle              |
| `http/server.ts`               | Loopback HTTP and WSS server with fail-closed ingress          |
| `store/relay-store.ts`         | SQLite ledger with redaction, epoch ordering, dedup, retention |
| `store/redaction.ts`           | Canonical redaction policy applied before persistence          |
| `rpc/supervisor.ts`            | Pi RPC child supervision, restart, fixture fallback            |
| `approval/approval-service.ts` | Approval state machine and execution authority                 |
| `replay/sync.ts`               | Sync hub barrier between snapshot and live deltas              |

---

## 6. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                       |
| --------- | -------------------------------------------------------------------------- |
| Imports   | Only `@pi-remote/pi-rpc-protocol` plus `node:` builtins and better-sqlite3 |
| Exports   | `index.ts` is the public surface, tests import zone modules directly       |
| Ownership | `store/` owns all persistence, `http/` owns all network ingress            |

Main flow:

```text
Pi RPC event from the supervised child
        │
        ▼
index.ts publishPiEvent
        │
        ▼
transcript projection and attention class
        │
        ▼
SyncHub.publish → RelayStore.appendEnvelope (redact first)
        │
        ▼
broadcast to subscribers and push hints
```

---

## 7. ENTRYPOINTS

| Entrypoint                    | Type   | Purpose                                                      |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| `runRelay()`                  | Export | Start the relay and return a shutdown function               |
| `mutationPiArguments(family)` | Export | Build child argv for one mutation family                     |
| `publishPiEvent(...)`         | Export | Persist and broadcast one Pi event                           |
| `src/index.ts`                | Module | Production entrypoint, runs the relay when executed directly |

---

## 8. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes all suites in `tests/`.

---

## 9. RELATED

- [`../README.md`](../README.md)
- [`../migrations/README.md`](../migrations/README.md)
- [`../tests/README.md`](../tests/README.md)
