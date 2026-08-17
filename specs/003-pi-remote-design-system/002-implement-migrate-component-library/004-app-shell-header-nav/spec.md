<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 4 — App shell, header & navigation

## Summary

This grandchild migrates the top-level shell — the root app, enrollment, the home/review/inbox
surfaces, the headers, and the session composition root — onto the token library and the `@ds`
inline-comment grammar, with per-state seams for the connection phases and each surface's
loading / empty / error states. It is value-preserving: the shell renders identically to today.

## Problem & Goal

The shell and its routed surfaces are defined inline in `App.tsx` with hand-styled layout, headers,
and state variants. A designer cannot adjust the shell's layout, a header slot, or how an empty or
error surface looks without reading routing logic. The goal is a shell whose layout, header slots,
and per-state presentation sit behind `@ds` seams, so a designer can safely restyle the shell and
its states while routing and connection logic stay fenced.

## Scope

### In scope

- Migrating the app shell and layout: the root `App`, the `Session` composition root, safe areas,
  and page gutters — onto tokens and layout seams (`@ds edit: layout`).
- Migrating the headers (`Header`, `SessionHeader`) and their slots (wordmark, nav, theme toggle,
  status) with `@ds slot:` labels.
- Migrating the routed surfaces — `Home` (hero, session grid, footer, push settings), `Review`,
  `AttentionInbox`, `PushSettings`, `Enrollment` — onto tokens with per-state seams.
- Per-state seams for the connection phases and each surface's loading / empty / error states.

### Out of scope

- The transcript and its blocks (grandchild `005`), the composer (`006`), and the model/effort,
  slash, plan, artifacts, and overlay surfaces (their own grandchildren).
- Any change to routing, connection, enrollment, or push logic — presentation only.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

Unchanged. The shell shows: connection phases (`unenrolled`, `authenticating`, `offline`,
`connecting`, `reconnecting`, `live`, `error`) via `StatusPill`; `Home` in loading / empty
("no sessions") / error / stale-cache; `Review` in empty / pending / expired / submitted / error;
`AttentionInbox` in empty / error; `Enrollment` in idle / busy / error. Each renders identically to
today in both themes.

## Acceptance criteria

- The shell, headers, and routed surfaces declare `@ds surface:`, `@ds slot:`, `@ds edit: layout`,
  and per-state `@ds state:` blocks reading from tokens only.
- Every connection phase and every surface state (Home, Review, Inbox, PushSettings, Enrollment)
  renders identically to today in both themes.
- Routing, connection, enrollment, and push logic are unchanged and fenced with `@ds guardrail`.
- Safe areas and page gutters are expressed with tokens and logical properties.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the shell surfaces are visually identical to the pre-migration baseline.

## Security & Redaction

Styling-only. No routing, connection, enrollment, push, redaction, ticket, plan-mode, or host-file
path is touched. No new dependency is added.

## Dependencies & affected areas

- Shell and surfaces: `apps/pi-remote-web/src/App.tsx` (`App`, `Enrollment`, `Header`, `Home`,
  `Review`, `AttentionInbox`, `PushSettings`, `Session` composition root, `StatusPill`),
  `apps/pi-remote-web/src/SessionHeader.tsx`.
- Shell styling: `apps/pi-remote-web/src/style.css` (shell, header, session-grid, empty-state,
  safe-area rules).
- Inbound: grandchildren `001-tokens-foundation`, `002-theming-light-dark`, `003-primitives-react-aria`.
- Baseline evidence: `scripts/design-system-cdp.mjs` with home/review/inbox/enrollment fixtures.
