---
title: 'Pi Remote Approval Extension: Pinned Final-Boundary Approval'
description: 'Pi extension that blocks protected tool calls until the relay consumes the same approved action lease.'
trigger_phrases:
  - 'pi remote approval'
  - 'final boundary'
---

# Pi Remote Approval Extension: Pinned Final-Boundary Approval

---

## 1. OVERVIEW

`extensions/pi-remote-approval/` is the `@pi-remote/approval-extension` package, a Pi extension pinned to Pi 0.84.1. It registers a `tool_call` handler through `installPiRemoteApproval`, freezes the documented `toolName` and `input` into an `ApprovalAction`, requests a lease from the authenticated loopback relay, and returns a block reason unless the relay atomically consumes the same approved action. Protected tools come from the `toolName` set selected by `PI_REMOTE_MUTATION_FAMILY`.

Current state:

- Protected families map to tools: `filesystem` to `edit` and `write`, `process` to `bash`, `network` to `fetch`
- The handler polls `consume` every 50 ms until lease expiry and then blocks with `approval-expired`
- Any relay error blocks with `approval-authorizer-unavailable`
- The `PI_REMOTE_APPROVAL_SECRET` environment value is deleted from `process.env` after it is read
- No fallback approval, wildcard tool grant or local bypass exists in this package

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                extensions/pi-remote-approval                     │
╰──────────────────────────────────────────────────────────────────╯

┌─────────────┐      ┌────────────────────┐      ┌────────────────┐
│ Pi          │ ───▶ │ createFinalBoundary│ ───▶ │ RelayLease     │
│ tool_call   │      │ Handler            │      │ Authorizer     │
└─────────────┘      └─────────┬──────────┘      └───────┬────────┘
                               │                         │
                               │                         ▼
                               │                 /api/extension/
                               │                 approval/request
                               │                 approval/consume
                               ▼
                     ┌────────────────────┐
                     │ block with reason  │
                     │ or undefined to run│
                     └────────────────────┘

Dependency direction: index.ts ───▶ pi-rpc-protocol (digest, guards)
```

---

## 3. DIRECTORY TREE

```text
extensions/pi-remote-approval/
+-- src/index.ts     # Handler, authorizer and install entrypoint
+-- tests/           # Final-boundary fixture suite
+-- package.json
`-- README.md
```

---

## 4. KEY FILES

| File                           | Responsibility                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                 | `createFinalBoundaryHandler`, `createRelayLeaseAuthorizer`, `installPiRemoteApproval`, default entry `piRemoteApproval` |
| `tests/final-boundary.test.ts` | Fixture coverage for exact-input binding and fail-closed relay loss                                                     |

---

## 5. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                       |
| --------- | -------------------------------------------------------------------------- |
| Imports   | Only `@pi-remote/pi-rpc-protocol` at runtime                               |
| Exports   | `./dist/index.js` per `package.json`                                       |
| Ownership | Lease request and consume live behind the `RelayLeaseAuthorizer` interface |

Main flow:

```text
╭──────────────────────────────────────────╮
│ tool_call event                          │
╰──────────────────────────────────────────╯
                  │
                  ▼
┌──────────────────────────────────────────┐
│ protectedTools check                     │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ ApprovalAction and digest                │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ authorizer.request lease                 │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ poll authorizer.consume every 50 ms      │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ undefined to run, or block with reason   │
└──────────────────────────────────────────┘
```

---

## 6. ENTRYPOINTS

| Entrypoint                   | Type           | Purpose                                                    |
| ---------------------------- | -------------- | ---------------------------------------------------------- |
| `piRemoteApproval`           | Default export | Reads required environment values and installs the handler |
| `installPiRemoteApproval`    | Function       | Registers the pinned handler on Pi's `tool_call` boundary  |
| `createFinalBoundaryHandler` | Function       | The handler used by Pi and by the fixture tests            |

Required environment values: `PI_REMOTE_APPROVAL_RELAY_URL`, `PI_REMOTE_APPROVAL_SECRET`, `PI_REMOTE_APPROVAL_PRINCIPAL`, `PI_REMOTE_APPROVAL_SESSION_ID`, `PI_REMOTE_APPROVAL_EPOCH`, `PI_REMOTE_MUTATION_FAMILY`.

---

## 7. VALIDATION

Run from the repository root.

```bash
npm test -w @pi-remote/approval-extension
npm run typecheck -w @pi-remote/approval-extension
npm run build -w @pi-remote/approval-extension
```

Expected result: the fixture suite passes, TypeScript reports no errors, and `dist/index.js` is produced.

Live Pi verification remains operator-only. Extension loading order, protected execution under `deploy/containment/pi-remote.sb`, and lease abort by expiry, revocation, epoch change or the kill switch are process-level properties that the fixture suite does not prove.

---

## 8. RELATED

- [`src/` README](../src/README.md)
- [`tests/` README](../tests/README.md)
