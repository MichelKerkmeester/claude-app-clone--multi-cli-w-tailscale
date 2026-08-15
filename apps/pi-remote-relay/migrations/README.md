---
title: 'Relay Migrations: Numbered Up and Down SQL'
description: 'Numbered 001 to 004 up and down SQL migration pairs applied transactionally by MigrationRunner.'
trigger_phrases:
  - 'relay migrations'
  - 'schema_migrations'
  - 'migration runner'
---

# Relay Migrations: Numbered Up and Down SQL

---

## 1. OVERVIEW

`migrations/` holds four numbered SQL migration pairs. Each pair is `NNN-name.up.sql` and `NNN-name.down.sql`. `MigrationRunner` in `src/store/migrations.ts` applies pending up migrations in numeric order, one transaction each, and reverses the latest applied migration with the matching down file. Applied versions are recorded in the `schema_migrations` table, so the runner never re-applies a version.

Current state:

- The runner matches files with `^(\d{3})-([a-z0-9-]+)\.(up|down)\.sql$` and sorts by version
- `RelayStore` runs `migrateUp()` on every database open, so the migrations apply before any envelope is written
- The build copies this directory to `dist/migrations/` so the packaged relay resolves the same files
- A missing down file for the latest version is a hard error

---

## 2. MIGRATION VERSIONS

| Version | Name                | Up creates or changes                                                | Down reverses                   |
| ------- | ------------------- | -------------------------------------------------------------------- | ------------------------------- |
| 001     | initial             | `stream_epochs`, `stream_state`, `envelopes`, `session_catalog`      | Drops all four tables           |
| 002     | approvals           | `approval_leases`, `approval_audit`, `accept_edits_grants`           | Drops the three tables          |
| 003     | push-attention      | `push_subscriptions`, `attention_items`                              | Drops the two tables            |
| 004     | grant-restart-state | Rebuilds `accept_edits_grants` with the `restart-invalidated` status | Rebuilds it without that status |

Details:

- 001 establishes the stream identity key of `(host_id, workspace_ref, session_id)`, one `current_epoch` per stream, per-epoch sequence bounds, and a unique `(epoch, seq)` constraint on `envelopes`
- 002 adds approval leases with digest, revision, source, and status checks, an append-only audit table, and accept-edits grants
- 003 adds encrypted push subscriptions and bounded attention items keyed by generation and nonce
- 004 renames the grants table to a legacy name, recreates it with `restart-invalidated` in the status check, copies the rows, then drops the legacy table

---

## 3. HOW THE RUNNER APPLIES THEM

```text
RelayStore constructor
        │
        ▼
new MigrationRunner(database, migrationDirectory)
        │
        ▼
migrateUp() → ensure schema_migrations table
        │
        ▼
discover('up') sorted by version
        │
        ▼
per pending version → transaction { exec(sql), insert version row }
```

`migrateDown()` reads the highest version from `schema_migrations`, finds the matching down file, reverses it in one transaction, and deletes the version row. It returns the reversed version, or `null` when nothing is applied.

Key points:

- Every up and down run is wrapped in a single `better-sqlite3` transaction
- The down direction is exercised by the release drill in `src/release/rollback-drill.ts`, which restores a backup and expects `migrateDown()` to return version 4
- `schema_migrations` is created on demand and is not part of any migration file

---

## 4. DIRECTORY TREE

```text
migrations/
+-- 001-initial.up.sql               # Stream epochs, state, envelopes, catalog
+-- 001-initial.down.sql
+-- 002-approvals.up.sql             # Leases, audit, accept-edits grants
+-- 002-approvals.down.sql
+-- 003-push-attention.up.sql        # Push subscriptions, attention items
+-- 003-push-attention.down.sql
+-- 004-grant-restart-state.up.sql   # Grants with restart-invalidated status
+-- 004-grant-restart-state.down.sql
`-- README.md
```

---

## 5. VALIDATION

The migration files run inside the store and recovery suites:

```bash
npm test -w @pi-remote/relay
```

Run from the Pi Remote root. Expected result: `tests/store.test.ts` and `tests/kill-points/recovery.test.ts` open fresh databases, apply all four versions, and pass. The rollback drill at the Pi Remote root checks the down direction:

```bash
npm run rollback:drill
```

Expected result: the drill reports `PASS` with `restoredMigrationVersion` equal to 4.

---

## 6. RELATED

- [`../src/store/migrations.ts`](../src/store/migrations.ts)
- [`../src/store/relay-store.ts`](../src/store/relay-store.ts)
- [`../scripts/README.md`](../scripts/README.md)
- [`../README.md`](../README.md)
