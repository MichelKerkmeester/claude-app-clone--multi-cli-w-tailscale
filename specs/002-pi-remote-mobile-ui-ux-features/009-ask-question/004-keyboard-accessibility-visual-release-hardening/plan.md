# Plan — Keyboard and thumb navigation, accessibility, visual, and iPhone/PWA release hardening

## Approach

Harden the completed card at its interaction and release boundaries without changing host authority or mutation semantics. Add card-local keyboard behavior and focus restoration, then verify semantic state exposure, visual tokens, responsive layout, reduced motion, RTL, large text, virtual-keyboard visibility, and PWA content-free boundaries. Finish by rerunning relay and extension negative controls alongside the complete web and device gates.

## Steps

1. Add card-local roving focus, declared answer-stop navigation, IME-aware Return handling, and focus restoration.
2. Complete initial focus entry so arrival is helpful without interrupting active typing or unrelated controls.
3. Apply logical, responsive, touch-sized, dark/light, reduced-motion, and virtual-keyboard-safe styling using the existing tokens.
4. Extend semantic, keyboard, contrast, large-text, RTL, reduced-motion, and non-color state coverage.
5. Inspect font metadata, manifest, and service-worker boundaries for duplicate font tokens, question content, notification data, and cache leakage.
6. Run true-390px light/dark CDP checks across touch-only, keyboard-open, submitting, error, answered, expired, and superseded states.
7. Re-run relay redaction, push, sync, authority, ask-question, and extension-boundary tests after web hardening.
8. Run the complete typecheck, protocol/relay, web, accessibility, visual, device, and content-free release gates.

## Files to change

- `apps/pi-remote-web/src/features/ask-question/useAskQuestionKeyboardNavigation.ts`
- `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx`
- `apps/pi-remote-web/src/style.css`
- `apps/pi-remote-web/tests/App.test.tsx`
- `apps/pi-remote-web/tests/contrast.test.tsx`
- `apps/pi-remote-web/public/fonts/font-assets.json`
- `apps/pi-remote-web/public/manifest.webmanifest`
- `apps/pi-remote-web/public/service-worker.js`
- `apps/pi-remote-relay/tests/redaction.test.ts`
- `apps/pi-remote-relay/tests/push.test.ts`
- `apps/pi-remote-relay/tests/sync.test.ts`
- `apps/pi-remote-relay/tests/authority-loop.test.ts`
- `apps/pi-remote-relay/tests/ask-question.test.ts`
- `extensions/pi-remote-approval/tests/final-boundary.test.ts`

## Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- `npm run test:web` exits 0.
- `npx vitest run extensions/pi-remote-approval/tests/final-boundary.test.ts` exits 0.
- True-390px CDP verification passes in light and dark themes with keyboard-open and touch-only paths.
- Keyboard, screen-reader semantics, RTL, large-text, reduced-motion, and WCAG AA contrast checks pass.
- The final cache, push, log, telemetry, transcript, and extension-boundary sweep contains no task-created question content, answer text, ticket, digest, or raw callback residue.
