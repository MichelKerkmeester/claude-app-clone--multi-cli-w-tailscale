---
title: 'rpc/: Pi RPC Child Supervision and Framing'
description: 'Owns one persistent pi --mode rpc child with strict LF JSONL framing and response demux.'
trigger_phrases:
  - 'rpc supervisor'
  - 'jsonl framing'
  - 'rpc demux'
---

# rpc/: Pi RPC Child Supervision and Framing

---

## 1. OVERVIEW

`rpc/` owns the single supervised `pi --mode rpc` child and the protocol edge to it. `supervisor.ts` spawns the child, serializes command writes on stdin, restarts on crash and falls back to a recorded fixture. `framing.ts` decodes stdout as strict LF-delimited JSONL. `demux.ts` correlates responses by request id and routes events to listeners.

Current state:

- Default child args are `--mode rpc --no-session --no-tools --no-extensions`
- Commands are written one JSON object per line through a serialized write chain
- stderr is counted as bytes, never parsed as protocol input
- A missing binary (ENOENT) or `fixtureOnly` mode replays `fixtures/pi-rpc.jsonl`
- Crashes restart with exponential backoff capped at 5 seconds, up to 3 restarts, then `failed`

---

## 2. ARCHITECTURE

```text
RpcSupervisor ──spawn──▶ pi --mode rpc
        │  stdin, one JSON command per line
        ▼
stdout JSONL ──▶ StrictJsonlDecoder ──▶ RpcDemultiplexer
                                          ├─ response by id resolves the pending promise
                                          └─ event reaches onEvent listeners
stderr ──▶ byte counter only
ENOENT or crash ──▶ fixture replay or restart with backoff
```

---

## 3. DIRECTORY TREE

```text
rpc/
+-- supervisor.ts        # Child lifecycle, restart, fixture fallback
+-- framing.ts           # Strict LF JSONL decoder
+-- demux.ts             # Response and event demultiplexer
`-- README.md
```

---

## 4. KEY FILES

| File            | Responsibility                                                         |
| --------------- | ---------------------------------------------------------------------- |
| `supervisor.ts` | `RpcSupervisor`, spawn, serialized stdin, restart policy, fixture mode |
| `framing.ts`    | `StrictJsonlDecoder`, UTF-8 decode, LF delimiter, 1 MiB record limit   |
| `demux.ts`      | `RpcDemultiplexer`, pending response map, timeout, reject on exit      |

---

## 5. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| Imports   | `node:child_process`, `node:crypto`, `node:fs/promises` and the protocol package            |
| Exports   | `RpcSupervisor`, `RpcDemultiplexer`, `StrictJsonlDecoder` and their option and health types |
| Ownership | The supervisor owns exactly one child, `stop()` never touches unrelated processes           |

Main flow:

```text
send(command)
        │  demux.expect(id, timeout)
        ▼
JSON command queued on the stdin write chain
        │
        ▼
child stdout chunk ──▶ decoder.push ──▶ demux.accept
        │
        ├─ response with matching id resolves the pending promise
        └─ event is forwarded to listeners
```

---

## 6. ENTRYPOINTS

| Entrypoint                    | Type   | Purpose                                                |
| ----------------------------- | ------ | ------------------------------------------------------ |
| `RpcSupervisor.start()`       | Method | Launch the live child or load the fixture              |
| `RpcSupervisor.send(command)` | Method | Send one correlated command, resolve with its response |
| `RpcSupervisor.stop()`        | Method | Terminate the child with SIGTERM and wait for close    |
| `RpcSupervisor.health()`      | Method | Return state, restart count and stderr bytes           |

---

## 7. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes `tests/rpc.test.ts` alongside the other suites.

---

## 8. RELATED

- [`src README`](../README.md)
- [`relay package README`](../../README.md)
- [`fixtures README`](../fixtures/README.md)
