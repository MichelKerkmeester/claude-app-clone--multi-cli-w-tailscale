---
title: 'pi-rpc-protocol: Shared Wire Contract Package'
description: 'The shared typed wire contract for Pi Remote traffic, with runtime guards and stable digest and proof helpers.'
trigger_phrases:
  - 'pi rpc protocol'
  - 'wire contract'
  - 'rpc envelope'
  - 'protocol guards'
---

# pi-rpc-protocol: Shared Wire Contract

---

## 1. OVERVIEW

`packages/pi-rpc-protocol/` is the private workspace package `@pi-remote/pi-rpc-protocol`. It owns the typed contract for every Pi Remote wire message, the runtime guards that narrow untrusted inbound JSON, and the digest and proof helpers that bind approval actions and device enrollment.

The package is consumed by the relay, the web client and the approval extension. It declares no runtime dependencies and ships as compiled ESM through `dist/index.js`.

Current state:

- The versioned envelope, command, response, event and sync message types live in `src/types.ts`
- The runtime guards in `src/guards.ts` validate every public type at the wire boundary
- `src/approval.ts` produces canonical JSON and a browser-safe SHA-256 digest
- `src/auth.ts` produces byte-stable enrollment and session proof strings
- `src/index.ts` is the only public export barrel and defines `PROTOCOL_VERSION = 1`

---

## 2. ARCHITECTURE

```text
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ relay         │   │ web client    │   │ approval ext  │
└──────┬────────┘   └──────┬────────┘   └──────┬────────┘
       └───────────────────┼──────────────────┘
                           ▼
                   ┌───────────────┐
                   │ index.ts      │  export barrel, PROTOCOL_VERSION = 1
                   └───────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ types.ts      │  │ guards.ts     │  │ approval.ts   │
│ wire contract │  │ runtime guard │  │ digest        │
└───────────────┘  └───────────────┘  └───────┬───────┘
                                              ▼
                                      ┌───────────────┐
                                      │ auth.ts       │
                                      │ proof strings │
                                      └───────────────┘
```

Dependency direction: `index.ts` exports the other four modules. `guards.ts`, `approval.ts` and `auth.ts` import types from `types.ts` only.

---

## 3. PACKAGE TOPOLOGY

```text
packages/pi-rpc-protocol/
+-- src/               # Contract, guards, digest and proof helpers
+-- tests/             # Vitest suite for guards and helpers
+-- dist/              # tsc build output, the package export target
+-- package.json       # Workspace package manifest
`-- tsconfig.json      # TypeScript compiler config
```

Allowed direction:

```text
index.ts → types.ts, guards.ts, approval.ts, auth.ts
guards.ts → types.ts
approval.ts → types.ts
auth.ts → types.ts
tests → src/index.ts
```

Disallowed direction:

```text
types.ts → guards.ts
approval.ts → guards.ts
tests → src internals other than index.ts
```

---

## 4. DIRECTORY TREE

```text
packages/pi-rpc-protocol/
+-- src/
|   +-- types.ts        # Wire contract types
|   +-- guards.ts       # Runtime type guards
|   +-- approval.ts     # Canonical JSON and SHA-256 digest
|   +-- auth.ts         # Enrollment and session proof strings
|   `-- index.ts        # Public export barrel
+-- tests/
|   `-- guards.test.ts  # Vitest suite
+-- dist/               # Build output, the package export target
+-- package.json        # Name, exports and scripts
`-- tsconfig.json       # TypeScript compiler config
```

---

## 5. KEY FILES

| File                   | Responsibility                                                |
| ---------------------- | ------------------------------------------------------------- |
| `src/types.ts`         | All wire contract types as read-only interfaces and unions    |
| `src/guards.ts`        | Type guards that narrow `unknown` to the contract types       |
| `src/approval.ts`      | Canonical JSON serialization, SHA-256, approval action digest |
| `src/auth.ts`          | Byte-stable proof strings for enrollment and session exchange |
| `src/index.ts`         | Export barrel with `PROTOCOL_VERSION = 1`                     |
| `tests/guards.test.ts` | Vitest coverage for guards, digest and proofs                 |

---

## 6. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Imports   | Source modules import only from `./types.js` inside the package, no host runtime modules                          |
| Exports   | `package.json` maps `.` to `./dist/index.js` with `./dist/index.d.ts` types                                       |
| Ownership | This package owns the wire contract only. Transport, storage and UI live in the relay, web and extension packages |

Main flow:

```text
╭──────────────────────────────────────────╮
│ untrusted inbound JSON from a socket     │
╰──────────────────────────────────────────╯
                  │
                  ▼
┌──────────────────────────────────────────┐
│ guard from src/guards.ts                 │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ typed PiRpcCommand, PiRpcEvent, Envelope │
└──────────────────────────────────────────┘
                  │
                  ▼
╭──────────────────────────────────────────╮
│ caller handles the narrowed value        │
╰──────────────────────────────────────────╯
```

---

## 7. ENTRYPOINTS

| Entrypoint                                     | Type     | Purpose                                        |
| ---------------------------------------------- | -------- | ---------------------------------------------- |
| `src/index.ts`                                 | Module   | Public barrel, the file consumers import first |
| `PROTOCOL_VERSION`                             | Constant | The wire protocol version, currently `1`       |
| `isPiRpcCommand`, `isEnvelope`, `isPiRpcEvent` | Function | Guards used at the wire boundary               |
| `approvalActionDigest`, `sha256`               | Function | Approval binding helpers                       |
| `enrollmentProof`, `sessionProof`              | Function | Proof string builders                          |

---

## 8. VALIDATION

Run from the workspace root `Apps/Pi Mobile`:

```bash
npm test -w @pi-remote/pi-rpc-protocol
npm run typecheck -w @pi-remote/pi-rpc-protocol
```

Expected result: vitest runs `tests/guards.test.ts` and reports all tests passing, tsc reports no type errors.

Workspace-wide run:

```bash
npm test
```

Expected result: vitest runs the protocol tests plus the relay, approval extension and root test suites.

---

## 9. RELATED

- [`src/` README](src/README.md)
- [`tests/` README](tests/README.md)
