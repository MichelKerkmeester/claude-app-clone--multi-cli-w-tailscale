---
title: 'Scripts: Release Gate Entrypoints'
description: 'CLI entrypoints for whole-gate verification, threshold checks, rollout readiness, and the rollback drill.'
trigger_phrases:
  - 'release-verify'
  - 'check-thresholds'
  - 'check-rollout'
  - 'rollback-drill'
---

# Scripts: Release Gate Entrypoints

---

## 1. OVERVIEW

`scripts/` owns the CLI entrypoints that drive the release gates. Each script is a thin runner over the evaluators in `release/`. They print JSON results and set a non-zero exit code on failure so they can gate CI or operator steps.

Current state:

- 4 entrypoints mapped to npm scripts in the root `package.json`
- `rollback-drill.mjs` runs against the built relay dist and needs `npm run build -w @pi-remote/relay` first
- All scripts resolve the app root from their own location

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         scripts/                                 │
╰──────────────────────────────────────────────────────────────────╯

┌────────────────────┐      ┌──────────────────┐      ┌────────────┐
│ release-verify     │ ───▶ │ release/*.mjs    │ ───▶ │ thresholds │
│ check-thresholds   │      │ evaluators       │      │ rollout    │
│ check-rollout      │      └─────────┬────────┘      │ evidence/  │
│ rollback-drill     │                │               └────────────┘
└─────────┬──────────┘                │
          │                           ▼
          │                  ┌──────────────────┐
          └─────────────────▶│ relay dist       │
                             │ rollback-drill   │
                             └──────────────────┘
```

Dependency direction: `scripts/*.mjs` → `release/*.mjs` and `apps/pi-remote-relay/dist/`.

---

## 3. FILES

| File                   | Responsibility                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `release-verify.mjs`   | Runs 9 gates in order, sanitizes output, writes the evidence document, evaluates rollout, exits 1 on machine failure   |
| `check-thresholds.mjs` | Collects machine measurements, merges optional `--measurements`, evaluates thresholds, prints JSON                     |
| `check-rollout.mjs`    | Loads the latest evidence or `--evidence`, merges `--operator-evidence`, evaluates rollout, supports `--require-ready` |
| `rollback-drill.mjs`   | Runs `runRollbackDrill` from the relay dist and prints the report JSON                                                 |

---

## 4. ENTRYPOINTS

| Entrypoint                                                                    | Type       | Purpose                                                                     |
| ----------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `npm run release:verify`                                                      | npm script | Run the whole gate and write `release/evidence/release-verify-v1-<ts>.json` |
| `npm run release:thresholds`                                                  | npm script | Print the threshold evaluation as JSON                                      |
| `npm run release:rollout`                                                     | npm script | Print stage readiness as JSON                                               |
| `npm run rollback:drill`                                                      | npm script | Build the relay and print the rollback drill report                         |
| `node scripts/check-thresholds.mjs --measurements <file>`                     | CLI        | Merge operator measurements before evaluating                               |
| `node scripts/check-rollout.mjs --require-ready <stage>`                      | CLI        | Exit 1 while the named stage is not ready                                   |
| `node scripts/check-rollout.mjs --evidence <file> --operator-evidence <file>` | CLI        | Evaluate against a specific evidence document and operator rows             |

Notes:

- `release-verify.mjs` accepts `--measurements` and `--operator-evidence` with app-relative paths only
- `check-rollout.mjs` requires prior evidence and errors with a hint to run `npm run release:verify`
- `rollback-drill.mjs` fails when the relay dist is missing

---

## 5. VALIDATION

Run from the app root:

```bash
npm run build
npm run release:thresholds
npm run release:rollout
npm run release:verify
npm run rollback:drill
```

Expected result: each command prints JSON on stdout and exits 0, except `release:verify` and `check-rollout --require-ready`, which exit 1 while their gates fail.

---

## 6. RELATED

- [`../release/README.md`](../release/README.md)
- [`../tests/README.md`](../tests/README.md)
- [`../docs/release-verification.md`](../docs/release-verification.md)
