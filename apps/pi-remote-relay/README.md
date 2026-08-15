---
title: 'Pi Remote Relay: Loopback RPC Relay Package'
description: 'Supervises one pi --mode rpc child, persists a redacted envelope ledger, and serves a fail-closed loopback HTTP and WSS API.'
trigger_phrases:
  - 'pi remote relay'
  - '@pi-remote/relay'
  - 'relay package'
---

# Pi Remote Relay: Loopback RPC Relay Package

---

## 1. OVERVIEW

`apps/pi-remote-relay/` is the `@pi-remote/relay` workspace package. It owns one supervised `pi --mode rpc` child process, a durable redacted envelope ledger in better-sqlite3, and a loopback-only HTTP and WebSocket API for enrolled tailnet devices. Every envelope is redacted before persistence or broadcast, so the ledger and the API never carry raw paths, secrets, or private prompt text.

Current state:

- `src/index.ts` wires the store, catalog, sync hub, push, policy, approvals, prompt service, and RPC supervisor into one relay and returns a shutdown function
- Mutation is off by default and enabled only when `PI_REMOTE_MUTATION_ENABLED=1` and exactly one family is configured
- The server binds to `127.0.0.1` only and rejects every request that is not behind the `/_serve/<secret>` prefix with the exact public origin
- The web workspace `@pi-remote/web` proxies `/api` and `/health` to `127.0.0.1:4310`

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│              @pi-remote/relay (apps/pi-remote-relay/)            │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌───────────────────────┐
│ Tailnet PWA  │ ───▶ │ Loopback HTTP and WSS  │
│ @pi-remote/web│     │ src/http/server.ts     │
└──────────────┘      └───────────┬───────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
      ┌───────────────┐   ┌──────────────┐   ┌──────────────────┐
      │ PromptService │   │ Approval     │   │ SyncHub          │
      │ src/prompt/   │   │ Service      │   │ src/replay/sync  │
      └───────┬───────┘   │ src/approval/│   └────────┬─────────┘
              │           └──────┬───────┘            │
              │                  │                    │
              ▼                  ▼                    ▼
      ┌──────────────────────────────────────────────────────────┐
      │ RelayStore  src/store/  migrations/                      │
      │ redact then append then broadcast, one seq per epoch     │
      └───────────────────────────────┬──────────────────────────┘
                                      ▲
                                      │
                              ┌───────┴────────┐
                              │ RpcSupervisor  │  pi --mode rpc
                              │ src/rpc/       │  or recorded fixture
                              └────────────────┘
```

Dependency direction: the API and services point inward to `store/`, and `store/` is terminal apart from the package-level `migrations/` directory.

---

## 3. PACKAGE TOPOLOGY

```text
pi-remote-relay/
+-- src/                  # Relay source zones, see src/README.md
|   +-- approval/          # Leases, audit, final gate
|   +-- auth/              # Enrollment, sessions, tickets
|   +-- fixtures/          # Recorded Pi RPC JSONL fallback
|   +-- http/              # Loopback HTTP and WSS server
|   +-- policy/            # Mutation family policy
|   +-- prompt/            # Steering prompt submission
|   +-- push/              # Web Push and attention items
|   +-- release/           # Rollback drill
|   +-- replay/            # Sync hub for replay and live deltas
|   +-- rpc/               # Pi RPC supervisor, framing, demux
|   +-- sessions/          # Opaque session catalog
|   `-- store/             # Redaction, migrations, ledger, transcript
+-- migrations/            # Numbered up and down SQL pairs
+-- scripts/               # Build asset copy step
+-- tests/                 # Unit, integration, kill-point, security
+-- dist/                  # tsc output plus copied fixtures and migrations
`-- package.json
```

---

## 4. KEY FILES

| File                               | Responsibility                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/index.ts`                     | Composition root, publishes Pi events as redacted envelopes, exports `runRelay` and helpers |
| `src/http/server.ts`               | Loopback HTTP and WSS API with ingress auth, rate limits, and extension authority routes    |
| `src/store/relay-store.ts`         | SQLite ledger with redaction, epoch ordering, dedup, and retention floor                    |
| `src/rpc/supervisor.ts`            | Owns the `pi --mode rpc` child, serialized stdin, restart and fixture fallback              |
| `src/approval/approval-service.ts` | Approval leases, decisions, accept-edits grants, in-flight abort authority                  |
| `src/push/push-service.ts`         | Encrypted subscriptions, Web Push delivery, attention items                                 |
| `package.json`                     | Scripts for build, typecheck, test, and start                                               |

---

## 5. BOUNDARIES

| Boundary  | Rule                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Imports   | `src/` imports types and guards from `@pi-remote/pi-rpc-protocol` only, never from the web workspace     |
| Network   | HTTP and WSS bind to `127.0.0.1`, every request must pass the serve secret prefix and exact origin       |
| Data      | Envelopes are redacted before append, the API exposes no filesystem paths or prompt text                 |
| Mutation  | Default deny, one enabled family at a time, live only when the env switch and operator principal are set |
| Authority | The extension talks only to the loopback approval routes with a per-process secret                       |

---

## 6. FLOW

```text
pi --mode rpc child or recorded fixture
        │ stdout JSONL
        ▼
RpcSupervisor (framing then demux, events)
        │
        ▼
publishPiEvent (transcript projection, attention class)
        │
        ▼
SyncHub.publish → RelayStore.appendEnvelope (redact first)
        │
        ▼
broadcast to WSS subscribers and Web Push hints
```

Prompt path: a device POSTs `/api/prompt/submit` with a one-use ticket, `PromptService` sends a `prompt` command through the supervisor, and the projected transcript block is committed to the ledger.

Approval path: the extension POSTs `/api/extension/approval/request` on loopback, the lease is published as `approval.requested`, the device decides, and the extension consumes the approved lease through the final gate to receive a one-shot `AbortSignal`.

---

## 7. ENTRYPOINTS

| Entrypoint                                                | Type   | Purpose                                                                                         |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `runRelay()`                                              | Export | Start the store, services, loopback server, and supervised Pi child, return a shutdown function |
| `mutationPiArguments(family)`                             | Export | Build argv for the `--mode rpc` child with one mutation family                                  |
| `bindPushNotifications(store, syncHub, push, foreground)` | Export | Route committed attention envelopes to Web Push                                                 |
| `publishPiEvent(store, syncHub, projector, event, epoch)` | Export | Persist and broadcast one Pi event as redacted envelopes                                        |
| `npm start`                                               | Script | Run `node dist/index.js` after build                                                            |

---

## 8. VALIDATION

Run from the Pi Remote root (`Apps/Pi Mobile`):

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
npm run build -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes all suites, build emits `dist/` with fixtures and migrations copied in.

---

## 9. RELATED

- [`src/README.md`](src/README.md)
- [`migrations/README.md`](migrations/README.md)
- [`scripts/README.md`](scripts/README.md)
- [`tests/README.md`](tests/README.md)
- [Pi Remote Architecture](../../ARCHITECTURE.md)
- [Pi Remote Operations](../../docs/operations.md)
- [Pi Remote root README](../../README.md)
