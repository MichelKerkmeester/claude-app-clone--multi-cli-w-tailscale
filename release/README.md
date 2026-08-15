---
title: 'Release: Thresholds, Rollout Policy, and Evidence'
description: 'Numeric metric thresholds, staged rollout policy, gate evaluators, and the generated evidence contract.'
trigger_phrases:
  - 'release gates'
  - 'thresholds.json'
  - 'rollout.json'
  - 'release evidence'
---

# Release: Thresholds, Rollout Policy, and Evidence

---

## 1. OVERVIEW

`release/` owns the release policy and the evidence contract. `thresholds.json` declares the numeric limits for release metrics. `rollout.json` declares the staged readiness policy with kill switches. The two evaluator modules implement the checks. `evidence/` holds the generated verification documents written by `scripts/release-verify.mjs`.

Current state:

- 8 metrics, each with a finite threshold, comparison, unit, and source
- 3 rollout stages, each with a kill switch and a required evidence subset
- Evidence documents are gitignored reproducible artifacts, one per `release:verify` run

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         release/                                 │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌────────────────────┐      ┌────────────────┐
│ scripts/     │ ───▶ │ threshold-gate.mjs │ ───▶ │ thresholds.json│
│ entrypoints  │      │ rollout-gate.mjs   │      │ rollout.json   │
└──────┬───────┘      └─────────┬──────────┘      └────────────────┘
       │                        │
       │                        ▼
       │                ┌────────────────────┐
       └───────────────▶│ evidence/          │
                        │ release-verify-    │
                        │ v1-<timestamp>.json│
                        └────────────────────┘
```

Dependency direction: `scripts/` → `release/*.mjs` → policy JSON and `evidence/`.

---

## 3. PACKAGE TOPOLOGY

```text
release/
+-- thresholds.json         # Numeric metric policy, authority for check-thresholds
+-- rollout.json            # Stage readiness policy and kill switches
+-- threshold-gate.mjs      # Pure evaluator plus machine measurement collection
+-- rollout-gate.mjs        # Pure evaluator plus operator evidence validation
+-- evidence/               # Generated release-verify documents, gitignored
`-- README.md
```

Allowed direction:

```text
scripts/ → release/*.mjs
threshold-gate.mjs → thresholds.json
rollout-gate.mjs → rollout.json
release-verify.mjs → evidence/
```

Disallowed direction:

```text
release/*.mjs → scripts/
```

---

## 4. KEY FILES

| File                 | Responsibility                                                                          |
| -------------------- | --------------------------------------------------------------------------------------- |
| `thresholds.json`    | Declares the 8 required metrics with comparison, threshold, unit, and source            |
| `rollout.json`       | Declares the read-only, protected-mutation, and optional-push stages with kill switches |
| `threshold-gate.mjs` | Exports `REQUIRED_METRICS`, `evaluateThresholds`, and `collectMachineMeasurements`      |
| `rollout-gate.mjs`   | Exports `evaluateRollout` and `validateOperatorEvidence`                                |
| `evidence/`          | Timestamped release verification documents                                              |

---

## 5. THRESHOLDS

Machine metrics, enforced by `collectMachineMeasurements` against a disposable build and database:

| Metric                | Limit                   | How it is measured                                                 |
| --------------------- | ----------------------- | ------------------------------------------------------------------ |
| `replaySnapshotBytes` | at most 1,048,576 bytes | Gzip-independent size of the 1,000-envelope retained snapshot plan |
| `storageGrowthBytes`  | at most 4,194,304 bytes | Database growth for 1,001 writes with 1,000 retained               |
| `restartRecoveryMs`   | at most 2,000 ms        | Close, reopen, and rebuild the retained reconnect snapshot plan    |
| `bundleGzipBytes`     | at most 153,600 bytes   | Gzip sum of built HTML, CSS, and JavaScript                        |

Operator metrics stay PENDING until a measurement is supplied: `foregroundP95LatencyMs`, `streamingCadenceMs`, `queueMemoryBytes`, and `wcagConformanceLevel`. A missing machine measurement fails the gate while a missing operator measurement never invents a number.

---

## 6. ROLLOUT STAGES

| Stage                | Kill switch                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `read-only`          | Remove the Tailscale Serve routes with the deployment cleanup trap and stop the loopback relay                                     |
| `protected-mutation` | Set `PI_REMOTE_MUTATION_ENABLED` off so `MutationPolicy` revokes pending and approved leases and aborts the enabled command family |
| `optional-push`      | Remove the four push configuration values and restart so the relay omits `PushService` entirely                                    |

A stage is READY only when every item in its `requires` subset has status PASS. FAIL, PENDING, and UNRUN all produce NOT-READY with `available` false. The evaluator's `machineStatus` reports configuration validity, not stage readiness.

---

## 7. EVIDENCE CONTRACT

`release/evidence/release-verify-v1-<timestamp>.json` is the output of `npm run release:verify`:

| Field                      | Meaning                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `schemaVersion` and `kind` | Document identity, `pi-remote-release-verification`                                               |
| `machineStatus`            | PASS only when every runnable gate exits 0 and the rollout config validates                       |
| `stageReadiness`           | Ready and not-ready stage id lists                                                                |
| `environment`              | Platform, architecture, and Node version                                                          |
| `tools`                    | Resolved tool versions from package-lock and runtime                                              |
| `gates`                    | Per-gate command, exit status, sanitized output, output SHA-256, and tool versions                |
| `thresholds`               | The threshold evaluator result object                                                             |
| `rollback`                 | The rollback drill report parsed from its stdout                                                  |
| `claims`                   | `machine:whole-gate`, `machine:rollback-drill`, `threshold:<metric>`, and validated operator rows |
| `rollout`                  | Stage readiness evaluation against the claims                                                     |

Output is sanitized before writing: ANSI codes, the app root, the home directory, and long values are replaced so absolute app and home paths never appear. `evidence/*.json` is ignored by git as a reproducible artifact.

---

## 8. VALIDATION

Run from the app root:

```bash
npm run release:thresholds
npm run release:rollout
npm run release:verify
npm test
```

Expected result: the threshold and rollout checkers print JSON, `release:verify` writes an evidence document, and `npm test` passes the evaluator suites in `../tests`.

---

## 9. RELATED

- [`../scripts/README.md`](../scripts/README.md)
- [`../tests/README.md`](../tests/README.md)
- [`../docs/release-verification.md`](../docs/release-verification.md)
- [`../README.md`](../README.md)
