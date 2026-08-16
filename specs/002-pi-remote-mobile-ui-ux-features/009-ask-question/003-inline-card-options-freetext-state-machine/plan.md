# Plan — Inline ask-question card, options, free-text, and non-optimistic state machine

## Approach

Create the web-safe view model and volatile display boundary first, then compose the card from small presentation and input components. Keep all answer state in the explicit card state machine, adapt the existing authenticated relay for fresh ticketed mutations, and integrate metadata-only transcript blocks without changing ordinary composer behavior. Apply the existing parchment, carbon, clay, typography, spacing, border, disabled, and focus tokens without introducing new accent colors.

## Steps

1. Define the guarded web view model and volatile display store keyed by question ID and revision.
2. Build the inline card shell and prompt, option, free-text, submit, and status components.
3. Implement local selection and free-text behavior with the declared state transitions and structural validation.
4. Adapt the relay calls for ticket request, answer commit, lifecycle, and status handling.
5. Deduplicate mutation attempts, preserve local values on retryable failure, and prevent consumed-ticket reuse or timeout acceptance.
6. Normalize metadata-only blocks and place the card chronologically without folding it into routine evidence or disrupting virtualization.
7. Exclude display and answer content from read-only cache and preserve ordinary session-composer and connection behavior.
8. Add component, state, transcript, contrast, mutation, and responsive verification.
9. Run the protocol, relay, web, and true-390px light/dark gates from the final state.

## Files to change

- `apps/pi-remote-web/src/features/ask-question/askQuestionTypes.ts`
- `apps/pi-remote-web/src/features/ask-question/askQuestionEphemeralStore.ts`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionPrompt.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionOptionList.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionOptionRow.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionFreeText.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionSubmitButton.tsx`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionStatus.tsx`
- `apps/pi-remote-web/src/features/ask-question/useAskQuestionState.ts`
- `apps/pi-remote-web/src/features/ask-question/useAskQuestionMutation.ts`
- `apps/pi-remote-web/src/relay.ts`
- `apps/pi-remote-web/src/state.ts`
- `apps/pi-remote-web/src/turns.ts`
- `apps/pi-remote-web/src/App.tsx`
- `apps/pi-remote-web/src/cache.ts`
- `apps/pi-remote-web/src/style.css`
- `apps/pi-remote-web/src/SessionComposer.tsx`
- `apps/pi-remote-web/tests/App.test.tsx`
- `apps/pi-remote-web/tests/contrast.test.tsx`

## Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- `npm run test:web` exits 0.
- A true-390px CDP run passes in light and dark themes with the card inline, options fully visible, no modal or route change, and the focused free-text field above the virtual keyboard.
- Web tests prove that selection stays local until explicit submit, accepted state appears only after the host result, retryable errors preserve values, terminal states block stale submission, and duplicate submits do not create a second mutation.
- The mutation-boundary review confirms the web adapter cannot broaden scope, reuse a consumed ticket, or infer acceptance from timeout.
