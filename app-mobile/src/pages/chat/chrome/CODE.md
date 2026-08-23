# chrome/: focus-sensitive controls and overlays

---

## 1. OVERVIEW

`chrome/` is a flat presentation package for the controls that frame the chat transcript. It receives runtime controls and callbacks from [`../screen-chat.svelte`](../screen-chat.svelte), renders the composer and session header and opens menus or sheets for commands, photos, model effort and plan decisions.

Current state:

- [`session-composer.svelte`](./session-composer.svelte) is the main prompt surface. It owns draft text, IME handling, send and stop affordances, command insertion and attachment submission wiring.
- [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte) and [`command-option.svelte`](./command-option.svelte) implement slash navigation with virtual focus. The textarea keeps DOM focus.
- [`runtime-strip.svelte`](./runtime-strip.svelte), [`plan-mode-presentation.ts`](./plan-mode-presentation.ts) and [`runtime-mode-announcer.svelte`](./runtime-mode-announcer.svelte) render only host-confirmed runtime state.
- Sheets use safe initial focus, background hiding and explicit trigger restoration. Plan review and Plan to Build confirmation keep their mutations behind deliberate actions.
- [`todo-panel.svelte`](./todo-panel.svelte) is a read-only projection. It refreshes and groups host tasks but never edits them.

Where a change belongs:

- Prompt, IME, slash list or photo tool: `session-composer.svelte`, `composer-command-autocomplete.svelte` or `composer-tools.svelte`.
- Standalone command list: `command-palette.svelte` or `command-option.svelte`.
- Mode labels and fail-closed states: `plan-mode-presentation.ts`, `button-plan-mode.svelte` or `menu-plan-mode.svelte`.
- Model and effort mutation gates: `sheet-model-effort.svelte` or `radio-effort.svelte`.
- Plan authority decisions: `card-plan-ready.svelte`, `sheet-plan-review.svelte` or `sheet-leave-plan.svelte`.

---

## 2. ARCHITECTURE

```text
screen-chat.svelte
        |
        +--> session-header.svelte
        |          |
        |          +--> button-plan-mode.svelte -> menu-plan-mode.svelte
        |          `--> sheet-model-effort.svelte -> radio-effort.svelte
        |
        +--> runtime-strip.svelte
        |          `--> runtime-mode-announcer.svelte
        |
        +--> session-composer.svelte
        |          +--> composer-command-autocomplete.svelte -> command-option.svelte
        |          +--> composer-tools.svelte -> command-palette.svelte
        |          `--> attachments/ and prompt callbacks
        |
        +--> card-plan-ready.svelte -> sheet-plan-review.svelte
        |                              `--> sheet-leave-plan.svelte
        `--> todo-panel.svelte
```

The root owns runtime authority and relay callbacks. This folder owns presentation state around those callbacks, including focus, virtual focus, sheet dismissal and live announcements.

---

## 3. PACKAGE TOPOLOGY

```text
chrome/
+-- session-composer.svelte             # Prompt input and send lifecycle
+-- composer-command-autocomplete.svelte # Slash suggestions with virtual focus
+-- composer-tools.svelte               # Tools popover and photo entry point
+-- command-palette.svelte              # Standalone command combobox
+-- command-option.svelte               # Focus-preserving command row
+-- runtime-strip.svelte                # Host-backed model, effort and mode readout
+-- plan-mode-presentation.ts           # Pure fail-closed mode derivation
+-- button-plan-mode.svelte             # Mode trigger
+-- menu-plan-mode.svelte               # Build and Plan rows
+-- sheet-model-effort.svelte           # Model and effort sheet
+-- radio-effort.svelte                 # Host-confirmed effort rows
+-- card-plan-ready.svelte              # Ready-plan transcript card
+-- sheet-plan-review.svelte            # Review and execute sheet
+-- sheet-leave-plan.svelte             # Plan to Build confirmation
+-- session-header.svelte               # Header navigation and model trigger
+-- todo-panel.svelte                   # Read-only host todo projection
`-- runtime-mode-announcer.svelte       # Polite and assertive mode announcements
```

Allowed dependency direction:

