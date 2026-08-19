---
title: 'release/: Rollback Drill'
description: 'Disposable-database rollback drill covering authority drain, backup restore and down-migration.'
trigger_phrases:
  - 'rollback drill'
  - 'release drill'
---

# release/: Rollback Drill

---

## 1. OVERVIEW

`release/` holds one entrypoint, `rollback-drill.ts`, which exports `runRollbackDrill(releaseRoot?)`. It exercises the release path on a disposable SQLite database and returns a `RollbackDrillReport` with status `PASS` or throws. The caller `scripts/rollback-drill.mjs` passes `Pi Mobile/release/` as the root, the module default resolves a `release/` directory four levels above `src/release/`.

Current state:

- Works on a temp database under the release root and deletes it in a `finally` block
- Ends with a down-migration that must restore migration version 4
- Touches no persistent state outside the temp root

---

## 2. KEY FILES

| File                | Responsibility                                               |
| ------------------- | ------------------------------------------------------------ |
| `rollback-drill.ts` | The full drill, the report type and the default release root |

---

## 3. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                 |
| --------- | -------------------------------------------------------------------- |
| Imports   | `approval/`, `policy/`, `replay/`, `store/` and the protocol package |
| Exports   | `runRollbackDrill` only                                              |
| Ownership | Temp files live under the release root, never in the package tree    |

Main flow:

```text
temp root under releaseRoot
        ▼
fresh RelayStore, interrupted session card
        ▼
filesystem family enabled, approval requested, approved and consumed
        ▼
consumed lease marked external-outcome-indeterminate
        ▼
mutation disabled, outstanding authority drained and aborted
        ▼
WAL checkpoint, database copied to backup
        ▼
live database damaged, restored from backup
        ▼
migrateDown returns version 4, session and lease counts verified
        ▼
native session sentinel hash unchanged
        ▼
PASS report, temp root removed
```

---

## 4. ENTRYPOINTS

| Entrypoint                       | Type     | Purpose                                            |
| -------------------------------- | -------- | -------------------------------------------------- |
| `runRollbackDrill(releaseRoot?)` | Function | Run the drill and return the `RollbackDrillReport` |

---

## 5. VALIDATION

Run from the Pi Remote root:

```bash
npm run rollback:drill
```

Expected result: the relay builds, then stdout prints one JSON report with `"status":"PASS"`. A failed assertion throws and exits non-zero.

---

## 6. RELATED

- [`src README`](../README.md)
- [`relay package README`](../../README.md)
- [`release verify script`](../../../scripts/release-verify.mjs)
