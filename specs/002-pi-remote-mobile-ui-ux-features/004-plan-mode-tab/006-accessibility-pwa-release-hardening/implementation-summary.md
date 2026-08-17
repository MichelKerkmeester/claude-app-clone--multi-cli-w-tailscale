# Implementation Summary — Phase 5 — Accessibility, PWA layout, and release hardening

## Final state

Complete and automated-verified. The plan-mode feature is hardened for the target iPhone PWA: responsive layouts (320/375/390/430px + 200% text), AA contrast with non-color-only mode signalling, reduced-motion, safe-area, and history-only service-worker cache that can never enable controls or retain plan tokens. No new behavior/authority. The manual Safari/installed-PWA/VoiceOver pass is operator-required. Implemented by GPT-5.6 Luna Max (via opencode-go); orchestrated and verified by Claude.

## What shipped (web-only)

- **`style.css`:** exact focus contrast, CSS logical properties, layouts at 320/375/390/430px, 200% text, `dir="auto"`, isolated LTR revision/shortcut rendering, and `prefers-reduced-motion` (removes positional/continuous animation, keeps immediate textual state changes). Frozen tokens only (zero new colors); clay never normal text or a sole state boundary.
- **PWA shell/cache** (`index.html`, `public/manifest.webmanifest`, `public/service-worker.js`): `viewport-fit=cover`, safe-area behavior, and history-only cache — the service worker retains only redacted history, never enables controls, never retains plan tokens; resume/reconnect/restart require safe authoritative hydration before mutation controls appear.
- **Tests** (`contrast.test.tsx`, `App.test.tsx`, `PlanModeButton.test.tsx`, `PlanReadyCard.test.tsx`, new `pwa-cache.test.tsx`): axe/DOM accessible names/roles/focus-order/inert-sheets/target-size/announcement-non-duplication/clay-contrast + state-matrix + no-stale-token/no-enabled-controls-from-cache assertions.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → 221/221 clean (the intermittent 220/221 is the known flaky auth test).
- `npm run test:web` → exit 0, **459 passed (459)** (+9 new).
- `npm run format:check` → **DEVIATION (documented):** the 9 phase-5 files ARE prettier-clean; the repo-wide check fails on ~685 pre-existing files (all prior features' external-model-built code + docs + specs markdown committed un-formatted). A repo-wide `npm run format` is a separate recommended cleanup, out of this phase's scope. (An accidental repo-wide `npm run format` during verification was fully reverted — the scoped diff is only the 9 phase-5 files.)
- Review (Claude): zero new colors; web-only; capability gate hides Execute + preserves read-only UI.

## Frozen contracts

- Design unchanged (frozen tokens; zero new colors).
- Security preserved: host-enforced, one-use-ticketed, revision-checked, foreground-bound, fail-closed posture intact; caches redacted history-only, no plan tokens, no enabled controls; capability gate disables the feature without exposing Execute.

## Operator-required / deferred

- Manual Safari + installed-PWA pass (software/hardware keyboard, Full Keyboard Access, VoiceOver, rotation, resume, safe-area) — physical device.
- True-390px (+320/375/430) CDP captures ride the feature-004 batched visual pass (needs `demo.ts` plan-artifact fixtures).
- Repo-wide prettier formatting (~685 files) — separate cleanup task spanning all prior features + docs.
