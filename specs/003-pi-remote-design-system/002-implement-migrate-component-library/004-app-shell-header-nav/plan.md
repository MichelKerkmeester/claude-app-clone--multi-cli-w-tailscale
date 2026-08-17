# Plan — App shell, header & navigation

## Approach

Migrate the shell outside-in and value-preserving. Move layout, headers, and routed surfaces onto
tokens and `@ds` seams, add per-state seams for the connection phases and each surface's loading /
empty / error states, and fence routing/connection/enrollment/push logic with guardrails. Prove
each surface renders identically in both themes.

## Steps

1. Map the shell in `App.tsx`: the root `App`, `Session` composition root, headers, and the routed
   surfaces (`Home`, `Review`, `AttentionInbox`, `PushSettings`, `Enrollment`), plus their current
   layout and state styling in `style.css`.
2. Migrate the app shell and `Session` layout onto tokens and `@ds edit: layout` seams; express safe
   areas and page gutters with tokens and logical properties.
3. Migrate `Header` and `SessionHeader`, labelling their slots (wordmark, nav, theme toggle, status)
   with `@ds slot:`.
4. Migrate each routed surface onto tokens with per-state `@ds state:` blocks for its loading /
   empty / error / stale states and the connection phases shown by `StatusPill`.
5. Fence routing, connection, enrollment, and push logic with `@ds guardrail` (presentation only).
6. Capture true-390px light/dark of home / review / inbox / enrollment and diff against the
   pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/App.tsx` (shell, headers, routed surfaces — seam labels, token reads,
  presentation only)
- `apps/pi-remote-web/src/SessionHeader.tsx` (header slots — presentation only)
- `apps/pi-remote-web/src/style.css` (shell/header/session-grid/empty-state/safe-area rules)
- `scripts/design-system-cdp.mjs` (shell-surface fixtures, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface app-shell --viewport-width 390 --theme light --output <temporary-directory>/app-shell-light.png
node scripts/design-system-cdp.mjs --surface app-shell --viewport-width 390 --theme dark --output <temporary-directory>/app-shell-dark.png
```

The gate passes only when all suites and the build pass, routing/connection/enrollment/push tests
stay green, the CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, and
the light/dark captures of every shell surface and connection phase are visually identical to the
pre-migration baseline.
