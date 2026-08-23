# Chat screen

The conversation view at `/session/[id]` — the app's largest and most complex screen. `screen-chat.svelte` owns the socket-backed transcript, the composer, and the runtime controls; the sub-areas below decompose it so each part is editable on its own.

> The file is `screen-chat.svelte` (renamed from `Session`). The route and the internal session-protocol names are unchanged.

## Sub-areas (each its own folder + README)

| Folder | What it renders |
|--------|-----------------|
| `transcript/` | The transcript list and per-block rendering (the scrolling conversation). |
| `chrome/` | The composer, session header, runtime strip, plan-mode controls, and command palette. |
| `artifacts/` | Artifact, image, PDF, and code viewers. |
| `attachments/` | Attachment drafts and the preview dialog. |
| `rich-content/` | Markdown and rich block rendering inside transcript blocks. |
| `features/ask-question/` | The interactive ask-question card flow. |

`screen-chat.svelte` itself owns the screen shell: the socket lifecycle, the virtualizer, and wiring the sub-areas together. State/actions arrive from shell context via `routes/session/[id]/+page.svelte`.
