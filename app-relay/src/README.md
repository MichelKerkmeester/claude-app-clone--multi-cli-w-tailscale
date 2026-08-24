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

`src/` is the relay implementation. `index.ts` is the composition root and the only production entrypoint. Sixteen folders each own one concern, from the loopback server to the SQLite store. Code inside the package imports the shared protocol package `@pi-remote/pi-rpc-protocol` for types, guards, and digest helpers.

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
+-- ask-question/         # Host-owned ask-question authority
+-- attachments/          # Inbound media: decode, normalize, deliver, reap
+-- auth/                 # Enrollment, sessions, tickets, rate limit
+-- commands/             # Versioned command catalog authority
+-- fixtures/             # Recorded Pi RPC JSONL fallback
+-- http/                 # Loopback HTTP and WSS server
+-- policy/               # Mutation family policy
+-- prompt/               # Steering prompt submission
+-- push/                 # Web Push and attention items
+-- release/              # Rollback drill
+-- replay/               # Sync hub for replay and live deltas
+-- rpc/                  # Pi RPC supervisor, framing, demux
+-- runtime/              # Authoritative runtime control, plan status
+-- sessions/             # Opaque session catalog
+-- store/                # Redaction, migrations, ledger, transcript
`-- README.md
```

Allowed dependency direction:

```text
index.ts → http/, approval/, ask-question/, attachments/, commands/, policy/, prompt/, push/, replay/, rpc/, runtime/, sessions/, store/
http/ → auth/, approval/, ask-question/, attachments/, commands/, prompt/, push/, replay/, runtime/, sessions/, store/
ask-question/ → auth/, replay/, store/
attachments/ → auth/
commands/ → rpc/, store/
prompt/ → attachments/, commands/, rpc/, replay/, store/
approval/ → policy/, replay/, store/
push/ → store/
runtime/ → rpc/, store/
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
| `ask-question/`| Host-owned ask-question authority: present, answer and resolve Pi's questions                          |
| `attachments/` | Inbound media: sniff, decode, normalize, deliver to Pi, redacted transcript projection, reap           |
| `auth/`        | Device enrollment, proof, sessions, tickets, action policy, rate limit                                 |
| `commands/`    | Versioned command catalog authority                                                                    |
| `fixtures/`    | Recorded Pi RPC JSONL stream for supervisor fallback                                                   |
| `http/`        | Loopback HTTP and WSS server, ingress auth, extension authority routes                                 |
| `policy/`      | Mutation family enablement and default-deny check                                                      |
| `prompt/`      | Steering prompt submission through the RPC child                                                       |
| `push/`        | Web Push delivery, attention items, subscription encryption                                            |
| `release/`     | Rollback drill against a disposable database                                                           |
| `replay/`      | Sync hub joining replay snapshot and live deltas                                                       |
| `rpc/`         | Persistent Pi RPC child, JSONL framing, response demux                                                 |
| `runtime/`     | Authoritative runtime control service and plan-status projection                                       |
| `sessions/`    | Opaque session catalog                                                                                 |
| `store/`       | Redaction, migrations, ledger, transcript projection                                                   |

---

## 5. WHERE A CHANGE GOES

Each folder owns one concern. Match the change you have to the folder that owns it. `attachments/` is
large enough to carry [its own README](./attachments/README.md); the rest earn a row here.

| Folder | Owns | A change lands here when you… |
| ------ | ---- | ---------------------------- |
| `approval/`    | Approval leases and the final execution gate | change how host approval is granted, leased or expired, or the final check before a mutation runs |
| `ask-question/`| The host-owned ask-question authority | change how Pi's questions are presented, answered or resolved |
| `attachments/` | Inbound media end to end ([README](./attachments/README.md)) | change media limits, decoding, normalization, delivery to Pi, transcript redaction or retention |
| `auth/`        | Device enrollment, app sessions, action authorization, rate limiting | change how a device enrolls, how a session is proven, which action is authorized, or a rate limit |
| `commands/`    | The versioned command catalog | change the command catalog or how its versions are served |
| `fixtures/`    | Recorded Pi RPC JSONL used when Pi is unavailable | update the recorded fallback stream (data only, no code) |
| `http/`        | The loopback HTTP and WSS server and ingress | change the network surface, ingress auth, or a route |
| `policy/`      | The mutation-command family policy | change which mutation families are enabled or the default-deny check |
| `prompt/`      | Steering prompt submission and accepted-revision coordination | change how a steering prompt is submitted or how an accepted revision is coordinated |
| `push/`        | Web Push delivery and attention items | change push delivery, attention signalling, or subscription encryption |
| `release/`     | The release rollback drill | change how a rollback is drilled against a disposable database |
| `replay/`      | The sync hub barrier joining replay snapshot and live deltas | change how replay and live sync are ordered or barriered |
| `rpc/`         | The Pi RPC transport: supervisor, framing, demux | change RPC child supervision, JSONL framing, or response and event demux |
| `runtime/`     | The authoritative runtime control service and plan status | change runtime control or how plan status is projected |
| `sessions/`    | The opaque session catalog | change how opaque session ids are minted or looked up |
| `store/`       | All persistence: SQLite ledger, migrations, redaction, artifact snapshots, projections | change persistence, a migration, redaction policy, artifact snapshots, or a projection |

---

## 6. KEY FILES

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

## 7. BOUNDARIES AND FLOW

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

## 8. ENTRYPOINTS

| Entrypoint                    | Type   | Purpose                                                      |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| `runRelay()`                  | Export | Start the relay and return a shutdown function               |
| `mutationPiArguments(family)` | Export | Build child argv for one mutation family                     |
| `publishPiEvent(...)`         | Export | Persist and broadcast one Pi event                           |
| `src/index.ts`                | Module | Production entrypoint, runs the relay when executed directly |

---

## 9. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes all suites in `tests/`.

---

## 10. RELATED

- [`../README.md`](../README.md)
- [`../migrations/README.md`](../migrations/README.md)
- [`../tests/README.md`](../tests/README.md)
