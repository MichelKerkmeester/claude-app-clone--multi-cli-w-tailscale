# transcript/: normalization, grouping and rendering

---

## 1. OVERVIEW

`transcript/` owns the Svelte presentation layer between the chat host and the rendered transcript. It
receives display blocks and runtime flags, normalizes each block, groups the result into conversational
rows, and mounts only the rows needed by the viewport.

Current state:

- [`transcript-list.svelte`](./transcript-list.svelte) is the orchestration point for normalization, turn grouping, todo insertion, virtualization, live-edge scrolling and announcements.
- [`transcript-helpers.ts`](./transcript-helpers.ts) converts normalized blocks into `RenderItem` values for ordinary blocks, activity groups, inbound image stacks, answer actions and todo projection rows.
- The folder is flat and owns row composition. Rich payload cards and the chat host stay in sibling folders.

---

## 2. ARCHITECTURE

The runtime path has one orchestration component and two rendering branches:

```text
screen-chat.svelte
        |
        v
transcript-list.svelte
        |
        +--> ../rich-content/normalize-transcript-blocks.ts
        |          |
        |          v
        |    normalized block kinds
        |
        +--> ../../../shared/state/turns.ts
        |          |
        |          v
        |    conversational turns
        |
        +--> transcript-helpers.ts
                   |
                   v
             RenderItem[]
                   |
                   v
             measured virtual rows
                /        \\
               v          v
normalized-transcript-  normalized-activity-group.svelte
block-view.svelte       and local row components
        |
        +--> block.svelte
        |
        `--> ../rich-content/rich-content-router.svelte
```

`transcript-list.svelte` creates the `@tanstack/svelte-virtual` store with an estimated row size of
180 pixels and an overscan of 6. An effect reapplies the live row count and scroll element through
`setOptions`. Each virtual row calls `measureElement` and receives its vertical position through
`translateY`, so variable-height content does not require a fixed row layout.

---

## 3. PACKAGE TOPOLOGY

This is a flat presentation package. The dependency direction is intentionally narrow:

```text
screen-chat.svelte
        |
        v
transcript-list.svelte
        |
        +--> ../rich-content/normalize-transcript-blocks.ts
        +--> ../../../shared/state/turns.ts
        +--> transcript-helpers.ts
        +--> normalized-transcript-block-view.svelte
        +--> normalized-activity-group.svelte
        +--> todo-projection-block.svelte
        |
        v
