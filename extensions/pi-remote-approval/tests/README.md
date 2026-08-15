---
title: 'Approval Extension Tests: Final-Boundary Fixtures'
description: 'Fixture suite for createFinalBoundaryHandler without a live Pi process or relay.'
trigger_phrases:
  - 'approval extension tests'
  - 'final boundary fixtures'
---

# Approval Extension Tests: Final-Boundary Fixtures

> Fixture suite for createFinalBoundaryHandler with mocked authorizer functions, no live Pi process or relay required.

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

`tests/` holds one fixture file, `final-boundary.test.ts`. It drives `createFinalBoundaryHandler` directly with mocked `RelayLeaseAuthorizer` functions, so the suite runs without a live Pi process or relay. The handler under test comes from `../src/index.js` and the digest helper `approvalActionDigest` comes from `@pi-remote/pi-rpc-protocol`.

Current state:

- The exact approved input runs, a changed input blocks with `digest-mismatch`
- A throwing authorizer blocks with `approval-authorizer-unavailable`
- Tools outside the protected set pass through without a request
- A denied lease request blocks before any `consume` call
- The fixture fixes `principal`, `epoch`, `policyVersion` and the protected tool set

The handler resolves the session id from `options.sessionId` when present and falls back to `context.sessionManager.getSessionId()`. It builds the `ApprovalAction` with principal, epoch, tool, arguments and `policyVersion`, then digests it with `approvalActionDigest`. After a granted request it polls `consume` until the lease returns `allowed`, a final non-pending reason or the `expiresAt` deadline, retrying `approval-pending` results every 50 ms. Any thrown error from the authorizer surfaces as `approval-authorizer-unavailable`.

These fixtures exercise only the handler factory. `installPiRemoteApproval` and the environment-driven `piRemoteApproval` entrypoint, which read `PI_REMOTE_APPROVAL_*` and `PI_REMOTE_MUTATION_FAMILY` variables and build a `createRelayLeaseAuthorizer`, stay outside the suite.

---

## 3. ARCHITECTURE

```text
final-boundary.test.ts
        │ createFinalBoundaryHandler(fixtureOptions)
        ▼
handler({ toolName, input }, context)
        │ protectedTools.has(toolName) ?
        ├─ no  → return undefined
        └─ yes → ApprovalAction + digest = approvalActionDigest(action)
                 │
                 ▼
        authorizer.request({ action, digest })
                 │
                 ├─ denied  → { block: true, reason }
                 ├─ throws  → { block: true, reason: approval-authorizer-unavailable }
                 └─ granted → authorizer.consume(...) until allowed or expiry
```

---

## 4. KEY FILES

| File                     | Responsibility                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `final-boundary.test.ts` | Three fixtures against `createFinalBoundaryHandler` with mocked request and consume functions |

---

## 5. BOUNDARIES AND FLOW

| Boundary      | Rule                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Imports       | `approvalActionDigest` from `@pi-remote/pi-rpc-protocol`, `createFinalBoundaryHandler` from `../src/index.js` |
| Mock surface  | `request` and `consume` only, no network, Pi process or relay                                                 |
| Protected set | `edit`, `write`, `bash`, other tools skip the boundary                                                        |
| Fail-closed   | Any thrown request blocks with `approval-authorizer-unavailable`                                              |

Main flow:

```text
handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)
        │
        ▼
digest = approvalActionDigest({ principal, sessionId, epoch, tool, arguments, policyVersion })
        │
        ▼
request({ action, digest })
        │
        ├─ { requested: false } → { block: true, reason: mutation-disabled }
        └─ { requested: true }  → consume until allowed or expiry
```

---

## 6. ENTRYPOINTS

| Fixture                                 | Outcome                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| exact requested and consumed action     | undefined on exact input, `digest-mismatch` on changed input |
| relay unavailable and read-only tools   | `approval-authorizer-unavailable`, `read` passes through     |
| denied request before lease consumption | `mutation-disabled`, `consume` never called                  |

---

## 7. VALIDATION

Run from the repository root.

```bash
npm test -w @pi-remote/approval-extension
```

Expected result: all three fixtures pass. The workspace root `npm test` also runs `extensions/pi-remote-approval/tests`.

---

## 8. RELATED

- [`Package README`](../README.md)
- [`src README`](../src/README.md)
