# chat/: session composition and child surfaces

---

## 1. OVERVIEW

`pages/chat/` is the Svelte composition root for an active session. [`screen-chat.svelte`](./screen-chat.svelte) receives session state and callbacks from the route, owns the sync and runtime control hooks, then mounts the transcript, chrome, artifact provider and attachment provider around the conversation surface.

Current state:

- The root owns connection, transcript, prompt, slash-binding, stop, retry, sheet and todo-refresh state.
- [`transcript/`](./transcript/CODE.md) owns normalization, grouping, virtualization and reader behavior.
- [`chrome/`](./chrome/CODE.md) owns composer controls, runtime presentation, sheets, plan review and the read-only todo panel.
- [`artifacts/`](./artifacts/CODE.md) owns the viewer context and preview lifecycle.
- [`attachments/`](./attachments/CODE.md) owns local photo state and ticketed photo submission.
- [`rich-content/`](./rich-content/CODE.md) and [`features/ask-question/`](./features/ask-question/CODE.md) own specialized transcript content.

The root should coordinate these surfaces, not absorb their leaf rendering or duplicate their state machines.

---

## 2. ARCHITECTURE

```text
routes/session/[id]/+page.svelte
             |
             v
      screen-chat.svelte
             |
   +---------+----------+------------------+
   |                    |                  |
   v                    v                  v
transcript/         chrome/          provider boundaries
virtual rows        controls         artifacts/ + attachments/
   |                    |                  |
   +----------+---------+------------------+
              v
       session interaction state
              |
              v
   transcript, runtime and relay callbacks
```

The route supplies the session contract. The root passes transcript blocks and runtime state to child surfaces. The child surfaces report user actions through callbacks, while socket and relay ownership stays above them.

---

## 3. PACKAGE TOPOLOGY

```text
pages/chat/
+-- screen-chat.svelte               # Composition root and session handlers
+-- screen-chat.stories.ts           # Root surface stories
+-- transcript/                       # Normalization and virtual rendering
+-- chrome/                           # Input, runtime controls and overlays
+-- artifacts/                        # Viewer provider, host and previews
+-- attachments/                      # Local photo context and submission
+-- rich-content/                     # Safe rich transcript renderers
`-- features/ask-question/            # Question feature slice
```

Allowed dependency direction:

```text
routes/session/[id]/+page.svelte -> screen-chat.svelte
screen-chat.svelte -> transcript/, chrome/, artifacts/, attachments/
transcript/ -> rich-content/ and local row components
transcript/ -> features/ask-question/ when a question block is rendered
```

Ownership rules:

- [`screen-chat.svelte`](./screen-chat.svelte) owns the session-level connection and runtime hooks.
- [`transcript/transcript-list.svelte`](./transcript/transcript-list.svelte) owns row shaping and viewport behavior.
- [`chrome/session-composer.svelte`](./chrome/session-composer.svelte) owns composer-local interaction state and calls root callbacks.
- [`artifacts/artifact-viewer-provider.svelte`](./artifacts/artifact-viewer-provider.svelte) owns viewer state after a card opens.
- [`attachments/attachment-draft-provider.svelte`](./attachments/attachment-draft-provider.svelte) owns local `File` objects and object URLs.

Do not move relay lifecycle into a leaf component or move leaf preview state into the root simply to pass another prop.

---

## 4. DIRECTORY TREE

The folder has immediate child directories, so the navigation tree is the useful inventory here:

```text
pages/chat/
+-- screen-chat.svelte
+-- screen-chat.stories.ts
+-- transcript/
+-- chrome/
+-- artifacts/
+-- attachments/
+-- rich-content/
`-- features/ask-question/
```

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`screen-chat.svelte`](./screen-chat.svelte) | Defines `SessionProps`, owns connection and runtime hooks, sends prompts and composes child surfaces. |
| [`screen-chat.stories.ts`](./screen-chat.stories.ts) | Exercises the session root with representative transcript and runtime states. |
| [`transcript/transcript-list.svelte`](./transcript/transcript-list.svelte) | Receives blocks and renders the virtualized transcript. |
| [`chrome/session-composer.svelte`](./chrome/session-composer.svelte) | Renders the prompt input and sends root callbacks for text, commands, stop and attachments. |
| [`artifacts/artifact-viewer-provider.svelte`](./artifacts/artifact-viewer-provider.svelte) | Provides the viewer context around transcript content. |
| [`attachments/attachment-draft-provider.svelte`](./attachments/attachment-draft-provider.svelte) | Provides the local attachment draft around the composer. |
| [`rich-content/rich-content-router.svelte`](./rich-content/rich-content-router.svelte) | Routes normalized rich transcript payloads to safe renderers. |
| [`features/ask-question/card-ask-question.svelte`](./features/ask-question/card-ask-question.svelte) | Renders the interactive question card when a transcript block requires an answer. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Route input | [`../../routes/session/[id]/+page.svelte`](../../routes/session/[id]/+page.svelte) supplies session props and dispatch callbacks. |
| Session state | [`screen-chat.svelte`](./screen-chat.svelte) owns sync, runtime, prompt submission and root-level reconciliation generations. |
| Transcript rendering | [`transcript/`](./transcript/CODE.md) owns rows and scroll behavior. The root does not virtualize leaf content. |
| Composer rendering | [`chrome/`](./chrome/CODE.md) owns focus-sensitive controls. The root passes callbacks and authority state. |
| Artifact lifetime | [`artifacts/`](./artifacts/CODE.md) owns viewer context, resource verification and privacy cleanup after open. |
| Attachment lifetime | [`attachments/`](./attachments/CODE.md) owns local files, hashing, upload reservation and commit uncertainty. |
| Rich content | [`rich-content/`](./rich-content/CODE.md) owns safe Markdown and rich card selection. |

Main flow:

```text
route session props
        |
        v
screen-chat.svelte
        |
        +--> sync socket -> connection and transcript state
        +--> runtime controls -> model, effort and plan state
        +--> transcript-list.svelte -> normalized virtual rows
        +--> session-composer.svelte -> prompt and command callbacks
        +--> artifact-viewer-provider.svelte -> opened viewer lifecycle
        `--> attachment-draft-provider.svelte -> local photo lifecycle
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `screen-chat.svelte` | Default Svelte component | Mounts the complete in-session surface. |
| `SessionProps` | Interface | Defines the route-to-screen contract for connection, transcript, runtime and navigation callbacks. |
| `sendPrompt` | Local function | Creates an optimistic prompt block and submits a normal message. |
| `sendSlashDraft` | Local function | Revalidates a selected host command and sends one explicit slash submission. |
| `stopRun` | Local function | Requests interruption of the current turn and reports an unconfirmed stop. |
| `openSheet` | Local function | Opens the shared model or effort sheet and records its focus trigger. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The chat root is covered when it does not appear under missing feature or code documents and all child-document links resolve. When changing source, run the app-mobile typecheck and the relevant story set.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`transcript/CODE.md`](./transcript/CODE.md)
- [`chrome/CODE.md`](./chrome/CODE.md)
- [`artifacts/CODE.md`](./artifacts/CODE.md)
- [`attachments/CODE.md`](./attachments/CODE.md)
- [`rich-content/CODE.md`](./rich-content/CODE.md)
- [`features/ask-question/CODE.md`](./features/ask-question/CODE.md)