row and leaf components
```

Allowed ownership edges:

- The chat host passes session and block state into `transcript-list.svelte`.
- `transcript-list.svelte` owns row order, virtualization and live-edge behavior.
- `transcript-helpers.ts` owns render-item grouping and todo-row placement.
- `normalized-transcript-block-view.svelte` chooses between `block.svelte` and
  `../rich-content/rich-content-router.svelte`.
- `block.svelte` owns standard block layout. Rich payload rendering remains in
  `../rich-content/rich-content-router.svelte` and its card components.
- `todo-projection-block.svelte` passes a read-only projection to `../chrome/todo-panel.svelte`. It
  does not mutate task state.

Disallowed ownership edges:

- Leaf rows must not recreate the virtualizer or change scroll position.
- `block.svelte` must not absorb the rich-content card router.
- Transcript components must not take ownership of the chat connection or the remote todo model.

---

## 4. DIRECTORY TREE

The folder has no immediate subdirectories. The complete direct-file inventory is below. Story files
exercise the corresponding component with real display or normalized fixtures.

| File | Responsibility |
|---|---|
| `assistant-actions.svelte` | Capability-gated Copy and Share actions for an assistant answer. |
| `assistant-actions.stories.ts` | Stories for answer actions using normalized assistant prose. |
| `block.svelte` | Renders display-block kinds, headers, disclosures, plans, usage and local cards. |
| `block.stories.ts` | Stories for user and assistant text, artifacts, tools, errors, unknown blocks and file preview states. |
| `card-file-preview.svelte` | Shows file preview metadata and opens an available artifact viewer. |
| `card-file-preview.stories.ts` | Stories for ready, withheld, missing, denied and unsupported preview states. |
| `collapsed-evidence.svelte` | Native one-line fold wrapper for routine evidence content. |
| `collapsed-evidence.stories.ts` | Stories for collapsed tool calls and tool results. |
| `menu-transcript-action.svelte` | Body-portal transcript action menu with disabled-row hints. |
| `menu-transcript-action.stories.ts` | Story for mixed available and disabled transcript actions. |
| `normalized-activity-group.svelte` | Projects consecutive activity into flat call↔result folds. |
| `normalized-activity-group.stories.ts` | Story for a normalized activity run. |
| `normalized-transcript-block-view.svelte` | Dispatches a normalized block to the standard block view or rich-content router. |
| `normalized-transcript-block-view.stories.ts` | Stories for normalized prose, code, text artifacts, commands, activity and fallback blocks. |
| `runtime-status-region.svelte` | Exposes the folder's polite runtime status live region. |
| `runtime-status-region.stories.ts` | Stories for checking, streaming, pending, accepted, stale and unsupported runtime phases. |
| `todo-projection-block.svelte` | Mounts an available read-only todo projection inside the transcript. |
| `todo-projection-block.stories.ts` | Stories for waiting and unsupported todo projection states. |
| `tool-fold.svelte` | Native `<details>` one-line tool fold with an in-flight label. |
| `tool-fold.stories.ts` | Stories for completed and in-flight grep folds. |
| `tool-run-pairing.ts` | Pairs tool calls with results; unpaired calls stay in-flight. |
| `transcript-find-bar.svelte` | Snapshot-scoped find chrome with wraparound and a role-tagged snippet. |
| `transcript-find-bar.stories.ts` | Stories for a current match and an empty result. |
| `transcript-find-context.svelte.ts` | Shares the active find term with mounted rows. |
| `transcript-find-index.ts` | Flat line index, match cursor, and `<mark>` split helpers. |
| `transcript-helpers.ts` | Defines render-item types, sequence grouping, turn grouping, todo insertion and activity labels. |
| `transcript-list.svelte` | Owns normalization, virtual rows, find, live-edge scrolling and row dispatch. |
| `transcript-list.stories.ts` | Stories for virtualized, live-edge and empty transcript states. |
| `transcript-load-panel.svelte` | Named loading, missing, unsupported and error transcript states. |
| `transcript-load-panel.stories.ts` | Stories for the four unresolved load states. |
| `transcript-load-state.ts` | Derives the five-state load taxonomy and held-thread retention. |
| `transcript-selection.ts` | Scopes copy selection to the transcript root. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`transcript-list.svelte`](./transcript-list.svelte) | Accepts the host props, normalizes blocks, builds render items, maintains the virtualizer, and owns find, turn-scroll and scoped copy. |
| [`transcript-find-index.ts`](./transcript-find-index.ts) | Builds the snapshot line index and wraparound cursor used by the find bar. |
| [`transcript-load-state.ts`](./transcript-load-state.ts) | Derives loading, ok, missing, unsupported and error without inventing host fields. |
| [`transcript-helpers.ts`](./transcript-helpers.ts) | Groups activity and inbound image runs, aligns normalized blocks to turns, adds answer actions and inserts a todo projection at its sequence anchor. |
| [`normalized-transcript-block-view.svelte`](./normalized-transcript-block-view.svelte) | Sends fallback and file-diff display blocks to [`block.svelte`](./block.svelte) and sends rich kinds to [rich-content-router.svelte](../rich-content/rich-content-router.svelte). |
| [`block.svelte`](./block.svelte) | Owns display-block labels, collapsibility and standard block markup. It delegates artifacts, inbound images and questions to sibling feature folders. |
| [`normalized-activity-group.svelte`](./normalized-activity-group.svelte) | Keeps a normalized activity run closed until the reader opens its disclosure. |
| [`assistant-actions.svelte`](./assistant-actions.svelte) | Renders Copy and Share only when the browser exposes the matching API. |
| [`todo-projection-block.svelte`](./todo-projection-block.svelte) | Renders the task panel (../chrome/todo-panel.svelte) from projection props without editing the source plan. |
| [`runtime-status-region.svelte`](./runtime-status-region.svelte) | Publishes one polite atomic runtime announcement region for its caller. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Host input | [screen-chat.svelte](../screen-chat.svelte) supplies session, block, capability and running props. |
| Normalization | [normalize-transcript-blocks.ts](../rich-content/normalize-transcript-blocks.ts) accepts display or protocol blocks and emits normalized prose, code, command, text-artifact, activity, diff or fallback kinds. |
| Turn grouping | [turns.ts](../../../shared/state/turns.ts) detects user prompts and preserves the original block order. |
| Row shaping | [`transcript-helpers.ts`](./transcript-helpers.ts) turns normalized data into render items. It does not render markup. |
| Virtualization | [`transcript-list.svelte`](./transcript-list.svelte) owns count, measurement, overscan, row position and scroll follow behavior. |
| Rich rendering | [rich-content-router.svelte](../rich-content/rich-content-router.svelte) owns rich cards, safe Markdown, diffs and redaction-bounded fallback output. |
| Task projection | [`todo-projection-block.svelte`](./todo-projection-block.svelte) mounts the task panel (../chrome/todo-panel.svelte) as a read-only annotation. |

Main flow:

```text
DisplayTranscriptBlock[] from screen-chat.svelte
                  |
                  v
