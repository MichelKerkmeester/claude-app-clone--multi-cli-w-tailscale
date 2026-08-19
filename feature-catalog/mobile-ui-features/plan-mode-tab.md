---
title: "Plan Mode Tab"
description: "A persistent composer-adjacent control that presents only host-confirmed build/plan mode and atomically executes reviewed plans under a one-use ticket."
trigger_phrases:
  - "switch to plan mode"
  - "enter plan mode"
  - "toggle build and plan"
version: 1.0.0.0
---

# Plan Mode Tab (plan-mode-tab)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

A persistent composer-adjacent control that presents only host-confirmed build/plan mode and atomically executes reviewed plans under a one-use ticket.

A `PlanModeButton` sits immediately after the `+` button beside the composer and displays the mode the host has actually confirmed. Tapping it opens a two-option Build/Plan menu. A `Shift+Tab` keyboard shortcut toggles the mode, but only while the composer textarea is focused and the runtime is ready and settled. A requested mode never appears as the current mode until the host acknowledges it.

Current status: shipped.

---

## 2. HOW IT WORKS

### Host-confirmed state, never optimistic

The button renders one of five states — Build, Plan read-only, Plan ready, Executing plan, or Mode unavailable — all of which reflect the state the host has actually acknowledged. No optimistic committed mode is ever shown. A mode the operator requests remains a pending request until host acknowledgement; only then does it display as current. The state message is confirmed via the structured host plan status and phase. The control is a confirmed-state label, not a local assumption, which honors the invariant that a requested mode never masquerades as committed.

### Mode toggle through touch and keyboard

Tapping the persistent control opens a two-option Build/Plan menu for explicit selection. Toggle is also available via `Shift+Tab`, but only when the composer textarea is focused and the runtime is ready and settled; outside those conditions the shortcut is inert. Because the iOS on-screen keyboard exposes no Tab key, the touch path via the menu remains the reliable route on iOS. The control itself stays at least 44px in all sizes so it remains tappable.

### Ticketed atomic plan execution

Executing a reviewed plan is a single atomic operation managed from the structured plan review sheet, not a chat prompt and not a `set_mode`-then-prompt sequence. The operation is bound to the plan id, the plan revision, an opaque plan token, and the runtime revision, and it consumes a one-use ticket. Running a plan and toggling mode are therefore separate operations with distinct authority paths, and write-tool authority is gated host- and extension-side. A new mode request is thus never coerced into direct plan execution.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/PlanModeButton.tsx` | Component | Persistent composer-adjacent host-confirmed mode control |
| `apps/pi-remote-web/src/PlanModeMenu.tsx` | Component | Build/Plan two-option menu |
| `apps/pi-remote-web/src/PlanReviewSheet.tsx` | Component | Structured plan review and explicit atomic execution handoff |
| `apps/pi-remote-relay/src/runtime/plan-status.ts` | Handler | Confirms structured host plan status and phase |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/PlanModeButton.test.tsx` | component | Confirmed-state labels and pending-vs-committed presentation |
| `apps/pi-remote-web/tests/usePlanModeShortcut.test.tsx` | unit | Composer-scoped Shift+Tab interception |
| `apps/pi-remote-relay/tests/plan-control.test.ts` | integration | Ticketed plan-mode transitions and execution lease |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/plan-mode-tab.md`
- Current status: shipped

Related references:

- (none in this feature set)
