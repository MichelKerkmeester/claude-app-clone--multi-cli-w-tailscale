# Plan — Live delta updates, accessibility, visual, and iPhone/PWA release hardening

## Approach

Extend the separate todo state machine with revision and plan-identity safety, using the existing authenticated subscription for read-only recovery. Then harden rendering and persistence boundaries for accessibility, motion, internationalization, responsive layout, redaction, compatibility, and release validation without changing transcript authority or introducing mutation controls.

## Steps

1. Implement stale-delta rejection, base-revision checks, task-revision upserts, removals, plan replacement, and refresh preservation.
2. Re-subscribe through the existing authenticated sync socket for read-only snapshot recovery.
3. Keep transcript cursor state independent from todo projection revision state.
4. Complete todo synchronization, view-state, revision, and announcement behavior.
5. Add stable task keys, scoped polite announcements, host timestamps, no-auto-scroll behavior, and quiet all-done restoration.
6. Apply reduced-motion, logical-property, RTL, dynamic-text, safe-area, sticky-header, focus, contrast, and no-layout-animation rules.
7. Prove browser and service-worker persistence cannot retain raw todo material; keep projections in memory when the cache boundary is insufficient.
8. Preserve content-free push, older-client handling, host capability compatibility, and plan-mode authority.
9. Extend live-update, accessibility, contrast, security, and persistence tests.
10. Run the complete typecheck, protocol/relay, web, build, and true 390px light/dark CDP gate.

## Files to change

- `apps/pi-remote-web/src/todo-state.ts`
- `apps/pi-remote-web/src/relay.ts`
- `apps/pi-remote-web/src/state.ts`
- `apps/pi-remote-web/src/TodoPanel.tsx`
- `apps/pi-remote-web/src/style.css`
- `apps/pi-remote-web/src/cache.ts`
- `apps/pi-remote-web/public/service-worker.js`
- `apps/pi-remote-relay/src/push/push-service.ts`
- `apps/pi-remote-relay/src/index.ts`
- `apps/pi-remote-relay/tests/sync.test.ts`
- `apps/pi-remote-relay/tests/redaction.test.ts`
- `apps/pi-remote-relay/tests/security/negative-controls.test.ts`
- `apps/pi-remote-relay/tests/push.test.ts`
- `apps/pi-remote-web/tests/todo-state.test.ts`
- `apps/pi-remote-web/tests/TodoPanel.test.tsx`
- `apps/pi-remote-web/tests/App.test.tsx`
- `apps/pi-remote-web/tests/contrast.test.tsx`

## Verification gate

Run `npm run typecheck`, `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`, `npm run test:web`, and `npm run build`; all commands must exit 0. Then run true 390px CDP smoke tests in light and dark themes, including a delta while scrolled, collapsed activity, focus navigation, safe-area padding, RTL, increased text size, and reduced motion.
