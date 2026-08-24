<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 3 — Control primitives

## Summary

This grandchild migrates the shared control primitives — Button, ToggleButton /
ToggleButtonGroup, Disclosure, the status/state components (StatusPill, Freshness, EmptyState,
SessionStateIcon), and the inline glyphs — onto the token library and the `@ds` inline-comment
grammar, and establishes one canonical per-state seam set (default, hover, pressed, disabled,
focus-visible, busy) that every surface reuses. react-aria continues to own behaviour and state;
this grandchild owns only their look. It is value-preserving.

## Problem & Goal

The controls that appear everywhere are styled ad hoc against react-aria's state attributes
(`[aria-pressed]`, `[aria-busy]`, `:focus-visible`, `data-*`), with each surface repeating the
same per-state rules. A designer has no single place to change how a pressed or disabled control
looks. The goal is one documented primitive layer with per-state `@ds state:` blocks that the
surfaces consume, so a designer edits control states once and every surface follows.

## Scope

### In scope

- Migrating the shared control primitives — Button, ToggleButton, ToggleButtonGroup, Disclosure /
  DisclosurePanel — onto tokens and the grammar, with a canonical `@ds state:` block per visual
  state (default, hover, pressed, disabled, focus-visible, busy).
- Migrating the shared status/state components — StatusPill, Freshness, EmptyState,
  SessionStateIcon — and the inline glyphs (CopyGlyph, ShareGlyph, chevrons, spinner) onto tokens.
- Consolidating the react-aria state styling (`[aria-pressed='true']`, `[aria-busy]`,
  `:focus-visible`, `data-*`) into the one primitive seam set.

### Out of scope

- The overlay/sheet/modal primitive and its choreography (grandchild `012` owns that).
- Any per-surface component — the surfaces that consume these primitives are migrated in their own
  grandchildren.
- Any change to a control's behaviour, focus order, or accessibility semantics — react-aria owns
  those; this grandchild changes only presentation.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

Unchanged. Each primitive renders identically to today across its states — default, hover, pressed
(`[aria-pressed]`), disabled, focus-visible, and busy (`[aria-busy]`) — in both themes. StatusPill,
Freshness, EmptyState, and SessionStateIcon keep their current appearance and their state variants
(loading / empty / error, connection phases, per-session status).

## Acceptance criteria

- Each shared control primitive declares a `@ds surface:` and one `@ds state:` block per visual
  state, reading from tokens only; no raw colour appears outside the primitive layer.
- The per-state seam set is canonical and reused by the surfaces (verified as surfaces migrate).
- react-aria keeps ownership of behaviour, focus order, and a11y semantics; only presentation moves.
- StatusPill, Freshness, EmptyState, SessionStateIcon, and the glyphs render identically to today in
  every state and both themes.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of a primitives fixture are visually identical to the pre-migration baseline.

## Security & Redaction

Styling-only. No behaviour, transport, redaction, ticket, plan-mode, or host-file path is touched;
react-aria's interaction and a11y contracts are preserved unchanged. No new dependency is added.

## Dependencies & affected areas

- Control primitives (cross-cutting): `apps/pi-remote-web/src/App.tsx` (Button, ToggleButton,
  Disclosure usage; `StatusPill`, `Freshness`, `EmptyState`, `SessionStateIcon`; `CopyGlyph`,
  `ShareGlyph`), `apps/pi-remote-web/src/RuntimeStrip.tsx` (ToggleButtonGroup).
- State styling: `apps/pi-remote-web/src/style.css` (the `[aria-pressed]`, `[aria-busy]`,
  `:focus-visible`, `data-*` rules for these controls).
- Inbound: grandchildren `001-tokens-foundation` and `002-theming-light-dark`.
- Outbound: every per-surface grandchild consumes this per-state seam set.
- Baseline evidence: `scripts/design-system-cdp.mjs` with a primitives fixture.
