---
title: 'push/: Web Push Hints and Attention Items'
description: 'Encrypted push subscriptions, VAPID Web Push delivery and bounded attention metadata for the relay.'
trigger_phrases:
  - 'push service'
  - 'web push hints'
  - 'attention items'
---

# push/: Web Push Hints and Attention Items

---

## 1. OVERVIEW

`push/` owns Web Push delivery for the relay. One file, `push-service.ts`, exposes the `PushService` class plus two pure helpers. Subscriptions are stored AES-256-GCM encrypted with a 32 byte key, a 12 byte random IV and a 16 byte auth tag, all base64url encoded. The hint payload is content-free, it carries only an opaque lookup id and one attention class, so no session text or paths ever leave the device.

Current state:

- `PushService.publish` accepts only committed `attention.changed` envelopes
- Attention rows are bounded to 200 and deduplicated by generation per session and epoch
- Foreground devices and preference-disabled classes are skipped
- Invalid push endpoints (HTTP 404 and 410) unsubscribe the device
- VAPID details are required unless a test sender is injected

---

## 2. ARCHITECTURE

```text
committed attention.changed envelope
        │  SyncHub committed listener
        ▼
PushService.publish
        ├─ monotonic generation check per session and epoch
        ├─ INSERT attention_items, trim to 200 newest
        ├─ serializePushHint → { lookupId, attentionClass }
        └─ web-push send per subscription
             ├─ skip foreground devices
             ├─ respect per-class preferences
             └─ 404 and 410 unsubscribe the row
```

---

## 3. KEY FILES

| File              | Responsibility                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `push-service.ts` | `PushService`, subscription encryption, preferences, attention ledger, hint serialization |

---

## 4. ENTRYPOINTS

| Entrypoint                                  | Type     | Purpose                                                                     |
| ------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `PushService`                               | Class    | Subscribe, set preferences, publish hints, list and resolve attention items |
| `createAttentionPayload(class, generation)` | Function | Build a `hint_<uuid>` lookup id and `nonce_<base64url>` nonce               |
| `serializePushHint(payload)`                | Function | Serialize the content-free hint with lookup id and attention class          |

---

## 5. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/relay
npm test -w @pi-remote/relay
```

Expected result: typecheck exits 0, vitest passes `tests/push.test.ts` alongside the other suites.

---

## 6. RELATED

- [`src README`](../README.md)
- [`relay package README`](../../README.md)
- [`store README`](../store/README.md)
