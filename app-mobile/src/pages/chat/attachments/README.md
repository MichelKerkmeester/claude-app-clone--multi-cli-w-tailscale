# Attachments

> A local photo draft that lets a person choose, inspect and remove photos before sending them with a chat prompt.

---

## 1. OVERVIEW

The `attachments/` feature sits under the chat composer. It accepts image files only when the host advertises media input and the current model can view photos. Selected files remain in the provider's local store while the draft reducer exposes only bounded metadata to the UI.

The person can add up to four photos, preview one locally, remove any tile and then send the photos with a normal prompt. Sending is a separate ticketed transfer that prepares bytes, reserves an attachment set, uploads its parts, checks the host status and commits the message only after every part is ready.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte chat feature |
| Draft limit | Four photos per message |
| Preview storage | Local object URLs, revoked on cleanup |
| Upload concurrency | At most two parts at once |
| Main audience | People adding photos to a chat prompt |

---

## 2. FEATURES

### Key Features

| Feature | What it does |
|---|---|
| Capability gating | Hides the photo path unless media input is enabled and the model supports image input. |
| Draft rail | [`attachment-rail.svelte`](./attachment-rail.svelte) shows the selected tiles and restores focus after removal. |
| Local preview | [`dialog-attachment-preview.svelte`](./dialog-attachment-preview.svelte) shows a local-only preview and keeps the background out of the accessibility tree. |
| Bounded selection | [`attachment-state.ts`](./attachment-state.ts) tracks order, status, preview availability and rejection messages without retaining file objects. |
| Ticketed sending | [`use-attachment-submission.svelte.ts`](./use-attachment-submission.svelte.ts) drives authorization, upload, server checking, commit, cancellation and delivery-unknown states. |
| Verified transfer | [`attachment-client.ts`](./attachment-client.ts) checks type, size, reservation identity and digests before committing references with the prompt. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Host media capability | Enabled image input | Without it, the provider clears the local draft and the photo tool is unavailable. |
| Model capability | The current model can view photos | A model change can move an existing draft to a blocked state. |
| Session state | Live connection, current session epoch and prompt revision | These values bind the reservation to the exact chat state. |
| Prompt | A normal text prompt | The submission hook rejects a slash command combined with photos. |
| Browser support | File and Worker APIs | The transfer hashes bytes in [`attachment-hash.worker.ts`](./attachment-hash.worker.ts). |

---

## 4. STRUCTURE

| Path | Role |
|---|---|
| [`attachment-draft-provider.svelte`](./attachment-draft-provider.svelte) | Provides draft state, local files, object URLs and preview actions through Svelte context. |
| [`attachment-state.ts`](./attachment-state.ts) | Pure reducer and status helpers for the bounded draft model. |
| [`attachment-rail.svelte`](./attachment-rail.svelte) | Renders the horizontal list of pending photos. |
| [`attachment-tile.svelte`](./attachment-tile.svelte) | Renders one preview or unavailable tile and its remove action. |
| [`dialog-attachment-preview.svelte`](./dialog-attachment-preview.svelte) | Renders the local photo dialog with focus containment. |
| [`use-attachment-submission.svelte.ts`](./use-attachment-submission.svelte.ts) | Owns reactive submission state and invalidation. |
| [`attachment-client.ts`](./attachment-client.ts) | Prepares, reserves, uploads, reconciles and commits the transfer. |
| [`attachment-hash.worker.ts`](./attachment-hash.worker.ts) | Computes SHA-256 digests away from the main thread. |

---

## 5. USAGE EXAMPLES

| Person action | Result |
|---|---|
| Open the composer tools and choose photos | Accepted files appear as numbered tiles in the draft rail. |
| Tap a tile | A local-only dialog opens. No copy has been sent to the host. |
| Remove a tile | The remaining tiles are renumbered and focus moves to a live neighbor or the add-photo control. |
| Send a prompt with photos | The UI reports authorizing, uploading, server checking and committing before the prompt is accepted. |
| Cancel or leave the page during transfer | The active request is aborted. A pre-commit reservation is canceled and an ambiguous commit is reconciled instead of retried. |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| The photo control is missing | The host did not advertise image input. | Check the host media capability before changing the UI. |
| A selected photo says Model unavailable | The current model cannot view photos. | Choose a vision-capable model. The provider revalidates the draft after the model changes. |
| A tile says preview unavailable | The source is a supported file whose browser preview is unavailable, or its object URL failed. | The photo can still report its status. Select the file again if sending also fails. |
| Send says reconnect first | The connection is not live or the session snapshot is incomplete. | Reconnect and wait for a current epoch and prompt revision. |
| Sending fails as stale or expired | The reservation no longer matches the session or its lifetime ended. | Select Send again to create a fresh reservation. |
| Delivery is unknown | The commit started but the result was not confirmed. | Do not resend automatically. Let reconciliation or an explicit user decision resolve it. |

---

## 7. RELATED RESOURCES

### Related Documents

| Document | Purpose |
|---|---|
| [`README.md`](../README.md) | Chat surface navigation and child-area ownership. |
| [`CODE.md`](./CODE.md) | Provider, reducer, transfer and cleanup boundaries. |
| [`../chrome/README.md`](../chrome/README.md) | Composer tools that open the photo picker. |
| [`../transcript/README.md`](../transcript/README.md) | Conversation surface that receives the committed message. |
