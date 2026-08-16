# Tasks — Keyboard and thumb navigation, accessibility, visual, and iPhone/PWA release hardening

- [ ] Add `apps/pi-remote-web/src/features/ask-question/useAskQuestionKeyboardNavigation.ts` with card-local roving focus, Home/End, Up/Down, Tab/Shift+Tab, Enter/Space, IME-aware Return, and restoration behavior.
- [ ] Complete `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` focus entry so initial arrival does not interrupt active typing or unrelated transcript controls.
- [ ] Update `apps/pi-remote-web/src/style.css` with clay focus rings, logical properties, natural text-row sizing, responsive spacing, virtual-keyboard-safe scrolling, and reduced-motion handling.
- [ ] Extend `apps/pi-remote-web/tests/App.test.tsx` with semantic roles, `aria-pressed`, labels, live regions, error associations, focus order, large-text, RTL, reduced-motion, and non-color state coverage.
- [ ] Extend `apps/pi-remote-web/tests/contrast.test.tsx` with light/dark WCAG AA checks for parchment, carbon, clay focus rings, selected rows, disabled controls, and status states.
- [ ] Verify `apps/pi-remote-web/public/fonts/font-assets.json` retains the existing Inter and Source Serif 4 asset contract without a second font token.
- [ ] Verify `apps/pi-remote-web/public/manifest.webmanifest` contains no question content, notification body, ticket, digest, or authority-bearing field.
- [ ] Verify `apps/pi-remote-web/public/service-worker.js` does not cache question content, answer text, tickets, digests, or raw callback data.
- [ ] Run true-390px CDP checks against `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` in light and dark themes for touch-only, keyboard-open, long-label, required-free-text, submitting, error, answered, expired, and superseded states.
- [ ] Re-run `apps/pi-remote-relay/tests/redaction.test.ts`, `apps/pi-remote-relay/tests/push.test.ts`, `apps/pi-remote-relay/tests/sync.test.ts`, `apps/pi-remote-relay/tests/authority-loop.test.ts`, and `apps/pi-remote-relay/tests/ask-question.test.ts` after release hardening.
- [ ] Re-run `extensions/pi-remote-approval/tests/final-boundary.test.ts` and confirm the phone cannot enable plan-mode changes or operator-only `--full-access`.
