# Implementation Summary — Explicit Send integration and iPhone/PWA hardening

## Final state

Complete and automated-verified. A drafted slash binding now connects to the existing explicit Send path through one fresh one-use ticket and one revision-checked submission, with every race and failure path failing closed and preserving the draft; plus installed-PWA/mobile hardening. The physical-iPhone assistive-technology checklist remains operator-required. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (web-only source; relay tests only for regression)

- **`submitSlashDraft.ts` (new):** the single client orchestration — resolves the canonical token in the CURRENT committed snapshot, and fails closed BEFORE any ticket on invalid-draft / stale (binding≠snapshot = revision race) / denied (vanished or disabled command) / not-live / no-running-authority / running. Only then requests ONE fresh one-use ticket and submits ONE expected-revision envelope; failures never retry (the caller preserves the draft); no send-as-text fallback; no persistence.
- **`relay.ts`:** guarded slash-submit request/response parsing; ticket + prompt calls exposed for observable request counts.
- **`App.tsx` / `SessionComposer.tsx`:** thread host epoch + session/catalog revisions + effective running/plan availability; Send/Enter/running/offline/reconnect/foreground/refresh consult slash state; bounded revalidation progress; drafts preserved on failure; ordinary non-slash behavior unchanged.
- **`commands.ts` / `state.ts`:** refreshing / stale-offline / forbidden / incompatible transitions, identity-change binding clears, foreground revalidation after 30s.
- **`style.css` / `useVisualViewportAnchor.ts` / `index.html`:** installed-PWA `100dvh` + `viewport-fit=cover`, safe-area, rotation, keyboard-language, visual-viewport, high-contrast, reduced-motion, focus retention — frozen tokens only (zero new colors).

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → 168/168 on a clean run (the intermittent 167/168 is the known flaky auth foreground test; the two relay test files this phase touched — `negative-controls`, `recorded-fixture-flow` — pass 11/11 on isolated re-run).
- `npm run test:web` → exit 0, **358 passed (358)** (+13 new: exact ticket/prompt counts, zero-Pi-call-on-race, draft preservation + no-retry, running-state gating, cross-session binding isolation).
- Security review (Claude read `submitSlashDraft.ts`): all guards run before the ticket; one ticket + one revision-checked submit; no retry/send-as-text; no persistence; relay SOURCE untouched.

## Frozen contracts

- Design unchanged (frozen tokens; zero new colors).
- Security preserved: selection is a local read-only draft; Send only through the existing ticketed relay boundary with current binding + expected revisions + fail-closed-before-Pi; running/plan-mode host/extension enforced; nothing sensitive persisted.

## Deferred / operator-required

- True-390px CDP captures ride the feature-003 visual checkpoint. The physical-iPhone installed-PWA release checklist (VoiceOver, Voice Control, Switch Control, Full Keyboard Access, Bluetooth keyboard, IME, zoom, rotation, lifecycle, themes, reduced motion) is operator-required — implemented in code + automated DOM tests, not fabricated as device evidence.
