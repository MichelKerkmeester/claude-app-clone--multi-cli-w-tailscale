---
title: 'store/: Redacted Ledger, Migrations, Transcript Projection'
description: 'SQLite envelope ledger with canonical redaction, numbered migrations and Pi event transcript projection.'
trigger_phrases:
  - 'relay store'
  - 'redaction policy'
  - 'transcript projector'
  - 'migration runner'
---

# store/: Redacted Ledger, Migrations, Transcript Projection

---

## 1. OVERVIEW

`store/` owns all relay persistence. `relay-store.ts` is the SQLite ledger, it redacts every envelope before append and enforces one monotonic sequence per epoch. `redaction.ts` is the single canonical redaction policy applied before any write or broadcast. `migrations.ts` applies numbered up and down SQL pairs. `transcript-projector.ts` converts Pi RPC events into typed, revisable transcript blocks.

Current state:

- Append is transactional with dedupe by event id and by sequence
- A new epoch must start at sequence 1, reused epochs are rejected
- Retention keeps the newest 1,000 envelopes per stream by default (clamp 1 to 10,000)
- Transcript pages read only committed `transcript.block` envelopes

---

## 2. ARCHITECTURE

```text
appendEnvelope(candidate)
        │  isEnvelope guard
        ▼
redactEnvelope (policy version 1)
        ▼
transaction
        ├─ dedupe by event id or by sequence
        ├─ epoch open or rollover
        ├─ sequence must equal highSeq + 1
        ├─ insert envelope row
        └─ retention floor delete
        ▼
commit, SyncHub broadcasts the redacted envelope
```

---

## 3. DIRECTORY TREE

```text
store/
+-- relay-store.ts          # SQLite ledger, epochs, retention, sync plans, transcript pages
+-- migrations.ts           # Numbered up and down SQL runner
+-- redaction.ts            # Canonical redaction policy
+-- transcript-projector.ts # Pi event to transcript block projection
`-- README.md
```

---

## 4. KEY FILES

| File                      | Responsibility                                                    |
| ------------------------- | ----------------------------------------------------------------- |
| `relay-store.ts`          | `RelayStore`, append, sync plans, session cards, transcript pages |
| `migrations.ts`           | `MigrationRunner`, transactional `migrateUp` and `migrateDown`    |
| `redaction.ts`            | `redactEnvelope` and `redactJson`, policy version 1               |
| `transcript-projector.ts` | `TranscriptProjector`, typed blocks, revisions, usage             |

---

## 5. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------- |
| Imports   | `node:` builtins, better-sqlite3 and the protocol package only                                      |
| Exports   | The four classes and the redaction functions                                                        |
| Ownership | All persistence lives here, nothing else opens the database directly (callers use `databaseHandle`) |

Main flow:

```text
Pi event
        │  publishPiEvent
        ▼
TranscriptProjector.project → transcript.block envelopes
        │
        ▼
SyncHub.publish → appendEnvelope
        │  redactEnvelope first
        ▼
transactional insert with sequence guard
        ▼
broadcast to subscribers and push hints
```

---

## 6. ENTRYPOINTS

| Entrypoint                                                  | Type     | Purpose                                                 |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------- |
| `RelayStore.appendEnvelope(candidate)`                      | Method   | Redact, dedupe, order and commit one envelope           |
| `RelayStore.createSyncPlan(identity, cursor?)`              | Method   | Build snapshot, delta or gap messages with a barrier    |
| `RelayStore.getTranscriptPage(identity, afterSeq?, limit?)` | Method   | Read a bounded page of transcript blocks                |
| `MigrationRunner.migrateUp()`                               | Method   | Apply pending migrations in numeric order               |
| `MigrationRunner.migrateDown()`                             | Method   | Reverse the latest migration, return its version        |
| `redactEnvelope(envelope)`                                  | Function | Apply the canonical policy and add the redaction report |
| `TranscriptProjector.project(event, context)`               | Method   | Convert one Pi event into transcript blocks             |

---

## 7. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes `tests/store.test.ts`, `tests/redaction.test.ts` and `tests/transcript-projector.test.ts` alongside the other suites.

---

## 8. RELATED

- [`src README`](../README.md)
- [`relay package README`](../../README.md)
- [`migrations README`](../../migrations/README.md)
