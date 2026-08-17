# Phase 2 — Migration flow

Phase 2 implements the Phase-1 decision and migrates every component group onto it as 15
grandchildren. Each grandchild is an independently shippable leaf with `spec.md` + `plan.md` +
`tasks.md` + `checklist.md` and its own verification gate. The flow is layered: foundation, then
primitives, then surfaces, then states/motion, then catalog/docs last.

Every grandchild migrates its surface onto the token library and the inline-comment grammar
(`@ds surface:` / `@ds edit:` / `@ds slot:` / `@ds state:` / `@ds guardrail:`), updates its
per-state presentation, keeps react-aria's ownership of behaviour and state, and registers itself
in the catalog. No grandchild changes a source value or touches the security boundary.

## Layer A — Foundation (ships first)

- **`001-tokens-foundation`** — stand up the primitive → semantic → component token library.
  Formalize the frozen ink-on-parchment palette as the primitive source; define the semantic role
  tokens the app reads; generalize the component-token pattern (the existing `--model-sheet-*` /
  `--slash-*` sets) to a documented convention. No visual change.
- **`002-theming-light-dark`** — formalize the light/dark theming mechanism (`:root`,
  `:root[data-theme='dark']`, `@media (prefers-color-scheme: dark) :root[data-theme='system']`)
  and bake WCAG AA contrast into the semantic→primitive mapping so contrast is guaranteed at the
  token layer, not per-rule.

## Layer B — Primitives (ship before the surfaces that consume them)

- **`003-primitives-react-aria`** — migrate the shared control primitives (Button, Toggle/
  ToggleButtonGroup, Disclosure, Field/Input, status pill, freshness, empty-state, glyphs) onto
  tokens and the grammar, with one per-state seam set every surface reuses.
- **`012-overlays-sheets-modals`** — formalize the shared overlay/sheet/modal primitive
  (ModalOverlay/Modal/Dialog/Popover) and its choreography (swipe-dismiss, history integration,
  focus capture/restore, safe-area, scroll-lock), so per-surface sheets consume one primitive.

## Layer C — Surfaces (one grandchild per surface)

- **`004-app-shell-header-nav`** — app shell, headers, home/review/inbox surfaces, session layout.
- **`005-transcript-message-blocks`** — transcript list and per-kind message blocks (text,
  thinking, plan, tool_call, tool_result, file_diff, file_preview, usage, unknown), streaming and
  live-edge states, the Activity disclosure.
- **`006-composer-input`** — the composer input tray, the primary send/steer/stop button states,
  and the viewport-anchored keyboard behaviour.
- **`007-model-effort-sheet`** — the model picker + effort/reasoning sheet content and its states.
- **`008-slash-command-autocomplete`** — the slash autocomplete card and the command palette.
- **`009-plan-mode-controls`** — the plan-mode control, menu, ready card, review/leave sheets, and
  the mode announcers.
- **`010-rich-content-cards`** — the rich-content command/output, code, and text-artifact cards
  (absorbed from the parallel build branch once it merges into `main`).
- **`011-artifacts-viewer-previews`** — the artifacts viewer shell and the Text/Code/Diff/Markdown/
  Image/Pdf previews and their availability states.
- **`013-question-todos-surfaces`** — the plan/todo checklist surface, plus the scaffold for the
  ask-question and todos surfaces (pending on the sibling `002` packet's F9/F10).

## Layer D — Cross-cutting and catalog (ship last)

- **`014-states-interaction-motion`** — unify the shared status vocabulary (connection phases,
  runtime presentation kinds, artifact resource statuses, slash panel states) into one documented
  state/badge system; formalize motion tokens, focus-visible, and reduced-motion behaviour.
- **`015-catalog-docs-preview`** — stand up the live preview/catalog surface that renders every
  migrated component in every state in both themes by enumerating the `@ds` grammar, plus the
  designer documentation.

## Verification gate (each grandchild)

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface <surface> --viewport-width 390 --theme light --output <temporary-directory>/<surface>-light.png
node scripts/design-system-cdp.mjs --surface <surface> --viewport-width 390 --theme dark --output <temporary-directory>/<surface>-dark.png
```

A grandchild passes only when all suites and the build pass; the migrated surface matches its
pre-migration baseline at true 390 CSS pixels in both themes with zero page horizontal overflow;
the frozen source values are unchanged; the surface declares its `@ds surface:`, slots, and
per-state blocks and registers in the catalog; and no security boundary is touched. For a
web-only surface the fast inner loop is `npm run typecheck -w @pi-remote/web` + `npm run test:web`.
