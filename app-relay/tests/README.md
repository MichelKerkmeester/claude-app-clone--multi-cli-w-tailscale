---
title: 'Relay Tests: Unit, Integration, Kill-Point and Security Suites'
description: 'Vitest suites for the relay package, including recorded fixture flow, crash recovery, and fail-closed controls.'
trigger_phrases:
  - 'relay tests'
  - 'vitest relay'
  - 'relay test suites'
---

# Relay Tests: Unit, Integration, Kill-Point and Security Suites

---

## 1. OVERVIEW

`tests/` holds the vitest coverage for the relay package. Root-level files are unit suites for one module each. Three subfolders hold scenario suites: `integration/` runs a full recorded Pi RPC flow, `kill-points/` simulates crashes at each persistence and broadcast stage, and `security/` pins the fail-closed negative controls.

The run command from `package.json` is `vitest run tests`.

---

## 2. UNIT SUITES

| File                           | Covers                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `approval.test.ts`             | Lease lifecycle, decisions, grants, final gate                  |
| `auth.test.ts`                 | Enrollment, session proof, tickets, revocation                  |
| `authority-loop.test.ts`       | Live loop across the relay and the approval extension           |
| `prompt.test.ts`               | Prompt submission through the RPC supervisor                    |
| `push.test.ts`                 | Subscriptions, preferences, attention items, hint serialization |
| `redaction.test.ts`            | Canonical envelope redaction policy                             |
| `rpc.test.ts`                  | JSONL framing and response demultiplexer                        |
| `store.test.ts`                | Ledger ordering, deduplication, retention                       |
| `sync.test.ts`                 | Snapshot and live sync barrier                                  |
| `transcript-projector.test.ts` | Pi event to transcript block projection                         |

---

## 3. SCENARIO SUITES

| Folder         | File                            | Covers                                                                                                     |
| -------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `integration/` | `recorded-fixture-flow.test.ts` | Full relay flow from the recorded fixture, including optimistic prompt reconciliation with the web reducer |
| `kill-points/` | `recovery.test.ts`              | Crash outcomes at pre-write, post-write, pre-ack, post-ack, persistence, broadcast, and reconnect points   |
| `security/`    | `negative-controls.test.ts`     | Consolidated fail-closed checks for auth, approval, final gate, push, and redaction                        |

---

## 4. RUN

Run from the Pi Remote root:

```bash
npm test -w @pi-remote/relay
```

Or from inside `apps/pi-remote-relay/`:

```bash
npm test
```

Expected result: vitest runs every file under `tests/` and all suites pass.

---

## 5. RELATED

- [`../README.md`](../README.md)
- [`../src/README.md`](../src/README.md)
- [`../../README.md`](../../README.md)
