# Implementation Summary — 009 Phase 2 (inline ask-question card + client state machine)

## Final state — COMPLETE

The ask-question inline card now renders in the transcript and drives a non-optimistic answer through the
Phase-1 lane: it reads display content only from the authenticated volatile display read, keeps selection and
free-text local until an explicit submit, shows accepted only after the host result, and holds no answer/
ticket/digest/prompt in any persistent store. Built by GPT-5.6 Luna Max (Codex CLI); orchestrated,
security-reviewed, and independently verified by Claude on `main` outside the codex sandbox. No relay/protocol/
extension/main.tsx/service-worker/token file was changed.

## What shipped (web only)

- **`features/ask-question/`** (new) — `AskQuestionCard` (fetches the guarded display via
  `fetchAskQuestionDisplay`, never from the metadata block), `AskQuestionPrompt/OptionList/OptionRow/FreeText/
  SubmitButton/Status`, `askQuestionEphemeralStore` (in-memory `Map`, released on terminal/revision change),
  `useAskQuestionState` (local state machine), `useAskQuestionMutation` (one-use ticketed submit with an
  idempotent `clientMutationId`).
- **`App.tsx`** — renders the card as a standalone transcript block (`case 'ask-question'`), at the correct
  chronological position.
- **`state.ts`** — projection keeps the `ask-question` metadata block; **cache-hydrated state now accepts the
  authoritative relay page before sync resumes** (see the render-gap fix below).
- **`relay.ts`** — `fetchAskQuestionDisplay` (POST `/api/ask-question/display`) + the answer-ticket/answer
  routes wired to the Phase-1 lane.
- **`cache.ts`** — `ask-question` blocks are excluded from cache persistence AND cache-read (like
  file_preview/attachment/rich-body) so nothing sensitive is stored.
- **`demo.ts`** — a deterministic `?fixture=ask-question&state=...` fixture.
- **`style.css`** — inline card styling within the frozen tokens.
- **Tests:** `ask-question-card.test.tsx` (card state-machine + security incl. a no-storage-leak assertion)
  and a new end-to-end `App.test.tsx` case (below).

## A real end-to-end render bug — caught by CDP, fixed, and covered

The card's direct-render unit tests passed, but an out-of-sandbox CDP run showed the card **did not render**
when a valid `ask-question` block flowed through the live transcript path (zero `[data-ask-question-card]`).
Root cause: **cache hydration retained a non-null epoch while omitting the volatile ask-question block, so the
authoritative relay page (which contained it) was then rejected by `transcriptReducer`.** Fix: cache-hydrated
state accepts the authoritative page before sync resumes (`state.ts`). A new deterministic end-to-end test —
"renders a hydrated ask-question block once at its transcript position through Session" (`App.test.tsx`) —
drives the real App/state render path (not the card in isolation) and now guards it. This gap was invisible to
the isolated card tests; the CDP/probe verification is what caught it.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- **Scope:** only web files (the plan's list + the `state.ts`/`App.tsx`/`App.test.tsx` render-fix). No
  relay/protocol/extension/main.tsx/index.html/service-worker/token change.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm test` **360 passed** (unchanged —
  no backend change); `npm run test:web` **623 passed / 61 files** (+10 over 613). ESLint on changed files: 0
  errors (3 pre-existing `runtimeControls` exhaustive-deps warnings, unrelated).
- **CDP (390px, light + dark), ask-question fixture — DOM assertions:** the card renders inline at exactly 390
  CSS px, contained (left 8 / right 382, no crop), **no horizontal overflow**, **no modal/scrim/route change**,
  with the free-text field and option/submit controls present; `data-theme` correct in both themes; and
  `localStorage` carries **no prompt/option/ticket/digest** text with the URL unchanged. Zero uncaught
  exceptions. (Headless PNG bytes remain unreliable; the DOM assertions are authoritative.)
- **Real-path (non-demo) mount check:** PASS — App.tsx changed but the app mounts clean (white-screen guard).
- **Security (behavior + diffs):** card content comes only from the volatile display read; selection/blur/
  free-text send no mutation; explicit submit → one mutation (idempotent); accepted only after host result;
  terminal states release the ephemeral store; ask-question excluded from cache/storage/URL/logs.

## Continuation

Next: Phase 3 (`004-keyboard-accessibility-visual-release-hardening`) — keyboard/touch/screen-reader/responsive/
PWA/390px hardening + the release gate for the feature. 009's answer capability follows the same operator/
security discipline; the mutation stays fail-closed and host-authoritative.
