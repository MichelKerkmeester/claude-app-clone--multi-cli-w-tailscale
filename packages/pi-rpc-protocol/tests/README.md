---
title: 'pi-rpc-protocol tests: Guard Suite Orientation'
description: 'Orientation for the pi-rpc-protocol vitest suite, guards.test.ts scope and run commands.'
trigger_phrases:
  - 'pi rpc protocol tests'
  - 'protocol guard tests'
  - 'vitest guards'
---

# pi-rpc-protocol tests: Guard Suite Orientation

---

## 1. OVERVIEW

`packages/pi-rpc-protocol/tests/` holds one vitest suite, `guards.test.ts`. It exercises the guards and helpers through the public barrel `../src/index.js`, so it also verifies that every tested symbol is exported. The package script runs it with `vitest run tests`.

Current state:

- A single file `guards.test.ts` with one `describe` block and eight `it` cases
- A reusable `ENVELOPE` constant shared by the envelope and sync assertions
- No mock server or fixture folder, all inputs are inline objects

---

## 2. FILES

| File             | Responsibility                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `guards.test.ts` | Guard, digest and proof assertions for commands, responses, events, envelopes, sync, transcripts, enrollment and approvals |

---

## 3. TEST SCOPE

| Case                                                                       | Covers                                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| accepts supported commands, responses and events                           | `isPiRpcCommand`, `isPiRpcResponse`, `isPiRpcEvent` happy paths                               |
| rejects malformed or unsupported RPC records                               | Missing fields and unknown event types                                                        |
| validates versioned envelopes and sync bounds                              | `isEnvelope`, `isSyncMessage` with sequence ordering, session and epoch matching, gap reasons |
| validates opaque session cards and all transcript block families           | `isSessionCardDto`, every `isTranscriptBlock` kind                                            |
| validates exact-origin enrollment payloads and stable proofs               | `isEnrollmentQr`, `enrollmentProof`                                                           |
| canonicalizes and binds every exact-action field deterministically         | `canonicalizeApprovalAction`, `approvalActionDigest`, `sha256` vector                         |
| accepts only exact approval decision command shapes                        | `isApprovalDecisionCommand` with exact key sets and digest pattern                            |
| validates transient prompt commands and authoritative user-block responses | `isPromptSubmitCommand`, `isPromptSubmitResponse`                                             |

---

## 4. VALIDATION

Run from the workspace root `Apps/Pi Mobile`:

```bash
npm test -w @pi-remote/pi-rpc-protocol
```

This runs `vitest run tests` inside the package. Expected result: the suite reports all tests passing.

The workspace-wide run also covers this suite:

```bash
npm test
```

This runs `vitest run packages/pi-rpc-protocol/tests` together with the relay, approval extension and root test paths. Expected result: all suites report passing tests.

---

## 5. RELATED

- [`pi-rpc-protocol` README](../README.md)
- [`src/` README](../src/README.md)
