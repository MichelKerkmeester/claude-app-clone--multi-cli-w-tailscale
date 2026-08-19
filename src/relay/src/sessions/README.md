---
title: 'sessions/: Opaque Session Catalog'
description: 'Registers and lists opaque session cards without paths or prompt labels.'
trigger_phrases:
  - 'session catalog'
  - 'session cards'
---

# sessions/: Opaque Session Catalog

> Owns the client-visible session catalog. One file, catalog.ts, maps coarse session state to opaque cards through the relay store.

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

`sessions/` owns the client-visible session catalog. The folder holds one file, `catalog.ts`, which exports `SessionCatalog`, a thin wrapper over the relay store session table. Callers hand in server-owned opaque ids and coarse card state. Filesystem paths and prompt-derived labels never appear in the catalog, the `isOpaqueId` guard keeps them out.

Current state:

- `register` rejects any id that fails `isOpaqueId` with a `TypeError`
- Cards carry four fields, the opaque id, status, message count and updated timestamp
- `upsertSession` runs an upsert, so re-registering an id refreshes the same card row
- `list` returns a read-only `SessionCardDto` projection ordered by update time descending with id as tiebreak
- The class holds no session logic of its own, the store persists everything

`src/index.ts` constructs the catalog with `new SessionCatalog(store)` and registers the relay session as `idle` at startup. The supervisor moves it to `running` on `agent_start` events and back to `idle` on `agent_settled` events. The HTTP server serves the projection at `GET /api/sessions` through `options.catalog.list()`.

The card mirrors the `session_catalog` table, id, status, updatedAt and messageCount. `register` fills `updatedAt` from `new Date().toISOString()` when the caller omits it. `upsertSession` maps the card onto `INSERT ... ON CONFLICT(id) DO UPDATE`, so the last write wins per id.

---

## 3. ARCHITECTURE

```text
Pi callers (push, rpc, http)
        │
        ▼
┌──────────────────────────────────────────┐
│ SessionCatalog  src/sessions/catalog.ts  │
│ register(id, status, count, updatedAt)   │
│ list()                                   │
└─────────────────────┬────────────────────┘
                      │ isOpaqueId guard, TypeError on failure
                      ▼
┌──────────────────────────────────────────┐
│ RelayStore  src/store/relay-store.ts     │
│ upsertSession(card)   listSessions()     │
└──────────────────────────────────────────┘
```

Dependency direction: callers → `SessionCatalog` → `RelayStore`. `SessionCatalog` never touches the database directly.

---

## 4. KEY FILES

| File         | Responsibility                                                         |
| ------------ | ---------------------------------------------------------------------- |
| `catalog.ts` | `SessionCatalog`, the opaque id guard, register and list, nothing else |

---

## 5. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| Imports   | `RelayStore` type from `../store/relay-store.js`, `isOpaqueId` and `SessionCardDto` from `@pi-remote/pi-rpc-protocol` |
| Exports   | The `SessionCatalog` class only                                                                                       |
| Ownership | Card ids must be opaque and path-free, non-opaque ids throw `TypeError`                                               |
| State     | Card fields come from callers and the store persists them verbatim                                                    |

Main flow:

```text
register(id, status, messageCount, updatedAt = now)
        │
        ▼
isOpaqueId(id) fails ? throw TypeError
        │
        ▼
store.upsertSession({ id, status, updatedAt, messageCount })

list()
        │
        ▼
store.listSessions()  →  readonly SessionCardDto[]
```

---

## 6. ENTRYPOINTS

| Entrypoint                                                      | Type   | Purpose                                                              |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `SessionCatalog.register(id, status, messageCount, updatedAt?)` | Method | Upsert one opaque session card, throws `TypeError` on non-opaque ids |
| `SessionCatalog.list()`                                         | Method | Return the read-only session card projection                         |

---

## 7. VALIDATION

Run from the Pi Remote root.

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes the relay suites including `tests/store.test.ts` which covers `upsertSession` and `listSessions`.

---

## 8. RELATED

- [`src README`](../README.md)
- [`store README`](../store/README.md)
- [`relay package README`](../../README.md)
