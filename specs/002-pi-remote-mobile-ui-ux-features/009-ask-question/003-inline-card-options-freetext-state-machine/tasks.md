# Tasks — Inline ask-question card, options, free-text, and non-optimistic state machine

- [ ] Add `apps/pi-remote-web/src/features/ask-question/askQuestionTypes.ts` and `apps/pi-remote-web/src/features/ask-question/askQuestionEphemeralStore.ts` for the guarded web view model and volatile display content.
- [ ] Add `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` as the inline section owning lifecycle state, local form state, focus entry, and submit orchestration.
- [ ] Add `apps/pi-remote-web/src/features/ask-question/AskQuestionPrompt.tsx`, `apps/pi-remote-web/src/features/ask-question/AskQuestionOptionList.tsx`, and `apps/pi-remote-web/src/features/ask-question/AskQuestionOptionRow.tsx` for prompt and option presentation.
- [ ] Add `apps/pi-remote-web/src/features/ask-question/AskQuestionFreeText.tsx`, `apps/pi-remote-web/src/features/ask-question/AskQuestionSubmitButton.tsx`, and `apps/pi-remote-web/src/features/ask-question/AskQuestionStatus.tsx` for explicit input and safe status.
- [ ] Add `apps/pi-remote-web/src/features/ask-question/useAskQuestionState.ts` for single/multiple selection, required free-text validation, restoration to `presented`, retryable errors, terminal states, and immutable answered state.
- [ ] Add `apps/pi-remote-web/src/features/ask-question/useAskQuestionMutation.ts` to deduplicate by `clientMutationId`, obtain fresh tickets, avoid ticket reuse, and wait for authoritative results.
- [ ] Update `apps/pi-remote-web/src/relay.ts` with guarded ticket, answer, lifecycle, and status calls using the existing session identity.
- [ ] Update `apps/pi-remote-web/src/state.ts`, `apps/pi-remote-web/src/turns.ts`, `apps/pi-remote-web/src/App.tsx`, and `apps/pi-remote-web/src/SessionComposer.tsx` to preserve metadata-only identity, chronological placement, virtualization, and ordinary composer behavior.
- [ ] Update `apps/pi-remote-web/src/cache.ts` and `apps/pi-remote-web/src/style.css` to exclude ephemeral display and answer state from snapshots and apply the frozen visual tokens.
- [ ] Extend `apps/pi-remote-web/tests/App.test.tsx` and `apps/pi-remote-web/tests/contrast.test.tsx` with ask-question component/state coverage for selection, free text, explicit submission, retry, terminal lifecycle, duplicate-submit prevention, redaction boundaries, and visual tokens.