```text
screen-chat.svelte -> chrome components
chrome components -> shared primitives and catalog strings
composer tools -> command palette and attachments context
mode button -> plan-mode-presentation and mode menu
model sheet -> radio-effort and runtime control callbacks
plan card -> review sheet -> leave confirmation when needed
todo panel -> read-only projection props
```

Disallowed ownership direction:

```text
chrome components -> socket lifecycle or transcript reducer
command rows -> DOM focus transfer away from the composer textarea
plan menu -> direct Plan to Build mutation
todo panel -> host task mutation
local presentation -> guessed runtime mode or optimistic committed state
```

---

## 4. DIRECTORY TREE

The folder is flat. The direct-file inventory below includes each component, logic module and story file.

| File | Responsibility |
|---|---|
| [`button-plan-mode.svelte`](./button-plan-mode.svelte) | Renders the host-confirmed mode trigger and routes activated rows. |
| [`button-plan-mode.stories.ts`](./button-plan-mode.stories.ts) | Stories for Build, Plan, applying, unavailable and disabled modes. |
| [`card-plan-ready.svelte`](./card-plan-ready.svelte) | Shows a valid ready-plan artifact and opens review. |
| [`card-plan-ready.stories.ts`](./card-plan-ready.stories.ts) | Stories for ready-plan card states. |
| [`command-option.svelte`](./command-option.svelte) | Renders one virtual-focus slash command row without taking focus. |
| [`command-option.stories.ts`](./command-option.stories.ts) | Stories for enabled and disabled command rows. |
| [`command-palette.svelte`](./command-palette.svelte) | Renders a command combobox and insertion callback. |
| [`command-palette.stories.ts`](./command-palette.stories.ts) | Stories for command filtering and selection. |
| [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte) | Derives slash panel state, manages virtual focus and announces result counts. |
| [`composer-command-autocomplete.stories.ts`](./composer-command-autocomplete.stories.ts) | Stories for closed, loading, empty, ready, disabled and error panels. |
| [`composer-tools.svelte`](./composer-tools.svelte) | Renders the tools popover, photo actions, command entry and Shift+Tab preference. |
| [`composer-tools.stories.ts`](./composer-tools.stories.ts) | Stories for tools with and without media capability. |
| [`menu-plan-mode.svelte`](./menu-plan-mode.svelte) | Renders Build and Plan rows with activation-only selection. |
| [`plan-mode-presentation.ts`](./plan-mode-presentation.ts) | Purely derives fail-closed mode label, description, disabled state and row reason. |
| [`radio-effort.svelte`](./radio-effort.svelte) | Renders host-advertised effort levels and pending or confirmed state. |
| [`radio-effort.stories.ts`](./radio-effort.stories.ts) | Stories for effort rows and pending or disabled states. |
| [`runtime-mode-announcer.svelte`](./runtime-mode-announcer.svelte) | Announces mode changes without moving focus. |
| [`runtime-mode-announcer.stories.ts`](./runtime-mode-announcer.stories.ts) | Stories for polite and assertive mode announcements. |
| [`runtime-strip.svelte`](./runtime-strip.svelte) | Renders model, effort, Build or Plan controls and runtime status. |
| [`runtime-strip.stories.ts`](./runtime-strip.stories.ts) | Stories for runtime status and mode states. |
| [`session-composer.svelte`](./session-composer.svelte) | Owns prompt input, IME, send, stop, retry, command and attachment wiring. |
| [`session-composer.stories.ts`](./session-composer.stories.ts) | Stories for composer drafts, errors, running and command states. |
| [`session-header.svelte`](./session-header.svelte) | Renders back, inbox, review, theme and model entry controls. |
| [`session-header.stories.ts`](./session-header.stories.ts) | Stories for header navigation and runtime states. |
| [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte) | Confirms the authority-expanding Plan to Build path. |
| [`sheet-leave-plan.stories.ts`](./sheet-leave-plan.stories.ts) | Stories for mode and ready-plan variants. |
| [`sheet-model-effort.svelte`](./sheet-model-effort.svelte) | Coordinates model search, staged selection, effort mutation, sheet focus and reconciliation. |
| [`sheet-model-effort.stories.ts`](./sheet-model-effort.stories.ts) | Stories for model catalog and effort sections. |
| [`sheet-plan-review.svelte`](./sheet-plan-review.svelte) | Presents plan metadata and the keep, revise, leave and execute actions. |
| [`sheet-plan-review.stories.ts`](./sheet-plan-review.stories.ts) | Stories for valid, executing and dismissed review states. |
| [`todo-panel.svelte`](./todo-panel.svelte) | Displays grouped read-only host tasks, progress and refresh state. |
| [`todo-panel.stories.ts`](./todo-panel.stories.ts) | Stories for empty, active, grouped and all-done projections. |
| [`README.md`](./README.md) | Feature behavior and focus-sensitive troubleshooting. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`session-composer.svelte`](./session-composer.svelte) | Main editing surface. It translates root callbacks into textarea, send, stop, retry, slash and attachment interactions. |
| [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte) | Keeps DOM focus in the editor and exposes the active row through virtual focus and `aria-activedescendant`. |
| [`command-option.svelte`](./command-option.svelte) | Preserves focus during pointer selection and gives each command a stable option id. |
| [`plan-mode-presentation.ts`](./plan-mode-presentation.ts) | Produces the only visible Build or Plan label from host-confirmed state. |
| [`sheet-model-effort.svelte`](./sheet-model-effort.svelte) | Stages model choice, gates commits, requests effort changes and announces outcomes. |
| [`sheet-plan-review.svelte`](./sheet-plan-review.svelte) | Holds the safe first focus and the single reviewed-plan execute action. |
| [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte) | Prevents a Plan to Build authority change without confirmation. |
| [`todo-panel.svelte`](./todo-panel.svelte) | Projects host tasks into collapsible sections and never mutates the source plan. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Root input | [`../screen-chat.svelte`](../screen-chat.svelte) supplies runtime controls, connection state and callbacks. |
| Prompt focus | The textarea remains the active DOM focus target while slash rows use virtual focus. |
| Overlay focus | Sheets trap focus, hide outside content through the shared a11y primitive and restore the opening trigger. |
| Runtime mutation | Model, effort and mode changes call host-backed control methods. Local state stages or displays a request, it does not claim acceptance. |
| Plan authority | Plan to Build goes through [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte). Execute goes through [`sheet-plan-review.svelte`](./sheet-plan-review.svelte). |
| Todo ownership | [`todo-panel.svelte`](./todo-panel.svelte) accepts a projection and refresh callback. Task edits belong to the host workflow. |
| Attachment boundary | Photo selection and transfer state live in [`../attachments/CODE.md`](../attachments/CODE.md). The tools popover only opens that path. |

