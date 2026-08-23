# Ask-question feature

The interactive **ask-question card**: when the agent needs a decision, this renders the prompt, the options (single/multi/free-text), and the submit flow, and sends the answer back. A self-contained feature slice — its own components, state, keyboard nav, and mutation.

## What lives here

- **`card-ask-question.svelte`** — the card shell that composes the parts below.
- **Parts:** `AskQuestionPrompt`, `AskQuestionOptionList`, `AskQuestionOptionRow`, `AskQuestionFreeText`, `AskQuestionStatus`, `AskQuestionSubmitButton`.
- **Logic:** `ask-question-types.ts` (types), `ask-question-ephemeral-store.ts` (ephemeral per-question state), `use-ask-question-state.svelte.ts`, `use-ask-question-mutation.svelte.ts`, `use-ask-question-keyboard-navigation.svelte.ts` (runes lifecycles).

## Why it's shaped this way

- **A feature folder, not scattered chrome.** Everything for this one interaction lives together — open the folder, see the whole feature.
- **Ephemeral answer state is isolated.** In-progress selections live in `askQuestionEphemeralStore` (they don't belong in durable transcript state) and clear on submit/teardown.
- **Keyboard navigation is first-class.** Option lists are arrow-navigable with correct roles — a hand-built concern kept in its own lifecycle.

Structure and the reactivity do-not are in `CODE.md`.
