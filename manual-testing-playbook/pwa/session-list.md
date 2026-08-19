---
title: "PR-024 -- Session list"
description: "This scenario validates Session list for `PR-024`. It focuses on the Home view that lists opaque session cards from the relay catalog."
stage: routing
version: 1.0.0.0
---

# PR-024 -- Session list

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-024`.

---

## 1. OVERVIEW

This scenario validates Session list for `PR-024`. It focuses on the Home view that lists opaque session cards from the relay catalog.

### Why This Matters

The Home view is the first surface every user sees, so a regression here hides all session context behind a broken or empty list. It must keep surfacing session cards that carry only opaque identifiers together with their status, message count, and update time so users can trust the list reflects reality. It must also persist when the relay list is slow, because cards hydrate from the offline cache before the network arrives; if that degrade path broke, the Home view would go blank on flaky connections and the device footer's log-out and revoke actions would lose access.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-024` and confirm the expected signals without contradictory evidence.

- Objective: the Home view lists opaque session cards from the relay catalog, hydrating from the offline cache before the relay list arrives.
- Real user request: `Make sure the home view still lists session cards from the relay catalog and shows the log-out and revoke actions without letting any session leak into the open.`
- Prompt: `Run the session-list regression and confirm the Home view renders session cards from the catalog, hydrates before the relay list arrives, and keeps device footer actions working.`
- Expected execution process: running the command pokes the session-list rendering, catalog consumption, offline-cache hydrate-before-arrival path, and device footer logout/revoke behavior of the Home view through the web app test suite.
- Expected signals: the named test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures.
- Desired user-visible outcome: a green run proves the shipped Home view renders the session list from the relay catalog, hydrates from the offline cache, and exposes working device footer actions.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if it reports any failure, an error, or a non-zero exit.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the session-list regression and confirm the Home view renders session cards from the catalog, hydrates before the relay list arrives, and keeps device footer actions working.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/App.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures and exits 0.

### Evidence

Capture the vitest summary line for the named file showing `0` failures, along with the exit code `0`.

### Pass / Fail

- **Pass**: the named test file reports 0 failures and the command exits 0.
- **Fail**: the named test file reports one or more failures, a thrown error, or a non-zero exit code.

### Failure Triage

Read the failing assertion and the output of the run to find which assertion broke. Re-read the implementation anchor `apps/pi-remote-relay/src/sessions/catalog.ts` to confirm the catalog still returns the opaque session shape the view expects, and check whether the failure is in the hydrate-before-arrival path or in the device footer logout/revoke behavior before treating it as a regression.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/pwa/session-list.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/sessions/catalog.ts` | Primary implementation anchor |
| `apps/pi-remote-web/tests/App.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: pwa
- Playbook ID: PR-024
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `pwa/session-list.md`
