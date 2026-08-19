---
title: 'fixtures: recorded Pi RPC event sequence'
description: 'Holds the recorded pi-rpc.jsonl event sequence and the strict JSONL replay contract.'
trigger_phrases:
  - recorded fixture
  - JSONL replay
  - fixture only
  - Pi RPC events
---

# fixtures: Recorded Pi RPC Event Sequence

---

## 1. OVERVIEW

`fixtures/` contains one recorded Pi RPC event sequence used when `PI_REMOTE_USE_FIXTURE=1`. `RpcSupervisor` loads this file through `StrictJsonlDecoder` instead of launching the live Pi child, which gives tests and demos a deterministic event source.

Current state:

- one file, `pi-rpc.jsonl`, with 3 records
- each record is one `PiRpcEvent` object on one line
- records must end with an LF delimiter, a trailing partial record is rejected
- max record size is 1 MiB
- the supervisor state becomes `fixture` after a successful load

---

## 2. REPLAY CONTRACT

```text
fixtures/pi-rpc.jsonl
        │ readFile
        ▼
StrictJsonlDecoder ──▶ demultiplexer.accept(record)
        │
        ▼
supervisor.onEvent(listeners) ──▶ relay publishPiEvent
```

| Record           | Line | Effect in the relay                                                    |
| ---------------- | ---- | ---------------------------------------------------------------------- |
| `agent_start`    | 1    | catalog marks the session `running`, transcript block "Agent started." |
| `message_update` | 2    | `text_delta` with `"recorded fixture"`, projected as a user text block |
| `agent_settled`  | 3    | catalog marks the session `idle`, transcript block "Agent settled."    |

Activation contract:

- set `PI_REMOTE_USE_FIXTURE=1` before starting the relay
- `RpcSupervisor` falls back to `new URL('../fixtures/pi-rpc.jsonl', import.meta.url)` when no `fixturePath` is given
- a load error sets the state to `failed` and emits an error named `Recorded Pi RPC fixture failed`
- the fixture emits events once at start, it does not loop

---

## 3. KEY FILES

| File           | Responsibility                                  |
| -------------- | ----------------------------------------------- |
| `pi-rpc.jsonl` | The recorded 3-event sequence replayed verbatim |

---

## 4. BOUNDARIES

| Boundary  | Rule                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Format    | One JSON object per line, LF only, strict UTF-8 decode                                                     |
| Consumers | `rpc/supervisor.ts` activates it, `tests/integration/recorded-fixture-flow.test.ts` asserts the transcript |
| Ownership | Record new sequences here when the recorded Pi session changes                                             |
| Scope     | No state, no code, data only                                                                               |

---

## 5. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/integration/recorded-fixture-flow.test.ts
```

Expected result: the fixture populates the read-only transcript with the three expected text blocks and the supervisor reports state `fixture`.