normalizeTranscriptBlocks()
                  |
                  v
normalized transcript blocks
                  |
                  +--> groupBlocksIntoTurns()
                  |          |
                  |          v
                  |    groupNormalizedTranscript()
                  |
                  +--> groupNormalizedSequence()
                  |
                  +--> insertTodoProjectionItem()
                             |
                             v
                       RenderItem[]
                             |
                             v
                 createVirtualizer and measured rows
                             |
                 +-----------+-----------+
                 |                       |
                 v                       v
      NormalizedTranscriptBlockView   TodoProjectionBlock
                 |
          +------+------+
          |             |
          v             v
       Block      RichContentRouter
```

Arrival behavior is part of the list boundary. When a new block arrives within 96 pixels of the
bottom, the list follows it. When the reader is farther away, the list preserves the reader's scroll
position and increments the unseen-block count. A running turn adds a marker below the virtualized
content. The list announces each newly completed block through its polite live region.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `transcript-list.svelte` | Default Svelte component | Mounted by screen-chat.svelte as the transcript surface. |
| `TranscriptListProps` | Interface | Defines session, display blocks, running state, answer capability and todo callbacks accepted by the list. |
| `normalizeTranscriptBlocks` | Function | Converts display or protocol transcript blocks into normalized render input. |
| `groupNormalizedTranscript` | Function | Aligns normalized blocks to turns and adds assistant action rows. |
| `insertTodoProjectionItem` | Function | Places an available todo projection at its sequence anchor. |
| `normalizedActivitySummary` | Function | Produces the compact label for a grouped activity run. |

The grouping helpers are exported from [`transcript-helpers.ts`](./transcript-helpers.ts), while
normalization is exported from [normalize-transcript-blocks.ts](../rich-content/normalize-transcript-blocks.ts). The Svelte
component interfaces are declared in their owning files.

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The transcript folder is healthy when it has both `README.md` and `CODE.md`, and no
`pages/chat/transcript/README.md` entry appears under broken references. The command also reports
coverage and reference findings in other source folders.

---

## 9. RELATED

- [`README.md`](./README.md)
- [screen-chat.svelte](../screen-chat.svelte)
- [`rich-content/README.md`](../rich-content/README.md)
- [`artifacts/README.md`](../artifacts/README.md)
