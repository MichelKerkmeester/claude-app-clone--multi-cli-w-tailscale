---
title: 'Relay Scripts: Runtime Asset Copy'
description: 'copy-runtime-assets.mjs copies the fixture and migration directories into dist after tsc.'
trigger_phrases:
  - 'relay scripts'
  - 'copy-runtime-assets'
  - 'relay build assets'
---

# Relay Scripts: Runtime Asset Copy

---

## 1. OVERVIEW

`scripts/` contains one build step, `copy-runtime-assets.mjs`. TypeScript compilation emits only compiled modules, so this script copies the two non-TypeScript runtime assets into `dist/` after `tsc` finishes:

- `src/fixtures/` to `dist/fixtures/`, the recorded Pi RPC JSONL stream the supervisor uses as its fallback
- `migrations/` to `dist/migrations/`, the SQL pairs `MigrationRunner` resolves at runtime

`package.json` wires it as the second half of the build. The full build command is:

```bash
npm run build
```

which runs `tsc -p tsconfig.json` and then `node scripts/copy-runtime-assets.mjs`.

Why it exists: `RelayStore` and `RpcSupervisor` resolve these assets from `import.meta.url` relative to `dist/`, so the packaged relay must carry the fixtures and migrations next to the compiled files.

---

## 2. DIRECTORY TREE

```text
scripts/
+-- copy-runtime-assets.mjs   # mkdir and recursive copy for fixtures and migrations
`-- README.md
```

---

## 3. KEY FILES

| File                      | Responsibility                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `copy-runtime-assets.mjs` | Creates `dist/fixtures/` and `dist/migrations/`, then copies both trees recursively |

---

## 4. VALIDATION

Run from the Pi Remote root:

```bash
npm run build -w @pi-remote/relay
```

Expected result: `dist/` contains `fixtures/pi-rpc.jsonl` and `migrations/001-initial.up.sql` through `004-grant-restart-state.down.sql`.

---

## 5. RELATED

- [`../migrations/README.md`](../migrations/README.md)
- [`../README.md`](../README.md)
