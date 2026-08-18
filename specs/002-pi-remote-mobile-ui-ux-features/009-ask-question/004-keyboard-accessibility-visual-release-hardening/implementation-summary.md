# Implementation Summary — 009 Phase 3 (keyboard, accessibility, visual + release hardening)

## Final state — COMPLETE (009 feature done)

The ask-question card is hardened for keyboard/screen-reader/touch/visual use and the feature's
release boundaries are proven by added relay/extension tests. This is the final 009 phase; the inline
question card and its host-authoritative, one-use ticketed answer lane are complete with the capability
governed by the same fail-closed discipline. Built by GPT-5.6 Luna Max **via OpenRouter** (route rotation —
see below); orchestrated, security-reviewed, and independently verified by Claude on `main` outside the
sandbox. No security behavior changed; no design token changed; no relay/protocol/extension SOURCE, main.tsx,
index.html, or service-worker.js changed (the PWA files were already content-free).

## Route rotation (primary + first fallback both unavailable)

- **Primary — Luna Max via cli-codex: EXHAUSTED.** Codex hit its usage limit mid-phase (resets Sep 17) and
  wrote nothing; the clean baseline was intact.
- **Fallback 1 — opencode-go DeepSeek v4 flash MAX: STALLED.** DeepSeek over-read this ~14-file scope and hung
  at 0% CPU after 2 files (the documented "stall without converging"). Killed; the 2 partial files were
  restored to the clean baseline.
- **Fallback 2 — Luna Max via OpenRouter (`openrouter/openai/gpt-5.6-luna --variant max`): SUCCEEDED.** Same
  capable model as the primary, different quota. RM-8 safeguards applied throughout: clean committed baseline,
  tight ALLOWED/BANNED prompt, watchdog, and a full-diff review confirming no stray writes.

## What shipped

- **`features/ask-question/useAskQuestionKeyboardNavigation.ts`** (new) — card-local keyboard navigation. Every
  handler guards on `card.contains(target)`, so it never captures unrelated transcript controls; IME/composition
  entry is preserved (`isComposing`/`compositionRef`); focus restores safely.
- **`features/ask-question/AskQuestionCard.tsx`** — semantic roles + accessible names/descriptions +
  `aria-pressed` on options + polite/assertive live regions (`role="status"`/`role="alert"`) for status, all
  **content-free** (generic labels + safe UI status copy via a `statusId` reference; no ticket/digest/revision/
  secret is announced).
- **`style.css`** — 44px targets in every state, clay focus ring + carbon selected rows (never color-only),
  light/dark contrast, large text/zoom/RTL/reduced-motion — within the frozen tokens.
- **Release-boundary tests** (relay `redaction`/`push`/`sync`/`authority-loop`/`ask-question` + extension
  `final-boundary`) — confirm redaction keeps ask-question content out of persistence/broadcast, push stays
  content-free, sync carries no display/answer/ticket, the authority loop cannot mint authority or enable
  `--full-access`, and the extension final boundary re-validates.
- Web a11y/contrast tests added.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** only the allowed paths (a11y hook + card + style + web tests + 5 relay tests + 1 extension test).
  No PWA/main.tsx/index.html/service-worker/token/relay-source/protocol/extension-source change; no stray files.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm test` **366 passed / 47 files**
  (+6 — the relay boundary tests; zero EPERM outside the sandbox); `npm run test:web` **637 passed / 61 files**
  (+14 — a11y/contrast/keyboard). ESLint on changed files: 0 errors (1 pre-existing warning).
- **Security sign-off:** a11y announcements content-free; keyboard nav card-scoped + IME-safe; relay/extension
  boundary tests prove the feature stays fail-closed and host-authoritative; no security-behavior change.
- **CDP (390px, light + dark):** the card renders inline, contained, no horizontal overflow, no modal/scrim,
  controls present, `localStorage` free of prompt/ticket/digest, zero uncaught exceptions (both themes).
- **Real-path (non-demo) mount check:** PASS — card + style changed but the app mounts clean (white-screen
  guard; no service-worker/main.tsx/index.html change).

## Continuation

009-ask-question is complete (P1 protocol/authority/redaction lane, P2 inline card, P3 hardening). Remaining
epic-002 work: feature 010-todos (read-only inline projection of pi's todo/plan list — the phone never mutates
it). Then epic 003 (design system).
