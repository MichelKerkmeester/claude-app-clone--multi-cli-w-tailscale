---
title: "Todos"
description: "A read-only TodoPanel that renders the host's redacted Pi todo plan as an inline, always-visible parchment block."
trigger_phrases:
  - "show the todo list"
  - "view the plan todos"
  - "display the task panel"
version: 1.0.0.0
---

# Todos (mobile-ui-features/todos)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

A read-only TodoPanel that renders the host's redacted Pi todo plan as an inline, always-visible parchment block.

The panel lives in the mobile UI and projects the operator's todo plan onto the phone as a static, grouped list. From the operator's perspective the todos appear inline alongside relevant activity and stay visible even when that surrounding activity is collapsed. The panel is a pure host projection: rows are grouped, statically rendered list items with provenance and progress, never checkboxes or mutation controls.

Current status: shipped.

---

## 2. HOW IT WORKS

### Inline, always-visible projection

A first-class `TodoPanel` renders the host's redacted Pi todo plan as an inline parchment block. It stays visible next to the relevant activity even when the surrounding activity is collapsed, so the operator can keep the plan in view while interacting with other phone content.

### Read-only grouping and ordering

Rows are static list items grouped by pending/active/done/blocked state and arranged in host order. Each item carries provenance and progress. The panel honors the read-only host projection invariant: it ships no ticketed todo mutation lane, so the phone can never complete, add, edit, reorder, or cancel tasks, and nothing is rendered as a checkbox.

### Redacted sync and live deltas

The relay validates and synchronizes a redacted `TodoProjectionV1` snapshot or delta over the existing authenticated sync channel, applying live deltas to the projection as they arrive. The projection model derives host order and the reducer folds both snapshots and deltas. Redaction documents the security boundary the feature honors, and plan-mode plus operator-only `--full-access` enforcement is unchanged.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/TodoPanel.tsx` | Component | Inline read-only todo panel with grouping, glyphs, and progress |
| `apps/pi-remote-web/src/todo-model.ts` | Shared | Projection model, state grouping, and host-order derivation |
| `apps/pi-remote-web/src/todo-state.ts` | Shared | Snapshot + live-delta reducer for the projection |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/TodoPanel.test.tsx` | component | Grouping, progress, glyphs, and read-only rendering |
| `apps/pi-remote-web/tests/todo-state.test.ts` | unit | Snapshot/delta reduction and ordering |
| `apps/pi-remote-relay/tests/todo-projection.test.ts` | integration | Relay TodoProjectionV1 validation, redaction, and delta sync |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/todos.md`
- Current status: shipped

Related references:

- Inline read-only projections in the mobile UI.
