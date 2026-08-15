---
title: 'pi-rpc-protocol src: Source Zone Map'
description: 'Zone map for the pi-rpc-protocol source directory, one file per responsibility with the index barrel.'
trigger_phrases:
  - 'pi rpc protocol src'
  - 'protocol source zones'
  - 'protocol barrel'
---

# pi-rpc-protocol src: Source Zone Map

---

## 1. OVERVIEW

`packages/pi-rpc-protocol/src/` holds the complete wire contract implementation in five files. `types.ts` defines every message shape, `guards.ts` validates unknown values against those shapes, `approval.ts` and `auth.ts` build digests and proofs, and `index.ts` is the only public barrel. The directory is flat, with no subdirectories.

Current state:

- All types are read-only interfaces and unions in `types.ts`
- All runtime guards live in `guards.ts`
- `approval.ts` and `auth.ts` depend only on types from `types.ts`
- `index.ts` re-exports every public symbol and defines `PROTOCOL_VERSION = 1`

---

## 2. ARCHITECTURE

```text
                   ┌───────────────┐
                   │ index.ts      │  public barrel
                   └───────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ guards.ts     │  │ approval.ts   │  │ auth.ts       │
│ runtime guard │  │ digest        │  │ proofs        │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        └──────────────────┼──────────────────┘
                           ▼
                   ┌───────────────┐
                   │ types.ts      │  contract only
                   └───────────────┘
```

Dependency direction: `index.ts` → `guards.ts`, `approval.ts`, `auth.ts` → `types.ts`.

---

## 3. FILES AND RESPONSIBILITIES

| File          | Responsibility                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | Wire contract types. `JsonValue` base, image content, command union, response, event types, versioned `Envelope`, sync messages, session cards, transcript blocks, approval shapes, attention and push shapes |
| `approval.ts` | `canonicalizeJson`, `canonicalizeApprovalAction`, `approvalActionDigest`, `sha256`                                                                                                                            |
| `auth.ts`     | `enrollmentProof` and `sessionProof` byte-stable statements                                                                                                                                                   |
| `guards.ts`   | All `is*` type guards plus private helpers such as `isRecord`, `hasOnlyKeys` and `isTimestamp`                                                                                                                |
| `index.ts`    | Export barrel and `PROTOCOL_VERSION = 1`                                                                                                                                                                      |

---

## 4. BOUNDARIES

| Boundary  | Rule                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Imports   | Source files use type-only imports from `./types.js` with the ESM `.js` extension                     |
| Exports   | Only `index.ts` is public. The other four files are internal to the package                           |
| Ownership | Types, guards, digests and proofs belong here. Wire transport and storage belong to the relay package |

---

## 5. ENTRYPOINTS

| Entrypoint                                                      | Type     | Purpose                                        |
| --------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `src/index.ts`                                                  | Module   | Public barrel, the file consumers import first |
| `PROTOCOL_VERSION`                                              | Constant | Wire protocol version, currently `1`           |
| `isPiRpcCommand`, `isPiRpcEvent`, `isEnvelope`, `isSyncMessage` | Function | Main inbound validation guards                 |
| `approvalActionDigest`, `sha256`, `canonicalizeJson`            | Function | Approval binding helpers                       |
| `enrollmentProof`, `sessionProof`                               | Function | Proof builders                                 |

---

## 6. VALIDATION

Run from the workspace root `Apps/Pi Mobile`:

```bash
npm test -w @pi-remote/pi-rpc-protocol
npm run typecheck -w @pi-remote/pi-rpc-protocol
```

Expected result: vitest runs `tests/guards.test.ts` through the barrel and all tests pass.

---

## 7. RELATED

- [`pi-rpc-protocol` README](../README.md)
- [`tests/` README](../tests/README.md)
