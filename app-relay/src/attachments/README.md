# Attachments: inbound media from decode to reap

> The relay subsystem that takes host-supplied images, proves they are safe, delivers them to Pi, and
> reaps them on a retention bound. Eight files under `app-relay/src/attachments`.

---

## 1. OVERVIEW

An attachment enters the relay as bytes a host claims are an image. Nothing downstream trusts that
claim. This subsystem reserves a slot for the upload, sniffs the real format, decodes it in isolation,
re-encodes it inside safe bounds, delivers the clean derivative to Pi, projects a redacted reference
into the transcript, and deletes it when its lifetime ends.

`AttachmentService` is the orchestrator; the other files are the steps it runs and the types and limits
they share. The useful reading path is service → types → limits, then the transforms (decoder,
normalizer), then delivery (bridge), transcript (projector) and cleanup (reaper).

### The flow

```text
reserve ─► upload ─► decode (sniff real format) ─► normalize (re-encode in bounds)
                                                        │
                                     ┌──────────────────┘
                                     ▼
                              bridge to Pi ─► project redacted block into transcript ─► reap on retention
```

---

## 2. STEPS AND OWNERSHIP

| Step | File | What it owns |
|---|---|---|
| Orchestrate | [`attachment-service.ts`](./attachment-service.ts) | The `AttachmentService` lifecycle: reserve/upload/status/cancel tickets, running each step below in order, and per-set stats. The entry point. |
| Shared types | [`attachment-types.ts`](./attachment-types.ts) | Set state, ticket operations, owner and binding shapes every other file speaks. |
| Limits | [`attachment-limits.ts`](./attachment-limits.ts) | The numeric bounds — attachments per set, source bytes per image and per batch, decoded area, source and normalized edge, normalized bytes — derived from the shared media policy. |
| Decode | [`attachment-decoder.ts`](./attachment-decoder.ts) | Memory-isolated decode: sniff the true format from the bytes (not the declared MIME), reject spoofs, and produce decoded image data. |
| Normalize | [`attachment-normalizer.ts`](./attachment-normalizer.ts) | Quarantine re-encode: resize and re-emit inside the limits, dropping original metadata, producing a clean derivative. |
| Deliver | [`pi-image-bridge.ts`](./pi-image-bridge.ts) | The `PiImageBridge`: hand the normalized derivative from host to Pi, with typed rejections when delivery cannot proceed. |
| Transcript | [`attachment-transcript-projector.ts`](./attachment-transcript-projector.ts) | Project an allowlisted, redacted attachment block into the transcript so a media reference is visible without leaking the payload. |
| Reap | [`attachment-reaper.ts`](./attachment-reaper.ts) | The `AttachmentReaper`: delete attachment state when its retention window ends. |

---

## 3. WHY DECODE AND NORMALIZE ARE SEPARATE

The declared MIME type is host input and is not trusted. The decoder **sniffs** the real format from the
bytes and refuses anything that does not match a supported image, which stops a mislabelled or crafted
payload before it is processed. The normalizer then re-encodes the decoded pixels inside the size and
area limits, which drops embedded metadata and guarantees Pi only ever sees a bounded, re-emitted
derivative — never the original file. Decode proves what the bytes are; normalize proves what leaves the
relay.

---

## 4. WHERE TO START FOR A COMMON CHANGE

| Change you need | Start here |
|---|---|
| Raise or lower a size, edge or count limit | [`attachment-limits.ts`](./attachment-limits.ts), then the shared media policy it reads from. |
| Support a new inbound image format | [`attachment-decoder.ts`](./attachment-decoder.ts) sniff and decode paths. |
| Change what Pi receives | [`attachment-normalizer.ts`](./attachment-normalizer.ts) output bounds, then [`pi-image-bridge.ts`](./pi-image-bridge.ts) delivery. |
| Change how attachments appear in the transcript | [`attachment-transcript-projector.ts`](./attachment-transcript-projector.ts) and its redaction allowlist. |
| Change retention or cleanup timing | [`attachment-reaper.ts`](./attachment-reaper.ts). |
| Add a ticket operation or set state | [`attachment-types.ts`](./attachment-types.ts), then [`attachment-service.ts`](./attachment-service.ts). |

---

## 5. RELATED

| Path | Purpose |
|---|---|
| [`../README.md`](../README.md) | The `src/` folder ownership map. |
| [`../../README.md`](../../README.md) | The relay's top-level overview. |
| Shared media policy | The single source of the limit values `attachment-limits.ts` re-exports. |
