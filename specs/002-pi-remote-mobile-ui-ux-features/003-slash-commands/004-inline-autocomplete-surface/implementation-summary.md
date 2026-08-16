# Implementation Summary — Inline terminal-style autocomplete surface

## Final state

Complete and verified. The nonmodal inline command autocomplete ships above the composer, driven by the phase-1 relay catalog and the phase-2 engine. The textarea stays the only editing field (virtual focus for rows); opening/filtering/inserting make no network request and never submit. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (web-only)

- **`ComposerCommandAutocomplete.tsx` (new):** nonmodal React Aria `Autocomplete`/`Popover`/`ListBox` with `aria-activedescendant` virtual focus, a status region, and the complete state model (closed/loading/ready/refreshing/empty/no-match/stale-offline/error.{noSnapshot,hostUnavailable,forbidden,incompatible}/disabled/committing/drafted/submit.{revalidating,stale,denied}/session.running) — no state enables submission; error states expose Retry.
- **`CommandOption.tsx` (new):** safe text-only rows, canonical names isolated LTR, authoritative metadata, match emphasis, disabled reasons; unsafe control/bidi names rejected/escaped; no nested interactive descendants.
- **`SessionComposer.tsx`:** panel integrated above the composer; Enter/primary action routes between local Insert and native multiline/Send; panel interaction never submits; panel and `+` browser mutually exclusive.
- **`useVisualViewportAnchor.ts` (new):** keyboard-safe visual-viewport/orientation anchoring via `requestAnimationFrame` — panel stays above the composer with no page displacement or horizontal scroll.
- **`style.css` / `index.html`:** semantic light/dark + focus/disabled/status styling on frozen tokens (zero new colors), `viewport-fit=cover`, 16px textarea baseline, logical properties, ≥44px targets, safe-area, contained scroll, reduced-motion.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → 167/167 on a clean run (the intermittent 166/167 is the known flaky auth foreground test, unrelated to this web-only phase — re-run confirmed).
- `npm run test:web` → exit 0, **345 passed (345)** (+96 new: trigger/open, filtering, insertion no-submit, full state model, mutual exclusion, a11y, no-overflow).
- Review (Claude): 0 network refs in the autocomplete component (no-submit guarantee); zero new colors; relay/protocol + phase-2 engine contracts untouched.

## Frozen contracts

- Design system unchanged (frozen tokens; no third typeface).
- Security preserved: consumes only the authenticated relay-filtered catalog; opening/filtering/closing/nav/insertion make no network/ticket/prompt/mutation/Pi RPC; in-memory-only state; no auto-submit/auto-ticket/send-as-text; explicit Send gate unchanged; disabled/malformed rows cannot activate.

## Deferred

- True-390px CDP captures of the panel states ride the feature-003 visual checkpoint (after the explicit-send/PWA-hardening phase). Real-device/VoiceOver is operator-required.
