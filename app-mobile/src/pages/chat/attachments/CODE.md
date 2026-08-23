# attachments/: local draft and ticketed transfer

---

## 1. OVERVIEW

`attachments/` is a flat Svelte feature package with two distinct responsibilities. The provider and reducer manage a local photo draft for the composer. The submission hook and client turn that draft into a ticketed relay transfer only after the user explicitly sends it.

Current state:

- [`attachment-draft-provider.svelte`](./attachment-draft-provider.svelte) owns Svelte context, `File` objects, object URLs, capability changes and lifecycle cleanup.
- [`attachment-state.ts`](./attachment-state.ts) is the pure reducer. It stores only bounded metadata such as id, ordinal, status and preview availability.
- [`use-attachment-submission.svelte.ts`](./use-attachment-submission.svelte.ts) owns the reactive state machine and invalidates a transfer when the session, model, connection or draft changes.
- [`attachment-client.ts`](./attachment-client.ts) is the transport boundary. It prepares bytes, reserves an attachment set, uploads at most two parts in parallel, reconciles status and commits references with the message.

---

## 2. ARCHITECTURE

```text
screen-chat.svelte
        |
        v
attachment-draft-provider.svelte
        |
        +--> attachment-state.ts
        |          |
        |          v
        |    draft metadata and status
        |          |
        |          +--> attachment-rail.svelte --> attachment-tile.svelte
        |          `--> dialog-attachment-preview.svelte
        |
        `--> use-attachment-submission.svelte.ts
                    |
                    v
             attachment-client.ts
                    |
          +---------+---------+
          v                   v
 attachment-hash.worker.ts   relay reservation, upload and commit
```

The provider is the context boundary between the composer and the attachment surfaces. The reducer does not know about files or transport. The submission hook reads files through the provider, while the client owns all relay-facing checks.

---

## 3. PACKAGE TOPOLOGY

```text
attachments/
+-- attachment-draft-provider.svelte       # Context and local File/Object URL ownership
+-- attachment-state.ts                    # Pure draft reducer and status helpers
+-- attachment-rail.svelte                 # Pending-photo list
+-- attachment-tile.svelte                 # One photo tile
+-- dialog-attachment-preview.svelte       # Local preview dialog
+-- use-attachment-submission.svelte.ts    # Reactive submission state machine
+-- attachment-client.ts                   # Transfer preparation and relay boundary
+-- attachment-hash.worker.ts              # Off-main-thread digest worker
```

Allowed dependency direction:

```text
provider -> attachment-state
rail / tile / preview dialog -> provider context
submission hook -> provider context -> attachment-client
attachment-client -> attachment-hash.worker
attachment-client -> shared relay transport
```

Disallowed ownership direction:

```text
attachment-state -> File, URL, Worker or relay transport
attachment-tile -> relay transport
attachment-client -> composer DOM or prompt focus
```

---

## 4. DIRECTORY TREE

The folder is flat. The complete direct-file inventory is below. Story files exercise the corresponding surface or pure transfer helper.

