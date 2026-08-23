# Chat chrome: composer and controls

> The focus-sensitive controls that frame a session, from prompt entry through runtime mode, model effort and plan review.

---

## 1. OVERVIEW

The `chrome/` folder owns the interactive controls above and below the transcript. A person writes or sends a prompt, opens host commands, adds photos, reads runtime state, changes model or effort, switches Build or Plan mode and reviews a plan.

This is the most focus-sensitive chat sub-area. The composer keeps DOM focus during slash-command navigation, sheets move focus to a safe action and return it to their trigger and the plan controls never present an unconfirmed host mode as settled state. If a visual change affects one of those behaviors, the matching component is the place to inspect first.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte chat chrome |
| Main audience | People operating the active session |
| Control families | Composer, tools, command palette, runtime, plan, sheets, header and todos |
| Accessibility contract | Virtual focus, trapped sheets, live announcements and read-only projections |

---

## 2. FEATURES

### Key Features

| Feature | What it does |
|---|---|
| Prompt composer | [`session-composer.svelte`](./session-composer.svelte) handles draft text, send, stop, retry, IME composition and attachment submission callbacks. |
| Slash commands | [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte), [`command-option.svelte`](./command-option.svelte) and [`command-palette.svelte`](./command-palette.svelte) keep the textarea focused while a command row carries virtual focus. |
| Composer tools | [`composer-tools.svelte`](./composer-tools.svelte) opens photo actions, command insertion and the Shift+Tab preference without moving focus unpredictably. |
| Runtime readout | [`runtime-strip.svelte`](./runtime-strip.svelte) shows host-confirmed model, effort, Build or Plan mode and status. [`runtime-mode-announcer.svelte`](./runtime-mode-announcer.svelte) exposes changes through live regions. |
| Plan mode | [`button-plan-mode.svelte`](./button-plan-mode.svelte), [`menu-plan-mode.svelte`](./menu-plan-mode.svelte) and [`plan-mode-presentation.ts`](./plan-mode-presentation.ts) keep mode labels fail-closed and route Build changes through confirmation. |
| Model and effort | [`sheet-model-effort.svelte`](./sheet-model-effort.svelte) stages model changes and sends effort requests through [`radio-effort.svelte`](./radio-effort.svelte). |
| Plan review | [`card-plan-ready.svelte`](./card-plan-ready.svelte), [`sheet-plan-review.svelte`](./sheet-plan-review.svelte) and [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte) separate safe review from the atomic execute or authority-expanding actions. |
| Session framing | [`session-header.svelte`](./session-header.svelte) provides navigation and model access. [`todo-panel.svelte`](./todo-panel.svelte) shows a read-only host plan projection. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Session host | Runtime controls and session callbacks from [`../screen-chat.svelte`](../screen-chat.svelte) | Chrome renders the state and calls the provided control methods. |
| Live command catalog | A current host command snapshot | Slash insertion is disabled or rejected when the catalog binding is stale. |
| Focus-capable browser | Keyboard and focus APIs | Mobile keyboard, IME and screen-reader behavior depend on preserving the active input. |
| Runtime authority | Host-confirmed model, effort and mode state | Local control state is not treated as a committed host mutation. |
| Overlay support | Dialog and sheet primitives | Open overlays hide the background from assistive technology and restore the trigger on close. |

---

## 4. STRUCTURE

| Group | Files | Change belongs here when |
|---|---|---|
| Composer | [`session-composer.svelte`](./session-composer.svelte), [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte), [`composer-tools.svelte`](./composer-tools.svelte) | The prompt, IME, slash panel, photo tool or composer focus changes. |
| Command palette | [`command-palette.svelte`](./command-palette.svelte), [`command-option.svelte`](./command-option.svelte) | A standalone command list or its row semantics changes. |
| Runtime | [`runtime-strip.svelte`](./runtime-strip.svelte), [`runtime-mode-announcer.svelte`](./runtime-mode-announcer.svelte) | Host-backed readouts or runtime announcements change. |
| Mode | [`button-plan-mode.svelte`](./button-plan-mode.svelte), [`menu-plan-mode.svelte`](./menu-plan-mode.svelte), [`plan-mode-presentation.ts`](./plan-mode-presentation.ts) | Build or Plan presentation, row activation or fail-closed mode copy changes. |
| Sheets | [`sheet-model-effort.svelte`](./sheet-model-effort.svelte), [`radio-effort.svelte`](./radio-effort.svelte), [`sheet-plan-review.svelte`](./sheet-plan-review.svelte), [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte) | A modal focus path, host mutation gate or plan decision changes. |
| Session context | [`session-header.svelte`](./session-header.svelte), [`card-plan-ready.svelte`](./card-plan-ready.svelte), [`todo-panel.svelte`](./todo-panel.svelte) | Header navigation, ready-plan display or read-only todo presentation changes. |

---

## 5. USAGE EXAMPLES

| Person action | Result |
|---|---|
| Type a slash in the composer | The command surface opens while the textarea keeps DOM focus. Arrow keys move virtual focus and Enter inserts the selected command. |
| Open composer tools | Photo actions, command insertion and the Shift+Tab preference appear in one popover. |
| Open the model or effort control | One shared sheet opens at the requested section and returns focus to the header or runtime trigger. |
| Switch from Build to Plan | The plan request goes through the host-confirmed runtime control. |
| Switch from Plan to Build | [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte) confirms the authority-expanding action before changing mode. |
| Review a ready plan | [`sheet-plan-review.svelte`](./sheet-plan-review.svelte) focuses Keep planning first and exposes Execute as the single execute path. |
| Read the todo panel | The phone shows grouped task state and refreshes the projection. It does not edit host tasks. |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| Slash navigation moves the cursor out of the textarea | A command row or popover has taken DOM focus. | Preserve the virtual-focus path in [`composer-command-autocomplete.svelte`](./composer-command-autocomplete.svelte) and [`command-option.svelte`](./command-option.svelte). |
| Mode says unavailable or unconfirmed | The host has not confirmed a safe mode, or runtime state is offline, stale, unsupported or delivery-unknown. | Keep the disabled presentation and wait for host reconciliation. |
| Model effort selection appears to revert | The sheet is controlled by host-confirmed state and is intentionally non-optimistic while a request is pending. | Wait for the runtime outcome before changing the local presentation. |
| A sheet closes without returning focus | The trigger reference was not passed or its focus restore path was changed. | Trace the trigger ref and close handlers in the owning sheet and caller. |
| Build can be selected directly from Plan | The leave confirmation path was bypassed. | Route the Build row through [`sheet-leave-plan.svelte`](./sheet-leave-plan.svelte), not directly to the runtime mutation. |
| Todo rows look editable | The read-only projection styling or semantics changed. | Keep refresh and disclosure interactions only. Task mutation belongs to the host workflow. |

---

## 7. RELATED RESOURCES

### Related Documents

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Chrome topology, focus boundaries and edit placement. |
| [`../README.md`](../README.md) | Chat composition root and child-area navigation. |
| [`../attachments/README.md`](../attachments/README.md) | Local photo draft and transfer behavior opened by the composer tools. |
| [`../transcript/README.md`](../transcript/README.md) | Transcript rows that host the todo projection and artifact actions. |
| [`../features/ask-question/README.md`](../features/ask-question/README.md) | Separate question feature rendered inside the transcript. |
