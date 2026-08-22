<!-- SPECKIT_LEVEL: 2 -->

# a11y-Parity Findings — react-aria → Bits UI (cutover-blocking)

The App(26) test port exposed one masked a11y regression (sheets lost react-aria's `ariaHideOutside`). A dedicated parity audit (Sonnet fan-out over every primitive pair, 2026-08-22) found the loss is **systemic**, not isolated: the react-aria → Bits UI primitive swap dropped multiple a11y behaviors that the objective gates (token-identity, CDP screenshots, backend tests) cannot see. **The migration does not currently preserve the shipped a11y contract byte-for-byte.** This document is the remediation backlog; each item is a cutover blocker unless explicitly amended.

Method: each Svelte primitive/consumer was read against its React (`react-aria-components`) counterpart, and Bits UI's `dist` source was read to confirm whether a behavior is provided by default. No tests were run for the audit; findings are source-confirmed.

## SEED (FIXED) — Sheet family lost `ariaHideOutside`
- **React:** `LeavePlanSheet.tsx` / `PlanReviewSheet.tsx` / `ModelEffortSheet.tsx` use `ModalOverlay`/`Modal` → auto `ariaHideOutside`.
- **Svelte gap (was):** `Sheet.svelte` / `SheetContent.svelte` (Bits UI `Dialog.*`) had no background-AT-hiding.
- **Status:** FIXED (gpt-5.6-luna) — new `app-mobile/src/lib/primitives/ariaHideOutside.svelte.ts` (ref-counted, precise restore, live-region-exempt, MutationObserver), wired via `SheetContent.svelte`. Bits UI Dialog otherwise preserves `aria-modal`, `role="dialog"`, focus trap, focus restoration, Escape + outside-interact close (all confirmed present).

## P0 — must fix before cutover

### P0-1 · PlanModeMenu: Tab escapes the menu + background reachable
- React: `PlanModeButton.tsx:282` + `PlanModeMenu.tsx:40` — default `<Popover>` → `usePopover` calls `ariaHideOutside({shouldUseInert:true})` and `Overlay` installs a real Tab-trap (focus contained).
- Svelte gap: `PlanModeMenu.svelte:60` → `MenuContent.svelte` → Bits UI `DropdownMenu.Content` defaults `trapFocus=false`, and `menu.svelte.js` `handleTabKeyDown` **closes the menu** on Tab instead of trapping; no aria-hidden/inert anywhere in Bits UI's menu family.
- Impact: sighted keyboard users Tab out of an open Build/Plan picker into the background composer; SR users can reach/activate background content while the picker is visually open.

### P0-2 · Hand-rolled modal dialogs: no ariaHideOutside, weak focus containment
- React: `ArtifactViewerHost.tsx:874-885` and `AttachmentPreviewDialog.tsx:53-62` use `<ModalOverlay><Modal><Dialog>` → focus trap + ariaHideOutside + scroll lock by default.
- Svelte gap: `ArtifactViewerHost.svelte:660-668` and `AttachmentPreviewDialog.svelte:101-107` are **plain `<div role="dialog">`** — they do NOT use Bits UI or the `Sheet`/`SheetContent` primitives at all. Focus trap is hand-rolled Tab-key-only; `AttachmentPreviewDialog.svelte` has no capture-phase focus safety net for a pointer landing on background.
- Impact: on the photo-preview dialog, AT/stray focus can land on background controls with zero correction — weakest containment of any overlay. Note: applying the `ariaHideOutside` helper here (and/or routing these through the Sheet primitive) is the natural fix.

## P1 — preserve-contract failures (fix before cutover unless amended)

- **P1-1 · Composer "+" tools popover lost background AT-hiding.** React `SessionComposer.tsx:727` `<Popover>` → ariaHideOutside; Svelte `ComposerTools.svelte:128` (Bits UI `Popover.Content`) — none. (+P2: background scroll no longer locked; `popover-content.svelte:24` `preventScroll=false`.)
- **P1-2 · Slash-command palette lost background AT-hiding.** React `CommandPalette.tsx:45` `<ComboBox>` → `useComboBox` unconditionally `ariaHideOutside([input,popover])`; Svelte `CommandPalette.svelte:70-132` (Bits UI `Combobox`) — none.
- **P1-3 · Model-search list lost virtual focus / `aria-activedescendant`.** React `ModelEffortSheet.tsx:508` `<Autocomplete>` keeps real focus on the input, sets `aria-activedescendant`, and omits `tabIndex` on rows (explicit iOS-VoiceOver workaround). Svelte `ModelEffortSheet.svelte:485-517` `rows[next].focus()` on every arrow key + hard `tabindex={isCurrent?0:-1}`. Impact: iOS VoiceOver arrow-nav steals focus from the search input, dismissing the keyboard — the exact behavior react-aria coded around.
- **P1-4 · ToggleGroup lost `role="radiogroup"` → generic `role="group"`.** React `useToggleButtonGroup` sets `radiogroup` for single-select (`RuntimeStrip.tsx:75-92`); Svelte `toggle-group.svelte.js:25-32` hardcodes `group`. Affects RuntimeStrip Build/Plan and ThemeControl/SessionHeader theme. (children `role="radio"`/`aria-checked` still correct.)
- **P1-5 · Collapsible/Disclosure triggers lost `<Heading>` semantics app-wide.** React wraps triggers in react-aria `<Heading>` (real `<h3>`) at `TodoPanel.tsx:212`, `App.tsx:1796`, `App.tsx:1986`; Svelte `Collapsible.svelte:14-17` has no heading ancestor at its 3 sites (`TodoPanel.svelte`, `CollapsedEvidence.svelte`, `NormalizedActivityGroup.svelte`). Impact: NVDA/JAWS "H" jump + VoiceOver rotor headings can't reach todo/collapsed blocks — the most-repeated transcript pattern.
- **P1-6 · Header overflow changed ARIA widget pattern (composite-in-composite).** React `SessionHeader.tsx:112-153` = Popover>Dialog + independent ToggleButtons; Svelte `SessionHeader.svelte:163-237` = Bits UI `DropdownMenu` (role=menu/menuitem) with a `ToggleGroup` (role=radio, roving tabindex) nested inside — a documented ARIA anti-pattern. Needs live-AT verification.
- **P1-7 · Menu lost hidden AT-discoverable "Dismiss" button.** React `Popover.mjs` renders visually-hidden `DismissButton`s (touch-AT swipe close) when non-modal; Svelte menu family has none. (Escape/outside-tap still close.)

## P2 — completeness/robustness gaps (batch-fixable; confirm before cutover)
- Composer "+" popover: background scroll not locked (`preventScroll=false`).
- CommandPalette: disabled rows lost `aria-disabled` (only `data-disabled`); `/` trigger re-enters Tab order (no `excludeFromTabOrder`); input lost `aria-controls`.
- DisclosurePanel lost `role="group"` + `aria-labelledby` linking to its trigger; collapsed content lost `hidden="until-found"` (Ctrl+F auto-reveal).
- RadioGroup/ToggleGroup lost `aria-orientation` (functionally harmless).
- Radio/Switch: native `<input>`+`<label>` replaced by role-only `<button>` (defense-in-depth; no confirmed mainstream-SR break).
- ToggleGroup single-select "never empty" guarantee moved from primitive to app-level reset code (fragile to future edits).
- ThemeControl: role swapped toggle-button/`aria-pressed` → radio/`aria-checked` + redundant nested `role="group"` (gains arrow-nav; parity deviation).
- Menu: "focus-outside closes" blur safety net not ported (Tab-out/outside-click still close).

## Explicitly audited — NO loss found
ComposerCommandAutocomplete (full virtual-focus/dismissal parity); SessionComposer Checkbox + FileTrigger; focus restoration to trigger (Sheet/Menu/Popover/Attachment/Artifact); Escape + outside-interact dismissal (Sheet/Menu/Popover/CommandPalette); `aria-expanded`/`aria-haspopup`/`aria-controls` on triggers; RadioGroup roles/nav/labeling/focus; ToggleGroup keyboard nav/labeling; Collapsible AT-tree removal + `aria-expanded`/`aria-controls` + activation; Switch role/state; Sheet-family labeling; Button-only card pairs.

## Remediation notes
- A shared `ariaHideOutside` now exists — P0-2, P1-1, P1-2 can reuse it (apply to the menu/popover/combobox content + the hand-rolled dialogs).
- P0-1 (Tab-trap) and P1-4/P1-5/P1-6 are Bits UI default-behavior/role gaps requiring per-primitive overrides or wrapper markup.
- The objective gates do NOT catch this class; a live-AT or axe/role-tree check should be added to the cutover board.
