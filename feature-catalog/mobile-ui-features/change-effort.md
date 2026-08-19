---
title: "Change Effort"
description: "Lets the operator change the host-confirmed thinking effort through one canonical Model and Effort sheet."
trigger_phrases:
  - "change the reasoning effort"
  - "set the thinking level"
  - "adjust the effort level"
version: 1.0.0.0
---

# Change Effort (change-effort)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Lets the operator change the host-confirmed thinking effort through one canonical Model and Effort sheet.

The header and RuntimeStrip surface only the host-confirmed effort value. Selecting a new value opens a single Model and Effort sheet that replaces the old nested effort Select. Selecting an effort row requests one fresh ticketed, revision-checked mutation and stays visually unselected until Pi confirms the new state.

Current status: shipped.

---

## 2. HOW IT WORKS

### One canonical sheet

The header and RuntimeStrip both render the same host-confirmed effort value and hand off to one Model and Effort sheet, opened via `initialSection`. The previous nested effort Select is gone; effort is no longer reachable through a secondary control. The sheet owns the entire effort interaction in one place.

### Effort radio rows

Effort renders as full-width radio rows in the order the host advertises. Each row carries a readable level description from the effort catalog; an unknown level falls back to a safe ordinal label rather than guessing at intent. Rows honor the design invariants: controls stay at least 44px tall, and the clay accent is never the sole signal of a selected state.

### Confirmed, non-optimistic mutation

Selecting a row requests one fresh mutation through a one-use ticket bound to the target `set_thinking_level` call and its expected revision. The runtime state machine is non-optimistic: the row stays visually unselected until Pi confirms the new state. An in-flight guard blocks overlapping requests, and a mutation deadline bounds stale authority. Streaming stays disabled until the host probe confirms delivery.

### Cause-specific recovery states

Streaming, offline, stale-authority, rate-limit, and ambiguous-delivery cases each resolve to their own cause-specific recoverable read-only state instead of one generic Unavailable. These states respect the security contract: the app is read-only by default, and redaction, allowlisting, and content-free push remain intact. The phone cannot enable operator-only full access.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/EffortRadioGroup.tsx` | Component | Controlled radio group with confirmed/pending indicators and descriptions |
| `apps/pi-remote-web/src/ModelEffortSheet.tsx` | Component | Shared sheet hosting the effort section via initialSection |
| `apps/pi-remote-web/src/effort.ts` | Shared | Effort catalog and safe label/description formatting |
| `apps/pi-remote-web/src/runtime.ts` | Shared | Non-optimistic runtime state machine with in-flight guard and mutation deadline |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/EffortRadioGroup.test.tsx` | component | Radio row selection, pending vs confirmed, disabled copy |
| `apps/pi-remote-web/tests/effort-sheet-a11y.test.tsx` | component | Sheet accessibility and VoiceOver semantics |
| `apps/pi-remote-web/tests/runtime-issues.test.ts` | unit | Normalized runtime issue codes and recovery states |

---

## 4. SOURCE METADATA

- Group: MOBILE-UI-FEATURES
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/change-effort.md`
- Current status: shipped

Related references:

- [change-model.md](change-model.md) - Shares the canonical Model and Effort sheet this feature's effort section lives in.
