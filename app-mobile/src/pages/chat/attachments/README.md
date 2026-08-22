# Attachments

Drafting and previewing files the operator attaches to a message before sending: the draft rail, the tiles, and the preview dialog, plus the client that uploads them and the worker that hashes them.

## Structure

| File | Role |
|------|------|
| `AttachmentDraftProvider.svelte` | Shares draft state to the composer + rail via context (`setContext`). |
| `AttachmentRail.svelte` | The row of pending-attachment tiles. |
| `AttachmentTile.svelte` | One pending attachment (thumbnail + remove). |
| `AttachmentPreviewDialog.svelte` | Full preview of an attachment (a Sheet/Dialog). |
| `attachment-client.ts` | Upload/transfer client. |
| `attachment-state.ts` | Pure draft-state model. |
| `attachment-hash.worker.ts` | Content hashing, off the main thread. |
| `useAttachmentSubmission.svelte.ts` | The runes lifecycle that drives submission. |

## Why + do-not

- **Draft state via a provider.** `AttachmentDraftProvider` is the single source; the rail, tiles, and composer read it from context — no prop-drilling. It uses `untrack` around dispatches for the same reactivity reason documented in `shared/data/CODE.md` — don't reintroduce a self-reading tracked effect.
- **Hashing is a worker** (`attachment-hash.worker.ts`) — import via `new URL(..., import.meta.url)`; don't hash on the main thread (it blocks the composer on large files).
- **Keep `attachment-state.ts` pure** — reactivity belongs in `useAttachmentSubmission.svelte.ts`.
