# features/ask-question/: ticketed question card state and input flow

---

## 1. OVERVIEW

`features/ask-question/` is a flat Svelte feature package. It turns transcript question metadata into
an interactive card, keeps the draft keyed to the question revision and sends an answer through the
relay's ticketed protocol.

Current state:

- [`card-ask-question.svelte`](./card-ask-question.svelte) is the orchestration point. It fetches the display payload, composes the controls and applies transcript status locks.
- [`use-ask-question-state.svelte.ts`](./use-ask-question-state.svelte.ts) owns validation and the form reducer. [`ask-question-ephemeral-store.ts`](./ask-question-ephemeral-store.ts) holds the draft outside durable transcript state.
- [`use-ask-question-mutation.svelte.ts`](./use-ask-question-mutation.svelte.ts) binds the answer to a principal and expected revision, requests a ticket and submits once.
- The folder owns question controls and focus behavior. The chat host, relay connection and transcript list remain outside it.

---

## 2. ARCHITECTURE

```text
screen-chat.svelte
        |
        v
transcript question block
        |
        v
card-ask-question.svelte
        |
        +--> fetchAskQuestionDisplay()
        |          |
        |          v
        |    AskQuestionViewModel
        |
        +--> use-ask-question-state.svelte.ts
        |          |
        |          +--> ask-question-types.ts
        |          +--> ask-question-ephemeral-store.ts
        |          |
        |          v
        |    form phase and draft
        |
        +--> ask-question-prompt.svelte
        +--> ask-question-option-list.svelte
        +--> ask-question-free-text.svelte
        +--> ask-question-status.svelte
        +--> button-ask-question-submit.svelte
        |
        `--> use-ask-question-mutation.svelte.ts
                   |
                   +--> request answer ticket
                   `--> submit answer and resolve result
```

The keyboard lifecycle attaches to the card after its controls exist. It assigns the heading,
fieldset, status and error relationships, then maintains a roving tab stop across active options.

---

## 3. PACKAGE TOPOLOGY

The package has four ownership zones:

```text
card-ask-question.svelte
        |
        +--> presentation controls
        |    prompt · option list · option row · free text · status · submit
        |
        +--> state and protocol mapping
        |    ask-question-types.ts · use-ask-question-state.svelte.ts
        |
        +--> ephemeral draft
        |    ask-question-ephemeral-store.ts
        |
        `--> side-effect hooks
             use-ask-question-mutation.svelte.ts
             use-ask-question-keyboard-navigation.svelte.ts
