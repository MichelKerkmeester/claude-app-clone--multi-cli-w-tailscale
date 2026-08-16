# Implementation Summary — Functional model switcher sheet and state machine

## Final state

Functionally complete, verified, and committed. The nested `Popover → Select → Popover` model picker is replaced by one RAC bottom-sheet dialog with the full end-to-end state machine over the Phase-1 bound-ticket contract. The one remaining item — true-390px light/dark CDP captures of `ready`/`staged`/`committing` — is deferred to the feature-001 visual checkpoint after phase `004` (the motion/visual-hardening phase), when the sheet is visually final. Implemented by GPT-5.6 SOL (high/fast via codex); orchestrated and verified by Claude.

## What shipped

- **Pure catalog layer** (`apps/pi-remote-web/src/model-catalog.ts`, new): `modelKey` identity, provider grouping, current-provider/current-model ordering, retired-current insertion, availability/capability projection, diacritic-insensitive matching, ID-prefix ranking, and locale-aware sort — all independently unit-tested.
- **The sheet** (`ModelSwitcherSheet.tsx`, new): one RAC `ModalOverlay`/`Modal`/`Dialog`/`Autocomplete`/`SearchField`/`ListBox`; in-place search revealed at ≥8 models (7 render without); skeleton/loading, grouped rows, current vs draft semantics (`aria-current`+Current, `aria-selected`+Selected), live status, inline errors, and footer actions.
- **Header** (`SessionHeader.tsx`): the model control is now a trigger button that opens the sheet; the Thinking-effort control stays a separate labelled sibling.
- **Runtime/relay** (`runtime.ts`, `relay.ts`): confirmed-vs-draft model state, catalog phases, request generations + AbortController + timeout so late catalog/mutation responses cannot overwrite newer host state, foreground reconciliation, streaming gate, and every terminal outcome (stale/unavailable/policy_blocked/delivery_unknown) with zero automatic retries. Only explicit **Switch model** invokes the Phase-1 ticket/control sequence.
- **App** (`App.tsx`): visibility-return reconciliation; no catalog/draft/query/ticket in URL or persistent state.
- **Styling** (`style.css`, +457): responsive 320–430px sheet using only the frozen ink-on-parchment tokens (the one newly-used color is the frozen dark raised-sheet `#2d2a26`), safe-area padding, contained list scroll, light + dark.

## Verification (run by Claude, in the worktree, outside the dispatch sandbox)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, 140 passed (140) — backend unchanged, zero regressions.
- `npm run test:web` → exit 0, **55 passed (55)** (+15 new web tests).
- Security review (Claude): staging is network-free (fetch asserted 0 calls until Switch), one Switch = exactly one `/api/runtime/ticket` + one `/api/runtime/control` bound to the exact target and both revisions, header stays host-confirmed during pending, stale/delivery-unknown produce no retry, and identity uses validated keys with no URL/persistent leakage.
- Design review (Claude): only frozen-palette colors added; nested picker replaced; effort kept as a sibling.

Note: the dispatch's `npm test` showed 24 `listen EPERM 127.0.0.1` failures — the codex sandbox loopback-bind restriction, not assertions; fully green re-run outside the sandbox.

## Frozen contracts

- Design system unchanged — frozen tokens/typography/themes/WCAG-AA target respected; no third typeface.
- Security posture strengthened, never weakened: read-only default (browse/search/stage consume no ticket), one-use revision-bound mutation only on explicit Switch, no optimistic header, no retries, in-memory-only catalog.

## Deferred (intentional, in scope of later phases)

- Final iPhone swipe-dismiss thresholds/velocity, complete reduced-motion polish, 200% zoom proof, installed-PWA manual pass, and release hardening → phase `004`.
- True-390px light/dark CDP captures (`ready`/`staged`/`committing`) → feature-001 visual checkpoint after `004`; needs a one-time `demo.ts` sync to the Phase-1 expanded catalog + ticket endpoint. The 390px capture harness is built and proven.
