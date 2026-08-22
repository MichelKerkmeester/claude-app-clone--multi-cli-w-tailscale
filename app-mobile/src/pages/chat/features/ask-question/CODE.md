# `features/ask-question/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`AskQuestionCard.svelte`** — composes prompt + options + submit; owns the transcript-status effect.
- **Parts** — `AskQuestionPrompt`, `AskQuestionOptionList` → `AskQuestionOptionRow`, `AskQuestionFreeText`, `AskQuestionStatus`, `AskQuestionSubmitButton`.
- **Logic** — `askQuestionTypes.ts`; `askQuestionEphemeralStore.ts` (ephemeral selection state); `useAskQuestionState.svelte.ts`, `useAskQuestionMutation.svelte.ts` (send + fail-closed), `useAskQuestionKeyboardNavigation.svelte.ts` (arrow-key nav + roles).

## Do-not

- **Reactivity gotcha — this folder has bitten before.** `AskQuestionCard`'s transcript-status `$effect` reads *and* writes the form state; left tracked it self-invalidates (`effect_update_depth_exceeded` on terminal/error transitions). It's fixed by `untrack`-ing the dispatch and reading `block.status` as the tracked dep — **don't reintroduce the read-then-write in a tracked effect.** Note the dispatch can be indirect (through a hook API method), so trace it, don't just grep for `dispatch(`.
- **Ephemeral state stays ephemeral** — don't promote in-progress selections into durable transcript/runtime state.
- **Keep answer submission fail-closed** — an unconfirmed/aborted answer must not silently send.
