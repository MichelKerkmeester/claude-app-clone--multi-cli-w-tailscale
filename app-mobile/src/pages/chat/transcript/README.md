# Transcript

The scrolling conversation itself — the virtualized list of transcript blocks and the per-block rendering. `Chat.svelte` owns the socket and hands normalized blocks here to display.

## What lives here

- **`TranscriptList.svelte`** — the virtualized list (via `@tanstack/svelte-virtual`) that renders only on-screen blocks.
- **`Block.svelte`** — one transcript block; delegates rich payloads to `rich-content/`.
- **`NormalizedActivityGroup.svelte` / `NormalizedTranscriptBlockView.svelte`** — grouping + view for normalized activity.
- **`AssistantActions.svelte`** — the action row on an assistant block.
- **`CollapsedEvidence.svelte`** — collapsed tool/evidence disclosure.
- **`FilePreviewCard.svelte`** — inline file preview card.
- **`RuntimeStatusRegion.svelte`** — inline runtime status inside the transcript.
- **`TodoProjectionBlock.svelte`** — the todo projection rendered as a block.
- **Logic:** `transcript-helpers.ts`.

## Why it's shaped this way

- **Virtualized for long conversations.** Only visible blocks mount; measurement is dynamic. Keep that — a naive full render janks on long transcripts on a phone.
- **Blocks are dumb; content is routed.** A `Block` decides *layout*; what goes inside a rich block is decided by `rich-content/RichContentRouter`. That split keeps block rendering simple.

Structure and do-nots are in `CODE.md`.
