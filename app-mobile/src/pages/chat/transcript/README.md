# Chat Transcript

> The transcript turns a live chat session into a readable, navigable conversation.

---

## 1. OVERVIEW

The transcript is the main reading surface inside the chat screen. It shows user prompts and assistant
responses together with typed evidence such as plans, tool activity, file diffs, file previews, images,
attachments, questions and usage details.

People use it to follow a turn as it runs, open details when needed, return to the newest output, and
act on an assistant answer. The chat screen passes the session and block data from
[screen-chat.svelte](../screen-chat.svelte). The transcript presents that data. It does not own the
chat connection or the task state.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte surface |
| Main audience | People reading a chat session |
| Live states | Empty, streaming, at the live edge, scrolled away and settled |
| Detail model | Expanded prose with collapsible evidence and activity |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Live reading | New blocks follow the viewport while it stays near the bottom. |
| Turn navigation | User prompts, assistant replies and related evidence stay in conversational order. |
| Evidence on demand | Thinking summaries, plans, tool calls, tool results and usage can stay compact until opened. |
| Rich content | Code, command output, text artifacts, diffs, previews, images and unsupported blocks get an appropriate view. |
| Reader actions | A reader can jump to the latest output and can copy or share an assistant answer when the browser provides that capability. |
| Status surfaces | A running turn shows a working marker. A todo projection and polite status announcements appear when their data is available. |

The transcript keeps routine evidence visually quieter than the answer. Activity runs can be opened as
one disclosure, while a file preview remains a separate card with its availability state visible.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Chat host | An active session rendered by [screen-chat.svelte](../screen-chat.svelte) | The host supplies the session id, transcript blocks and running state. |
| Browser actions | Clipboard or Web Share support | Copy and Share appear only when the corresponding browser capability exists. |
| Session data | Displayable transcript blocks | An empty session shows an empty state until blocks or a todo projection arrive. |

No transcript-specific configuration is required from the reader.

---

## 4. STRUCTURE

The feature is a flat folder. These are the files a reader is most likely to encounter:

| File | Role |
|---|---|
| [`transcript-list.svelte`](./transcript-list.svelte) | Owns the live list, virtual scrolling, turn grouping and arrival behavior. |
| [`transcript-helpers.ts`](./transcript-helpers.ts) | Shapes normalized blocks into renderable rows and inserts actions or todo projection rows. |
| [`normalized-transcript-block-view.svelte`](./normalized-transcript-block-view.svelte) | Chooses the block or rich-content view for a normalized item. |
| [`block.svelte`](./block.svelte) | Renders the standard block states and their local disclosure or card chrome. |
| [`CODE.md`](./CODE.md) | Explains the code path and the ownership boundaries. |

---

## 5. USAGE EXAMPLES

| Situation | What the reader sees or does |
|---|---|
| A turn is running | New rows appear in order. The working marker remains below the rows while the turn is active. |
| The reader stays at the bottom | The viewport follows new blocks automatically. |
| The reader scrolls up | New blocks continue arriving without moving the reader. A jump-to-latest control shows the number of unseen blocks when available. |
| Evidence needs inspection | Open the activity or evidence disclosure to read the bounded details. |
| An answer is useful elsewhere | Select Copy or Share when the browser exposes those actions. |
| A file preview is available | Open the preview card to hand the file diff to the artifact viewer. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| New blocks do not pull the view down | The reader is away from the live edge. | Select the jump-to-latest control. |
| Tool or thinking details are not visible | Routine evidence is collapsed by default. | Open its disclosure row. |
| A file preview says Withheld, Missing, Denied or Unsupported | The preview metadata is present but the content is not available in the current state. | Read the state on the card. Opening is available only when a viewer can handle the preview. |
| Copy or Share is missing | The browser does not expose that action. | Use the platform's normal text selection or sharing flow. |
| A photo says the preview was not retained | The transcript has delivery information without keeping image content. | Treat the row as a delivery record rather than an image viewer. |
| A todo projection cannot be edited | The transcript displays a read-only projection of the remote plan. | Make task changes in the controlling chat workflow. |

---

## 7. FAQ

**Q: Does scrolling up pause the running turn?**

A: No. It only changes whether new rows follow the viewport automatically.

**Q: Why are several evidence blocks shown as one row?**

A: Consecutive activity and inbound image blocks are grouped so a turn is easier to scan.

**Q: Why can a file card show metadata without opening?**

A: The relay can provide a file's name, renderer, revision or availability state without providing
content that the viewer can open.

---

## 8. RELATED RESOURCES

### Related Documents

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Code arrangement, normalization and row flow. |
| [screen-chat.svelte](../screen-chat.svelte) | Chat surface that hosts the transcript. |
| [`rich-content/README.md`](../rich-content/README.md) | Rendering for normalized prose, code, commands, artifacts and diffs. |
| [`artifacts/README.md`](../artifacts/README.md) | File and image preview surfaces used by transcript blocks. |
