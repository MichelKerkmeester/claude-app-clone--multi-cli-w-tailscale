---
title: 'prompt: authenticated steering prompts to Pi stdin'
description: 'Sends authenticated steering prompts to the Pi child and publishes only redacted transcript blocks.'
trigger_phrases:
  - prompt service
  - steering prompt
  - prompt submit
  - transcript block
---

# prompt: Authenticated Steering Prompts to Pi Stdin

---

## 1. OVERVIEW

`prompt/prompt-service.ts` owns the authenticated transport for steering prompts. `PromptService.submit` validates a `prompt:submit` command, forwards one message to the supervised Pi RPC child with `streamingBehavior: 'steer'`, then publishes only the redacted transcript projection. The raw prompt never leaves the relay as a sync event.

Current state:

- one active submission at a time, a second `submit` throws
- idempotent per `submissionId`, a completed submission returns the cached block
- a `delivery-unknown` record blocks automatic retry
- session must match the configured relay session, mismatch throws
- successful delivery projects a redacted user text block as a `transcript.block` envelope
- submission records are pruned to 256 entries

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         [PROMPT]                                  │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌───────────────────┐      ┌────────────────┐
│ HTTP server  │ ───▶ │ PromptService     │ ───▶ │ RpcSupervisor  │
│ /api/prompt/ │      │ submit()          │      │ send steer     │
│ submit       │      │ idempotency map   │      └────────────────┘
└──────────────┘      └─────────┬─────────┘
                                │
                                ▼
                        ┌───────────────────┐
                        │ TranscriptProjector│  projectSubmittedPrompt
                        │ redacted block     │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │ SyncHub publish   │  transcript.block
                        └───────────────────┘
```

Dependency direction:

```text
prompt-service.ts ──▶ rpc/supervisor.ts (send)
prompt-service.ts ──▶ store/transcript-projector.ts (projection)
prompt-service.ts ──▶ store/relay-store.ts (sequence numbers)
prompt-service.ts ──▶ replay/sync.ts (publish)
```

`PromptService` writes no database rows directly, it only reads sequence numbers from the store.

---

## 3. KEY FILES

| File                | Responsibility                                                    |
| ------------------- | ----------------------------------------------------------------- |
| `prompt-service.ts` | `PromptService` class, submission records and the steer transport |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Auth     | The HTTP layer checks the session cookie and consumes a second `prompt:submit` ticket before calling `submit` |
| Rate     | The HTTP layer applies the 20 per minute prompt limiter per device                                            |
| Delivery | Only a `success` response with `command === 'prompt'` from the supervisor is accepted                         |
| Publish  | Only the projected block, never the raw command envelope                                                      |
| Retry    | `delivery-unknown` state after a publish failure blocks automatic retry                                       |

Main flow:

```text
submit(command, deviceId)
  ──▶ idempotency check on submissionId
  ──▶ single-active check
  ──▶ session check
  ──▶ supervisor.send with streamingBehavior 'steer'
  ──▶ project redacted user text block
  ──▶ syncHub.publish transcript.block
  ──▶ return committed block
```

A publish failure marks the record `delivery-unknown` and throws, the HTTP layer maps that to 503 `pi_unavailable`.

---

## 5. ENTRYPOINTS

| Entrypoint             | Type   | Purpose                                                      |
| ---------------------- | ------ | ------------------------------------------------------------ |
| `PromptService.submit` | Method | Authenticated steering prompt to Pi with idempotent delivery |

---

## 6. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/prompt.test.ts
```

Expected result: submit, idempotency, session and delivery cases pass.
