# Ask-question feature

> The ask-question card lets a person answer a live Pi question once, against the revision shown on screen.

---

## 1. OVERVIEW

This feature appears inside a chat transcript when Pi needs a decision. It presents the prompt, a
single-choice or multiple-choice option list, optional free text and a submit action. The card keeps
an in-progress answer local to the question while it is being edited. A terminal result clears that
draft and makes the displayed answer immutable.

The chat host supplies the transcript metadata and session identity. The card fetches the matching
display payload, checks that its question and revision still match the transcript, then renders the
form. It does not own the chat connection or durable transcript state.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte feature |
| Answer modes | Single choice, multiple choice and free text |
| Local draft key | Question id plus revision |
| Terminal states | Answered, expired, superseded and delivery unknown |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Choice answers | Renders one or more options with the correct single-choice or multiple-choice indicator. |
| Free text | Shows an optional or required textarea with the protocol and display length limits. |
| Local validation | Rejects unavailable options, invalid selection counts, oversized text and control or bidi characters before submission. |
| Ticketed submission | Binds the answer digest to the question revision and principal, obtains a relay ticket and submits the answer with a client mutation id. |
| Lifecycle states | Shows loading, presented, selecting, submitting, error, answered, expired, superseded and delivery-unknown states. |
| Keyboard access | Provides roving focus for options, predictable Tab order, Enter submission for single-line controls and focus return after a terminal state. |

The submit path is one-use and fail-closed. A missing principal, invalid answer, stale revision or
relay failure leaves a visible rejection or reconciliation state instead of silently claiming success.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Chat host | An active transcript rendered by [screen-chat.svelte](../../screen-chat.svelte) | The host supplies the question metadata, session id, answer capability and optional principal. |
| Display payload | A question display matching the transcript question id and presented revision | A mismatched or invalid payload is ignored. |
| Relay identity | A non-empty principal from the host or runtime | Without one, the mutation reports that the host is unavailable. Demo mode supplies its own demo principal. |
| Browser surface | DOM focus and form events | The keyboard lifecycle adds ARIA relationships and focus management after the card mounts. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`card-ask-question.svelte`](./card-ask-question.svelte) | Fetches the display payload, composes the form and applies transcript lifecycle locks. |
| [`ask-question-types.ts`](./ask-question-types.ts) | Defines the view model, form phases, type guards and status mapping. |
| [`use-ask-question-state.svelte.ts`](./use-ask-question-state.svelte.ts) | Validates drafts, reduces form actions and exposes the reactive state API. |
| [`use-ask-question-mutation.svelte.ts`](./use-ask-question-mutation.svelte.ts) | Creates the revision-bound digest, obtains a ticket and submits the answer. |
| [`ask-question-ephemeral-store.ts`](./ask-question-ephemeral-store.ts) | Keeps a question's display and draft keyed by question id and revision. |
| [`use-ask-question-keyboard-navigation.svelte.ts`](./use-ask-question-keyboard-navigation.svelte.ts) | Owns roving option focus, ARIA wiring and keyboard traversal. |
| [`ask-question-option-list.svelte`](./ask-question-option-list.svelte) | Builds the choice fieldset and passes selection events to the state API. |
| [`ask-question-free-text.svelte`](./ask-question-free-text.svelte) | Renders the optional or required response textarea and character count. |
| [`ask-question-status.svelte`](./ask-question-status.svelte) | Turns the form phase and result reason into the live status line. |
| [`button-ask-question-submit.svelte`](./button-ask-question-submit.svelte) | Provides the guarded submit button. |

Each presentational component has a Storybook story for its active and disabled states. The complete
module inventory and dependency flow are in [`CODE.md`](./CODE.md).

---

## 5. CONFIGURATION

The feature has no separate configuration file. The host controls the runtime contract through the
card props and the transcript block.

| Input | Owner | Effect |
|---|---|---|
| `block` | Chat transcript | Supplies session id, question id, presented revision and lifecycle status. |
| `canAnswer` | Chat host | Disables the controls while preserving the question and its status. |
| `principal` | Authenticated host or runtime | Binds the answer digest to the current operator identity. |
| Display options | Relay response | Defines selection mode, option bounds, free-text availability and the prompt. |

---

## 6. USAGE EXAMPLES

| Situation | What the person sees or does |
|---|---|
| The display payload is loading | A status card appears without interactive controls. |
| The question allows choices | Select an option. Multiple-choice questions allow the permitted number of selections. |
| The question allows free text | Enter a response within the displayed character count. |
| The answer is invalid | The form shows a validation message and keeps the draft available for correction. |
| Submission is in flight | Controls are disabled and the status line shows submission progress. |
| Pi accepts the answer | The card shows an accepted state and clears the local draft. |
| The question changed or expired | The card becomes immutable and explains whether the revision was replaced, the question expired or delivery must be reconciled. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The card remains in loading | The relay display request did not return a matching question and revision. | Check the transcript block identity and relay response before changing the UI. |
| Submit stays disabled | The selection count, free text or answer capability is invalid. | Read the status message, then choose an allowed option or enter valid text. |
| Pi is unavailable | No principal was available or the ticket request failed. | Keep the draft and restore the authenticated host before retrying. |
| The card says the question was replaced | The displayed revision no longer matches the current question. | Wait for the newer question instead of resending the old answer. |
| The card says Pi may have received the answer | Delivery ended without a trustworthy result. | Reconcile the current transcript state before trying again. |
| Keyboard focus does not move as expected | A control is disabled by a terminal or submitting phase. | Check the phase and let the card return focus after the lifecycle settles. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | State reducer, mutation sequence, focus flow and ownership boundaries. |
| [Chat transcript README](../../transcript/README.md) | Shows where question cards sit in the transcript reading surface. |
| [Rich content README](../../rich-content/README.md) | Documents the neighboring transcript payload renderers. |
