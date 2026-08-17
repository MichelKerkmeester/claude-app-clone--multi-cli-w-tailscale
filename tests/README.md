---
title: 'Tests: Release-Readiness Suites'
description: 'Vitest suites for the rollback drill, threshold gate, and rollout gate at the app root.'
trigger_phrases:
  - 'release readiness tests'
  - 'threshold-gate test'
  - 'rollout-gate test'
  - 'rollback-drill test'
---

# Tests: Release-Readiness Suites

---

## 1. OVERVIEW

`tests/` holds the release-readiness suites at the app root. Each file covers one release component: the executable rollback drill, the threshold evaluator, and the rollout evaluator. The root `npm test` runs these files together with the protocol, relay, and approval-extension suites.

Current state:

- 3 suites under the shared vitest configuration
- The rollback drill test executes the real drill against a disposable database
- The evaluator tests cover failure and pending cases without touching the network

---

## 2. FILES

| File                      | Responsibility                                                               |
| ------------------------- | ---------------------------------------------------------------------------- |
| `rollback-drill.test.ts`  | Runs `runRollbackDrill` from relay source and asserts the PASS report shape  |
| `threshold-gate.test.mjs` | Covers missing thresholds, violated thresholds, and pending operator metrics |
| `rollout-gate.test.mjs`   | Covers stage NOT-READY when evidence is absent                               |

---

## 3. TEST COVERAGE

`rollback-drill.test.ts` asserts the drill report:

- `status` is PASS and `mutationDisabled` is true
- `restoredMigrationVersion` is 5
- `relaySessionsPreserved` and `indeterminateRowsPreserved` are 1
- `nativeSessionSentinelPreserved` is true
- `drainedApprovalRows` is at least 1

`threshold-gate.test.mjs` builds a synthetic config over `REQUIRED_METRICS` and asserts:

- a measured metric with no declared threshold fails
- a measurement above a max threshold fails
- an unmeasured operator metric stays PENDING while machine status stays PASS

`rollout-gate.test.mjs` evaluates a single stage against partial evidence and asserts:

- the stage is NOT-READY with `available` false
- the missing evidence item shows status UNRUN

---

## 4. VALIDATION

Run from the app root:

```bash
npm test
```

Expected result: all suites pass, including the three files in `tests/`. The drill test creates and removes its disposable database under `release/.tmp-rollback-`.

---

## 5. RELATED

- [`../release/README.md`](../release/README.md)
- [`../scripts/README.md`](../scripts/README.md)
- [`../docs/release-verification.md`](../docs/release-verification.md)
