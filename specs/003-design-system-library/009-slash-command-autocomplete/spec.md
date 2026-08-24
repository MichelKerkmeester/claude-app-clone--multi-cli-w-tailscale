<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 8 — Slash command autocomplete

## Summary

This grandchild migrates the inline slash-command autocomplete surface and the command palette onto
the design system. It moves their rules onto the token layers, applies the `@ds` grammar to every
editable region and per-state block, and promotes the component-scoped `--slash-*` token set into a
documented component-token example alongside `--model-sheet-*`. It is a value-preserving restyle:
no rendered pixel, no ranking or fail-closed submission behaviour, and no catalog authority changes.

## Problem & Goal

The slash surface is a nonmodal completion card above the composer plus a discoverable palette, both
driven by an explicit open-state machine and a deterministic host-command ranker. Their look is
authored as bespoke rules plus an ad-hoc `--slash-*` set, and the many loading / error / empty /
stale states have no labelled seams. A designer cannot restyle the panel, its option rows, or its
error states without reading the state machine. The goal is to move the surface onto the token
library and the `@ds` grammar so a low-code designer can adjust its styling, slots, layout, and each
`SlashPanelOpenState` presentation safely, while react-aria and the ranker keep owning behaviour.

## Scope

### In scope

- Migrate the autocomplete card and palette rules onto the semantic role tokens and formalize the
  `--slash-*` set as a documented component-token example (`@ds surface: slash-autocomplete`).
- Apply the `@ds` grammar: `@ds edit: tokens` on `--slash-*`, `@ds slot:` for the panel's header /
  option-list / footer-hint and the option row's label / binding / disabled-reason, `@ds edit:
  layout` for the panel's anchoring and stacking, and `@ds state:` blocks for each panel state.
- Cover every `SlashPanelOpenState` as its own labelled seam: `loading.initial`, `ready.unfiltered`,
  `ready.filtered`, `refreshing.current`, `ready.emptyCatalog`, `ready.noMatches`,
  `ready.staleOffline`, `error.noSnapshot`, `error.hostUnavailable`, `error.forbidden`,
  `error.incompatible`, `committing`, and `session.running`; plus surface `closed` / `drafted`; plus
  option-row `active` (virtual focus) / `enabled` / `disabled-with-reason`.
- Fence the ranker, catalog lifecycle, and fail-closed submission behind `@ds guardrail: do-not-edit`.

### Out of scope

- Any change to a frozen source value or to Inter + Source Serif 4.
- Any change to the versioned catalog authority, the deterministic ranking, the leading-slash
  trigger predicate, or the fail-closed slash submission — the migration restyles the surface only.
- The unsafe-character escaping in the option row's text (a security behaviour) — it stays as-is.
- The shared overlay/popover primitive — that is grandchild `012`; this grandchild consumes it.

## User-facing behavior + states

No behaviour change. Every panel state renders identically before and after: the same loading,
filtered, empty-catalog, no-matches, stale-offline, and each error state appear with the same copy
and affordances, and option rows show the same active / disabled-with-reason treatment — now driven
by tokenized, comment-labelled `@ds state:` blocks.

## Acceptance criteria

- The autocomplete card and palette read their colours from the semantic and `--slash-*` component
  tokens; no raw source value is hard-coded in their rules.
- The surface declares `@ds surface: slash-autocomplete`, its slots, its layout seam, and one
  `@ds state:` block per `SlashPanelOpenState` and per option-row state listed above.
- The `--slash-*` set is documented in the token reference as a component-token example.
- Every panel and option-row state renders identically to its pre-migration baseline in light and
  dark, including the escaped unsafe-character rendering.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the panel and palette are visually unchanged.

## Security & Redaction

Styling-only. The migration touches no catalog authority, ranking, trigger predicate, or fail-closed
submission, and preserves the option row's unsafe-character escaping; all of that stays behind
`@ds guardrail` comments and unchanged. No new dependency is added. The frozen read-only-by-default
posture is preserved: the surface still only drafts a slash command for the existing explicit-Send
path, never bypassing it.

## Dependencies & affected areas

- Surface: `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx`,
  `apps/pi-remote-web/src/CommandPalette.tsx`, `apps/pi-remote-web/src/CommandOption.tsx`.
- Logic (read, not restyled): `apps/pi-remote-web/src/commands.ts`,
  `apps/pi-remote-web/src/rankHostCommands.ts`, `apps/pi-remote-web/src/insertSlashCommand.ts`,
  `apps/pi-remote-web/src/submitSlashDraft.ts`, `apps/pi-remote-web/src/useSlashTrigger.ts`.
- Styles: the `.slash-panel` rules and the `--slash-*` token set in
  `apps/pi-remote-web/src/style.css` (and its dark / system-dark variants).
- Consumes: grandchild `012-overlays-sheets-modals` (the popover primitive) and the token library.
- Tests: `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` and the command-surface tests.
- Baseline evidence: `scripts/design-system-cdp.mjs` with the slash-autocomplete fixture.