Main flow:

```text
screen-chat.svelte
        |
        +--> session-composer.svelte
        |          |
        |          +--> slash derivation -> command options -> insert callback
        |          +--> tools popover -> photo or command action
        |          `--> root send, stop and retry callbacks
        |
        +--> runtime-strip.svelte -> model / effort sheet or mode menu
        |
        +--> session-header.svelte -> model sheet and navigation callbacks
        |
        +--> card-plan-ready.svelte -> plan review -> execute or leave confirmation
        `--> todo-panel.svelte -> read-only projection and refresh callback
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `session-composer.svelte` | Default Svelte component | Renders the prompt editor and all send-adjacent controls. |
| `planModePresentation` | Function | Derives the fail-closed mode presentation from runtime and connection state. |
| `button-plan-mode.svelte` | Svelte component | Opens the mode menu and routes only activated rows. |
| `sheet-model-effort.svelte` | Svelte component | Hosts model search and effort controls from a runtime control object. |
| `sheet-plan-review.svelte` | Svelte component | Presents the reviewed plan and the atomic execute action. |
| `sheet-leave-plan.svelte` | Svelte component | Confirms the Plan to Build transition. |
| `todo-panel.svelte` | Svelte component | Renders the read-only todo projection. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The chrome folder is covered when it does not appear under missing feature or code documents and every local component or sibling link resolves. When changing source, run the app-mobile typecheck and the story file for the affected control family.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`../README.md`](../README.md)
- [`../attachments/CODE.md`](../attachments/CODE.md)
- [`../transcript/CODE.md`](../transcript/CODE.md)
