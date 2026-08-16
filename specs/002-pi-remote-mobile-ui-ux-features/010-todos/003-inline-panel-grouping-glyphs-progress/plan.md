# Plan — Inline todo panel, grouping, state glyphs, and progress

## Approach

Build the web read model and local view state separately from transcript state, then render the projection through the existing transcript layout. Keep rows informational and static, use React Aria Components only for disclosure and refresh controls, and apply the established ink-on-parchment tokens without introducing a new visual surface.

## Steps

1. Add pure todo-model functions for display groups, host order, optional group headings, counts, empty plans, and all-done behavior.
2. Add validated todo state for the active plan, projection revision, local collapse state, refresh state, and unsupported-host behavior.
3. Route validated snapshot envelopes through the authenticated relay flow without treating them as transcript blocks or sending commands.
4. Implement the panel component family, static task rows, decorative glyphs, progress hairline, updated labels, all-done line, and scoped live-region structure.
5. Integrate `TodoProjectionBlock` beside activity content while keeping it outside the activity disclosure.
6. Preserve transcript normalization and use the existing transcript layout primitives and design tokens.
7. Add component, state, integration, contrast, and responsive tests for grouping, accessibility, visual tokens, and non-mutation behavior.
8. Run the protocol, relay, web, and true 390px light/dark verification gates.

## Files to change

- `apps/pi-remote-web/src/todo-model.ts`
- `apps/pi-remote-web/src/todo-state.ts`
- `apps/pi-remote-web/src/relay.ts`
- `apps/pi-remote-web/src/TodoPanel.tsx`
- `apps/pi-remote-web/src/App.tsx`
- `apps/pi-remote-web/src/state.ts`
- `apps/pi-remote-web/src/style.css`
- `apps/pi-remote-web/tests/TodoPanel.test.tsx`
- `apps/pi-remote-web/tests/todo-state.test.ts`
- `apps/pi-remote-web/tests/App.test.tsx`
- `apps/pi-remote-web/tests/contrast.test.tsx`

## Verification gate

Run `npm run typecheck`, `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`, and `npm run test:web`; all commands must exit 0. Then run a true 390px CDP pass in light and dark themes covering the inline panel, collapsed activity, wrapped titles, 44pt controls, safe-area padding, and progress rendering.
