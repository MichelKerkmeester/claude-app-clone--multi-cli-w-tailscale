# Implementation Summary — iPhone interaction, accessibility, visual, and release hardening

## Final state

Code-complete and automated-verified. The functional model sheet is hardened for the installed iPhone PWA: focus/keyboard/dismissal/swipe behavior, WCAG AA visual + reduced-motion, safe-area/visual-viewport layout, and storage/telemetry negative controls — with the Phase 1/2 authority model untouched. Two categories remain **operator-required** (a physical device is needed and neither Claude nor a headless model can produce that evidence): the installed-PWA assistive-technology pass and any real-device visual sign-off. Implemented by GPT-5.6 SOL (high/fast via codex); orchestrated and verified by Claude.

## What shipped

- **Interaction** (`ModelSwitcherSheet.tsx`, +279): RAC focus containment, current-row initial focus, `preventScroll` restoration to the trigger, Escape ordering (clear query → dismiss before commit), commit-time dismissal barriers (backdrop/close/Escape inert while committing), header-only swipe dismissal with distance (>30% height) and velocity (~1200px/s) thresholds, and native list-scroll separation (`overscroll-behavior-y: contain`).
- **Header** (`SessionHeader.tsx`): final trigger accessible name + expanded state, optional plan-mode badge semantics, effort sibling, focus-restoration target.
- **Strings** (`model-switcher-strings.ts`, new): message catalog for every label/state/reason mapping/count/success/reconcile-barrier, with `Intl.PluralRules` for the `N of M models` count.
- **Visual/motion** (`style.css`, +127): frozen tokens only (zero new colors added), AA 2px focus ring + 2px offset, 24px radius, 36×4px grabber, 92% visual-viewport cap, safe-area bottom padding, contained overscroll, logical properties, isolated LTR IDs, 320/390/430px reflow, entrance/backdrop/exit/crossfade timings, and `prefers-reduced-motion` removal of transforms/springs/stagger/spinners.
- **Viewport** (`index.html`): `viewport-fit=cover` added.

## Verification

Automated (run by Claude, in the worktree, outside the dispatch sandbox):
- `npm run typecheck` → exit 0.
- `npm test` → exit 0, 140 passed (140) — backend unchanged.
- `npm run test:web` → exit 0, **74 passed (74)** (+19 new: focus/keyboard/live-regions/200%-zoom/reduced-motion/no-horizontal-scroll/contrast/no-storage-no-logging negative controls).
- Design review (Claude): zero new colors in `style.css` (no palette drift); no protocol/relay/extension source touched (authority intact).

Visual (true-390px CDP, this repo's harness):
- Captured at the feature-001 checkpoint — see `../` feature closeout and the attached light/dark screenshots (`ready`, `staged`) plus the 390px/320px horizontal-overflow measurements. `demo.ts` was contract-synced to the expanded catalog + ticket endpoint so the sheet renders in demo mode.
- Some states (`delivery_unknown`) are not reachable in offline demo mode; those are covered by the DOM tests rather than a screenshot.

Operator-required (cannot run headlessly — flagged, not fabricated):
- Installed-PWA VoiceOver, Switch Control, Full Keyboard Access, real-device portrait/landscape/software-keyboard, physical header-swipe/native-scroll, and safe-area visual inspection.
- `npm test` in a loopback-permitting environment (the codex sandbox blocks `listen 127.0.0.1`; re-run here outside the sandbox is fully green).

## Frozen contracts

- Design system unchanged (frozen tokens/typography/themes/AA target); no third typeface; clay never the sole small-text/UI-state signal.
- Security posture unchanged and re-verified: Phase 1/2 ticket/revision/foreground/redaction/plan-mode controls intact (backend suites green); no ticket/model-id/query/host-data in storage, URL, logs, caches, or telemetry (negative-control tests).