```

Allowed dependency direction:

```text
card → state and mutation hooks → types and ephemeral store
card → presentational controls
card → keyboard lifecycle
```

The state reducer does not call the relay. The mutation hook does not mutate transcript state. The
presentational controls emit selection and text events without owning validation or submission.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`ask-question-ephemeral-store.ts`](./ask-question-ephemeral-store.ts) | Stores display data and drafts by question id and revision. |
| [`ask-question-free-text.svelte`](./ask-question-free-text.svelte) | Renders optional or required free text. |
| [`ask-question-free-text.stories.ts`](./ask-question-free-text.stories.ts) | Exercises free-text default, filled, required, invalid and disabled states. |
| [`ask-question-option-list.svelte`](./ask-question-option-list.svelte) | Renders the choice fieldset and option rows. |
| [`ask-question-option-list.stories.ts`](./ask-question-option-list.stories.ts) | Exercises single, multiple, partial and disabled selection. |
| [`ask-question-option-row.svelte`](./ask-question-option-row.svelte) | Renders one selectable option with its indicator and description. |
| [`ask-question-option-row.stories.ts`](./ask-question-option-row.stories.ts) | Exercises idle, selected, multiple-indicator and disabled rows. |
| [`ask-question-prompt.svelte`](./ask-question-prompt.svelte) | Renders the Pi asks eyebrow and prompt headline. |
| [`ask-question-prompt.stories.ts`](./ask-question-prompt.stories.ts) | Exercises the prompt display. |
| [`ask-question-status.svelte`](./ask-question-status.svelte) | Renders the phase glyph and status message. |
| [`ask-question-status.stories.ts`](./ask-question-status.stories.ts) | Exercises presented, selecting, submitting, answered, expired and error states. |
| [`ask-question-types.ts`](./ask-question-types.ts) | Defines view, form, result and terminal-state helpers. |
| [`button-ask-question-submit.svelte`](./button-ask-question-submit.svelte) | Renders the guarded form submit button. |
| [`button-ask-question-submit.stories.ts`](./button-ask-question-submit.stories.ts) | Exercises enabled and disabled submit buttons. |
| [`card-ask-question.svelte`](./card-ask-question.svelte) | Fetches, composes and locks the question card. |
| [`card-ask-question.stories.ts`](./card-ask-question.stories.ts) | Exercises presented, submitting, answered, expired and read-only cards. |
| [`use-ask-question-keyboard-navigation.svelte.ts`](./use-ask-question-keyboard-navigation.svelte.ts) | Adds ARIA wiring, roving focus and keyboard traversal. |
| [`use-ask-question-mutation.svelte.ts`](./use-ask-question-mutation.svelte.ts) | Performs ticketed, revision-bound answer submission. |
| [`use-ask-question-state.svelte.ts`](./use-ask-question-state.svelte.ts) | Creates and reduces validated form state. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`card-ask-question.svelte`](./card-ask-question.svelte) | Checks the fetched display identity, composes the child controls and maps transcript status to effective UI state. |
| [`use-ask-question-state.svelte.ts`](./use-ask-question-state.svelte.ts) | Enforces option bounds, free-text limits, protocol byte limits and control or bidi character rejection. |
| [`use-ask-question-mutation.svelte.ts`](./use-ask-question-mutation.svelte.ts) | Derives the answer digest, requests the answer ticket and turns failures into explicit rejected results. |
| [`use-ask-question-keyboard-navigation.svelte.ts`](./use-ask-question-keyboard-navigation.svelte.ts) | Keeps focus and ARIA relationships correct as controls appear, disable or become terminal. |
| [`ask-question-ephemeral-store.ts`](./ask-question-ephemeral-store.ts) | Preserves a draft during the active card lifecycle without promoting it to the shared transcript. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Host input | [screen-chat.svelte](../../screen-chat.svelte) supplies the transcript block and answer capability. |
| Display fetch | The card accepts a payload only when session id, question id and presented revision still match. |
| Draft ownership | The ephemeral store is keyed by question id and revision. It is released on teardown or terminal state. |
| Validation | The state hook rejects invalid options, selection counts, text limits and control or bidi characters before hashing. |
| Mutation | The mutation hook binds principal, question id and expected revision into the digest, obtains a ticket and submits the same answer with a client mutation id. |
| Transcript status | The card reads block status and applies it through an untracked dispatch so the effect does not read and write the same reactive state. |
| Presentation | Child components emit events. They do not call relay functions or decide terminal states. |

Main flow:

```text
transcript metadata
        |
        v
fetch display for question + revision
        |
        v
validate view model identity
        |
        v
create draft in ephemeral store
        |
        +--> select option or set free text
        |          |
        |          v
        |    reducer validates and updates phase
        |
        `--> begin submit
                   |
                   v
             answer digest + relay ticket
                   |
                   v
             answer result
                   |
        +----------+----------+
        |                     |
        v                     v
  answered immutable     error or terminal reconciliation
```

The important safety property is that submission is not optimistic. A ticket or result failure
becomes a visible rejected or delivery-unknown state.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`card-ask-question.svelte`](./card-ask-question.svelte) | Svelte component | Mounted by the transcript for an ask-question block. |
| `createAskQuestionState` | Function | Creates form state for a view model and optional initial phase. |
| `validateAskQuestionAnswer` | Function | Checks the draft before a mutation starts. |
| `askQuestionStateReducer` | Function | Applies selection, text, submit, result and transcript-status actions. |
| `useAskQuestionState` | Runes hook | Exposes reactive state and form actions to the card. |
| `useAskQuestionMutation` | Runes hook | Exposes idempotent ticketed submission. |
| `useAskQuestionKeyboardNavigation` | Runes hook | Exposes card focus and keyboard behavior. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/chat/features/ask-question`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Chat transcript CODE](../../transcript/CODE.md)
- [Rich content CODE](../../rich-content/CODE.md)
- [screen-chat.svelte](../../screen-chat.svelte)
