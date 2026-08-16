# Checklist — Keyboard and thumb navigation, accessibility, visual, and iPhone/PWA release hardening

- [ ] `npm run typecheck` exits 0.
- [ ] `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- [ ] `npm run test:web` exits 0.
- [ ] `npx vitest run extensions/pi-remote-approval/tests/final-boundary.test.ts` exits 0.
- [ ] True-390px CDP checks pass in light and dark themes for touch-only and keyboard-open paths, with the focused field and submit action visible.
- [ ] Keyboard navigation follows the declared card-local sequence, preserves IME text entry, restores focus safely, and never captures unrelated transcript controls.
- [ ] Touch targets measure at least 44px and remain usable with long labels, required free text, submitting, error, answered, expired, and superseded states.
- [ ] Semantic roles, labels, descriptions, `aria-pressed`, live regions, safe errors, and final announcements expose state without tickets, digests, revisions, secrets, or diagnostics.
- [ ] Light/dark contrast, clay focus rings, carbon selected rows, large text, browser zoom, RTL, natural wrapping, and reduced-motion behavior pass without clipping or color-only state.
- [ ] `apps/pi-remote-web/public/fonts/font-assets.json`, `apps/pi-remote-web/public/manifest.webmanifest`, and `apps/pi-remote-web/public/service-worker.js` preserve content-free PWA boundaries.
- [ ] Redaction, push, sync, authority, ask-question, and final extension-boundary tests confirm the PWA remains read-only by default and cannot mint authority or enable `--full-access`.
