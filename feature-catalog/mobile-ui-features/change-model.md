---
title: "Change Model"
description: "Browses the host-confirmed model catalog and stages a model in a bottom sheet, committed only via a one-use ticketed Switch action."
trigger_phrases:
  - "change the model"
  - "switch the active AI model"
  - "pick a different model"
version: 1.0.0.0
---

# Change Model (change-model)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Browses the host-confirmed model catalog and stages a model in a bottom sheet, committed only via a one-use ticketed Switch action.

The session header shows the host-confirmed model label and a single trigger that opens a full-width iPhone bottom sheet. Inside the sheet the operator browses, searches, and stages a model read-only from the host's grouped catalog; nothing changes until an explicit Switch model action. Commit obtains a one-use ticket bound to the target model and the current runtime/catalog revisions, and the header label stays unchanged until the host accepts.

Current status: shipped.

---

## 2. HOW IT WORKS

### Read-only staging from the grouped catalog

The bottom sheet opens against the host's catalog as normalized by the shared catalog module, grouped by provider with capability metadata. Browsing, searching, and selecting a row only stage the choice in the sheet's local state. Nothing is sent to the host and no confirmed label changes until the operator presses Switch.

### Ticketed, revision-checked commit

The Switch action is read by default; mutation only happens through a one-use, fail-closed ticket bound to the set_model operation, the provider/model id, and the current runtime and catalog revisions. The commit is revision-checked server-side, so a catalog that has moved since the sheet was opened rejects the stale commit rather than applying it. The commit is content-free: the minimal model DTO is redacted so only the identifier and provider travel to the host.

### Host-authoritative outcome states

The header never shows optimistic text; it stays unchanged until the host accepts. stale, rejected, and delivery-unknown outcomes surface as visible states in the sheet and never retry automatically. The operator must act again to proceed.

### Contrast and touch sizing as honors

The change surface honors the app's contrast and touch invariants in its presentation: touch targets are at least 44px, the sheet reflows at 320px width, and clay is never used as the sole signal for the active state—the current model is always also conveyed by the confirmed label text, so a color-blind operator is never left without a non-color cue.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/SessionHeader.tsx` | Component | Renders the confirmed model label and the sheet trigger |
| `apps/pi-remote-web/src/ModelEffortSheet.tsx` | Component | Bottom sheet hosting the grouped model catalog, staging, and Switch action |
| `apps/pi-remote-web/src/model-catalog.ts` | Shared | Normalizes and groups the host catalog with provider/capability metadata |
| `apps/pi-remote-relay/src/runtime/runtime-service.ts` | Handler | Validates model against catalog and commits ticketed revision-checked set_model |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` | component | Sheet browse/stage/switch interaction and failure states |
| `apps/pi-remote-web/tests/model-catalog.test.ts` | unit | Catalog normalization and grouping |
| `apps/pi-remote-web/tests/SessionHeader.test.tsx` | component | Header confirmed-model label and trigger |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/change-model.md`
- Current status: shipped

Related references:

- [change-effort.md](change-effort.md) - Shares the canonical Model and Effort sheet this feature stages into.
