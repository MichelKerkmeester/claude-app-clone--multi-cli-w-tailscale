---
title: 'Whole-gate runner'
description: 'The release verification runner that executes the full gate sequence and writes evidence.'
trigger_phrases:
  - 'Whole-gate runner'
  - 'release verify'
  - 'release verification'
  - 'release-verify.mjs'
version: 1.0.0.0
---

# Whole-gate runner (release-verify.mjs)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The release verification runner that executes the full gate sequence and writes evidence.

The runner spawns typecheck, lint, format, test, build, web, drill, and threshold gates in order, writes a timestamped evidence document, derives claims, and evaluates rollout readiness. Gate records omit raw command output, so absolute app and home paths never appear in the document.

Current status: shipped.

---

## 2. HOW IT WORKS

### Gate Sequence

Nine gates run with a timeout and a fixed tool list, and each gate records its command, timestamps, exit status, signal, and tool versions. The rollback drill and threshold gates are parsed from their stdout JSON and folded into the claims set together with the whole-gate claim.

### Evidence Document

The runner writes a schema-versioned evidence document with machine status, stage readiness, environment, tool versions, per-gate results, thresholds, rollback, claims, and rollout evaluation. Gate records carry no raw command output, and evidence files are gitignored as reproducible artifacts.

---

## 3. SOURCE FILES

### Implementation

| File                           | Layer  | Role                                                    |
| ------------------------------ | ------ | ------------------------------------------------------- |
| `scripts/release-verify.mjs`   | Script | Runs the gate sequence and writes the evidence document |
| `scripts/check-thresholds.mjs` | Script | Collects machine measurements and evaluates thresholds  |
| `scripts/check-rollout.mjs`    | Script | Evaluates rollout readiness against evidence            |
| `release/evidence/`            | Script | Receives the generated verification documents           |

### Validation And Tests

| File                            | Type      | Role                                               |
| ------------------------------- | --------- | -------------------------------------------------- |
| `tests/rollout-gate.test.mjs`   | Vitest    | Covers the claim evaluation used by the runner     |
| `tests/threshold-gate.test.mjs` | Vitest    | Covers the threshold evaluation used by the runner |
| `tests/rollback-drill.test.ts`  | Vitest    | Covers the drill gate invoked by the runner        |

---

## 4. SOURCE METADATA

- Group: release
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `release/whole-gate-runner.md`
- Current status: shipped

Related references:

- [numeric-thresholds.md](numeric-thresholds.md) - the threshold evaluation inside the runner
- [staged-rollout.md](staged-rollout.md) - the rollout evaluation inside the runner
