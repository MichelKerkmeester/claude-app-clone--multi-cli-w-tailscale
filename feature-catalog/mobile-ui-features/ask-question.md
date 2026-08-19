---
title: "Ask Question"
description: "Redacted inline AskQuestionCard renders agent prompts in the transcript's chronological flow with full-row option buttons and optional free text, submitting only via a one-use ticketed mutation."
trigger_phrases:
  - "answer the agent's question"
  - "respond to the ask-question card"
  - "reply to pi's prompt"
version: 1.0.0.0
---

# Ask Question (ask-question)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Redacted inline AskQuestionCard renders agent prompts in the transcript's chronological flow with full-row option buttons and optional free text.

The AskQuestionCard component appears in place within the conversation's timeline, displaying the agent prompt alongside full-row option buttons and an optional free-text field. It uses no modal, scrim, or page-level focus trap; interaction is confined to the card. Selecting an option changes only volatile browser form state, an option tap or key press never submits, and the card only transitions to a confirmed answered state after the host and extension both accept the submission.

Current status: shipped.

---

## 2. HOW IT WORKS

### Rendering and selection

The card is inserted into the transcript's chronological flow at the point where the agent posed the question. It shows the agent prompt, one tappable option button per provided option, and — when the question allows it — a free-text input. Option buttons are full-row touch targets of at least 44px and the card uses roving focus so keyboard and assistive-technology users can move through the choices without a page-level focus trap. Interaction never summons a modal or scrim; the card stays inline in the conversation.

### Volatile-only selection state

Picking an option updates only volatile browser form state held in a local selection store. No option tap or key press ever submits an answer on its own. The UI reflects the tentative selection, but the browser holds the answer in-memory until the user explicitly commits it.

### Ticketed, non-optimistic submission

Submitting an answer enters the shipped ticketed mutation lane. The request consumes a one-use mutation ticket bound to the exact session, question, enrolled device, mutation scope, answer digest, and host revision; the approval is fail-closed and cannot be reused or rebound. Submission is non-optimistic: the card does not collapse or mark itself answered until both the host and the extension confirm acceptance of the answer. Every other outcome — pending, retryable, expired, superseded, or unknown — is represented faithfully against the authoritative host state, never guessed by the client.

### Privacy and redaction

The card carries only the ask-question block's metadata, which is structurally redacted and allowlist-bound before leaving the device. Free text and selections are covered by the app's structural redaction rules; the phone cannot enable full access, so operator-only full-access paths remain outside what this feature can invoke.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` | Component | Inline question card with options and free text |
| `apps/pi-remote-web/src/features/ask-question/useAskQuestionMutation.ts` | Handler | Ticketed non-optimistic answer submission |
| `apps/pi-remote-web/src/features/ask-question/useAskQuestionState.ts` | Shared | Answer state machine over authoritative host state |
| `apps/pi-remote-web/src/features/ask-question/askQuestionEphemeralStore.ts` | Shared | Volatile local selection store |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/ask-question-card.test.tsx` | component | Selection-not-submit, submit, and answered-only-on-confirm |
| `apps/pi-remote-relay/tests/ask-question.test.ts` | integration | Relay answer mutation, ticket consumption, extension handoff |
| `packages/pi-rpc-protocol/tests/ask-question.test.ts` | contract | Ask-question event/block guards and answer digest binding |

---

## 4. SOURCE METADATA

- Group: Mobile UI Features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/ask-question.md`
- Current status: shipped

Related references:

- [todos.md](todos.md) - Another inline, chronologically-placed transcript card with non-modal rendering