| File | Responsibility |
|---|---|
| [`attachment-client.ts`](./attachment-client.ts) | Prepares transfer blobs, creates reservations, uploads parts, checks status, commits references and classifies errors. |
| [`attachment-draft-provider.svelte`](./attachment-draft-provider.svelte) | Provides the draft context, retains local files and revokes object URLs. |
| [`attachment-draft-story-host.svelte`](./attachment-draft-story-host.svelte) | Supplies staged files to context-only stories. |
| [`attachment-hash.worker.ts`](./attachment-hash.worker.ts) | Receives an `ArrayBuffer` and returns a SHA-256 digest response. |
| [`attachment-rail.svelte`](./attachment-rail.svelte) | Renders the ordered photo rail and coordinates focus after removal. |
| [`attachment-rail.stories.ts`](./attachment-rail.stories.ts) | Stories for an empty rail and a populated draft. |
| [`attachment-state.ts`](./attachment-state.ts) | Defines draft types, limits, reducer actions and status helpers. |
| [`attachment-tile.svelte`](./attachment-tile.svelte) | Renders preview, unavailable state, label, status and remove action for one item. |
| [`attachment-tile.stories.ts`](./attachment-tile.stories.ts) | Stories for available, unavailable and status variants. |
| [`dialog-attachment-preview.svelte`](./dialog-attachment-preview.svelte) | Renders a local photo preview with dismissal and focus containment. |
| [`dialog-attachment-preview.stories.ts`](./dialog-attachment-preview.stories.ts) | Stories for an open local preview and unavailable pixels. |
| [`use-attachment-submission.svelte.ts`](./use-attachment-submission.svelte.ts) | Exposes submit, cancel, busy, retryable and status-message state for the composer. |
| [`README.md`](./README.md) | Feature behavior and user-facing troubleshooting. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`attachment-draft-provider.svelte`](./attachment-draft-provider.svelte) | `getAttachmentDraft()` exposes selection, preview, removal and cleanup operations to descendants without prop drilling. |
| [`attachment-state.ts`](./attachment-state.ts) | `attachmentDraftReducer()` applies capability, selection, validation, preview, removal and clear actions as pure state transitions. |
| [`use-attachment-submission.svelte.ts`](./use-attachment-submission.svelte.ts) | `useAttachmentSubmission()` tracks the active generation and fail-closed phases from waiting through delivery-unknown. |
| [`attachment-client.ts`](./attachment-client.ts) | `prepareAttachmentTransfers()`, reservation, upload, reconciliation and commit functions define the relay protocol boundary. |
| [`attachment-hash.worker.ts`](./attachment-hash.worker.ts) | Hashes transferred bytes through `crypto.subtle` in a module Worker. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Draft state | Keep `AttachmentDraftState` free of `File` objects, object URLs and transport tickets. |
| Local storage | The provider owns `File` objects and revokes their object URLs on removal, session switch, logout, app lock, page hide and teardown. |
| Selection UI | The rail and preview dialog read provider context. They do not call the relay or mutate prompt state. |
| Submission | The hook rejects an offline, stale, blocked, empty or command-only submission before it starts the client pipeline. |
| Transport | The client validates type, byte limits, reservation identity, revision, part order and digest before commit. |
| Commit uncertainty | After commit begins, cancellation cannot claim success. The hook exposes `delivery-unknown` and reconciles the reservation instead of retrying. |

Main flow:

```text
Photo picker in composer tools
             |
             v
attachment-draft-provider.svelte
             |
             v
attachmentDraftReducer()
             |
             +--> draft rail and local preview
             |
             `--> useAttachmentSubmission.submit()
                         |
                         v
              prepareAttachmentTransfers()
                         |
                         v
              createAttachmentReservation()
                         |
                         v
              uploadPreparedAttachments()
                         |
                         v
              reconcileAttachmentSet()
                         |
                         v
              commitAttachmentSubmission()
                         |
                         v
                   prompt accepted
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `getAttachmentDraft` | Function | Reads the provider context used by the rail, tile, dialog and submission hook. |
| `attachmentDraftReducer` | Function | Applies one bounded draft action and returns the next state. |
| `useAttachmentSubmission` | Function | Creates the reactive submission controller consumed by the composer. |
| `prepareAttachmentTransfers` | Function | Converts selected sources to bounded transfer blobs and worker hashes. |
| `createAttachmentReservation` | Function | Binds the manifest to the session epoch and expected prompt revision. |
| `uploadPreparedAttachments` | Function | Uploads reserved parts with progress and a two-part concurrency limit. |
| `reconcileAttachmentSet` | Function | Confirms the relay returned the same ready parts that were reserved. |
| `commitAttachmentSubmission` | Function | Sends the prompt with attachment references after readiness checks pass. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The attachment folder is covered when it does not appear under missing feature or code documents and its local references resolve. Transfer behavior should be exercised through the attachment stories and the app-mobile typecheck when changing source.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`../README.md`](../README.md)
- [`../chrome/CODE.md`](../chrome/CODE.md)
- [`../transcript/CODE.md`](../transcript/CODE.md)
