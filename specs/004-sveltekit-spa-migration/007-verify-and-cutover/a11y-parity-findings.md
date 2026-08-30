<!-- SPECKIT_LEVEL: 2 -->

# a11y-Parity Findings — react-aria → Bits UI (cutover-blocking)

The App(26) test port exposed one masked a11y regression (sheets lost react-aria's `ariaHideOutside`). A dedicated parity audit (Sonnet fan-out over every primitive pair, 2026-08-22) found the loss is **systemic**, not isolated: the react-aria → Bits UI primitive swap dropped multiple a11y behaviors that the objective gates (token-identity, CDP screenshots, backend tests) cannot see. **The migration does not currently preserve the shipped a11y contract byte-for-byte.** This document is the remediation backlog; each item is a cutover blocker unless explicitly amended.

Method: each Svelte primitive/consumer was read against its React (`react-aria-components`) counterpart, and Bits UI's `dist` source was read to confirm whether a behavior is provided by default. No tests were run for the audit; findings are source-confirmed.

## RESOLUTION — all P0 + P1 FIXED and independently re-verified (C3)

Every P0 and P1 finding was remediated (executor-written source, gpt-5.6-luna) and then adversarially re-verified by a 4-group read-only fan-out that each tried to *refute* the fix against the frozen React oracle + Bits UI `dist`. **All 4 groups returned ALL-FIXED, 0 defects.** The objective gates (token-identity/CDP/backend) remain blind to this class; this verifier pass is the a11y acceptance evidence for the board.

| Finding | Fix commit(s) | Verified | Restored behavior (basis) |
|---|---|---|---|
| SEED (Sheet ariaHideOutside) | `ff6aeb6` | A | `SheetContent.svelte` hides background on open, restores on close (also serves PlanReview/ModelEffort) |
| P0-1 (PlanModeMenu Tab-trap + bg) | `6fcd0d5` + `83433b5` | B | `MenuContent.svelte` capture-phase Tab trap preempts bits-ui close-on-Tab **and** `ariaHideOutside` hides background |
| P0-2 (hand-rolled dialogs) | `888c3b9` | A | ArtifactViewerHost + AttachmentPreviewDialog call `hideOutside([dialogEl])` + Tab-wrap/focusin containment |
| P1-1 (composer "+" popover) | `83433b5` | A | `ComposerTools.svelte` hides background via the Popover.Content ref, matching react-aria modal popover |
| P1-2 (slash-command palette) | `83433b5` | A | `CommandPalette.svelte` `hideOutside([content,input])` matches `useComboBox` |
| P1-3 (model-search virtual focus) | `f8359a6` | D | Focus stays on input; `aria-activedescendant` tracks highlight; no row `.focus()`; Enter reads active-descendant (iOS-VoiceOver-safe) |
| P1-4 (ToggleGroup radiogroup) | `f2da878` | C | Single-select renders `role="radiogroup"`; children keep `role=radio`/`aria-checked` |
| P1-5 (Collapsible headings) | `c780925` | C | Shared primitive wraps the trigger in a real `<h3>` → all 3 sites reachable by SR heading nav |
| P1-6 (header widget pattern) | `b0c28fd` + `263b2a1` | B | SessionHeader overflow re-architected to Popover>Dialog; the menu-wrapping-radiogroup anti-pattern is gone |
| P1-7 (Dismiss buttons) | `6fcd0d5` + `263b2a1` | B | AT-discoverable `sr-only` Dismiss buttons bracket menu + both popovers; wired to close |

**P2 items below stay deferred** per the user directive (fix Full P0+P1 before cutover); they are amendment candidates, not cutover blockers. The sanctioned parity deviations (ThemeControl toggle-button/`aria-pressed`+`role=group`, `ae6a5dd`) are intentional, not defects.

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

## P2 — RESOLVED 2026-08-30

All eight items are closed: five fixed at the primitive with a test that fails without the fix, one
waived with its reason, two already satisfied by the current source. Each fix was negative-controlled
by reverting the source and watching the covering test fail — reverting the three primitives failed 4
tests, reverting the two components failed 2.

| # | Outcome | Where |
|---|---------|-------|
| 1 | FIXED | `composer-tools.svelte` enables `preventScroll`; covered in `composer-tools-a11y.svelte.test.ts` |
| 2 | FIXED | `command-palette.svelte` restores `aria-disabled`, listbox ownership and trigger tab exclusion |
| 3 | FIXED | `collapsible.svelte` restores group labeling and `hiddenUntilFound` |
| 4 | FIXED | `radio-group.svelte` and `toggle-group.svelte` restore `aria-orientation` |
| 5 | WAIVED | See the waiver below |
| 6 | FIXED | `toggle-group.svelte` enforces non-empty single selection in the primitive; the consuming `runtime-strip.svelte` mirror became a `$derived` rather than an `$effect` |
| 7 | ALREADY-CORRECT | `theme-control.svelte` already carries `role="group"` with `aria-pressed`; no redundant nesting |
| 8 | ALREADY-CORRECT | The menu primitive delegates to the dialog library, whose current behaviour closes on focus leaving the menu; the added test passes with no source change |

### Waiver — item 5, native input versus role-only button

**Decision:** accept the button-based `role="switch"` / radio implementations; do not revert to native
`<input>` + `<label>`.

**Why:** the finding recorded this as defense-in-depth with *no confirmed mainstream screen-reader
break*, and none was demonstrated when re-examined. `push-settings.svelte` carries a valid
`role="switch"` with `aria-checked`, which is a conforming pattern. Reverting would rewrite a
primitive and every consumer of it to buy a benefit nobody could name. It becomes worth revisiting if
a specific assistive technology is shown to mishandle the role-only form — that is the fact that would
change this decision.

---

## P2 — the original findings (kept for the record)
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
