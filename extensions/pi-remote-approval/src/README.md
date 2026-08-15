---
title: 'Approval Extension Source: Final-Boundary Handler'
description: 'index.ts builds the tool-call handler that requests and consumes a relay lease.'
trigger_phrases:
  - 'approval extension source'
  - 'final boundary handler'
---

# Approval Extension Source: Final-Boundary Handler

---

## 1. OVERVIEW

`src/` contains one module, `index.ts`. It builds the final `tool_call` handler for Pi and the HTTP authorizer that talks to the relay. The handler freezes the event `toolName` and `input` into an `ApprovalAction`, computes the digest with `approvalActionDigest`, requests a lease, then polls `consume` until the relay allows the exact action or the lease expires.

Current state:

- `createFinalBoundaryHandler` returns `undefined` only when the relay consumes the exact approved action
- `createRelayLeaseAuthorizer` posts to `/api/extension/approval/request` and `/api/extension/approval/consume`
- The default export reads six required environment values and deletes the secret after reading it
- `toolsForFamily` maps `filesystem`, `process` and `network` families to protected tool sets

---

## 2. KEY FILES

| File       | Responsibility                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `index.ts` | `createFinalBoundaryHandler`, `createRelayLeaseAuthorizer`, `installPiRemoteApproval`, default `piRemoteApproval` |

---

## 3. ENTRYPOINTS

| Entrypoint                   | Type           | Purpose                                                  |
| ---------------------------- | -------------- | -------------------------------------------------------- |
| `createFinalBoundaryHandler` | Function       | Returns the handler used by Pi and by fixture tests      |
| `createRelayLeaseAuthorizer` | Function       | Builds the relay HTTP authorizer with Bearer secret auth |
| `installPiRemoteApproval`    | Function       | Registers the handler on `pi.on('tool_call')`            |
| `piRemoteApproval`           | Default export | Reads environment values and installs                    |

Environment values read by the default export:

```text
PI_REMOTE_APPROVAL_RELAY_URL
PI_REMOTE_APPROVAL_SECRET    (deleted from process.env after read)
PI_REMOTE_APPROVAL_PRINCIPAL
PI_REMOTE_APPROVAL_SESSION_ID
PI_REMOTE_APPROVAL_EPOCH
PI_REMOTE_MUTATION_FAMILY    (filesystem, process or network)
```

---

## 4. FLOW

```text
╭──────────────────────────────────────────╮
│ tool_call event with toolName and input  │
╰──────────────────────────────────────────╯
                  │
                  ▼
┌──────────────────────────────────────────┐
│ protectedTools check, skip if not listed │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ ApprovalAction and approvalActionDigest  │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ authorizer.request returns lease         │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ consume loop until expiresAt, sleep 50 ms│
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ allowed runs, else block with reason     │
└──────────────────────────────────────────┘
```

---

## 5. VALIDATION

Run from the repository root.

```bash
npm test -w @pi-remote/approval-extension
npm run typecheck -w @pi-remote/approval-extension
```

Expected result: the fixture suite passes and TypeScript reports no errors.

---

## 6. RELATED

- [`Package README`](../README.md)
- [`tests/` README](../tests/README.md)
