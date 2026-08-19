---
title: "Component Migration"
description: "Migrates the app's hand-styled components onto semantic, per-surface tokens from the token library so every surface resolves the frozen ink-on-parchment palette through the semantic layer."
trigger_phrases:
  - "migrate a component to the design system"
  - "update the component library"
  - "move a surface onto the token library"
version: 1.0.0.0
---

# Component Migration (component-migration)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Migrates the app's hand-styled components onto semantic, per-surface tokens from the token library so every surface resolves the frozen ink-on-parchment palette through the semantic layer.

The component library holds roughly 55 hand-styled components. Each one reads semantic and per-surface component tokens from the token library instead of hard-coded values, applying the `@ds` inline-comment grammar and per-state seams. The live design-system catalog indexes every migrated surface and serves as a standalone visual reference for the whole library. No source palette value and no security boundary changes as part of the work; the migration consistently preserves the WCAG AA and ≥44px control targets.

Current status: shipped.

---

## 2. HOW IT WORKS

### Token consumption through the semantic layer

From the operator's perspective, a migrated component no longer carries palette values of its own. Each surface reads semantic and per-surface component tokens out of the token library, resolving the frozen ink-on-parchment palette through the semantic layer for light and dark (Inter and Source Serif 4) themes. Because the design palette is frozen, the migration documents that no source palette value changes — tokens are read and resolved, never authored inline on the component.

### The `@ds` grammar and per-state seams

Edits to a migrated surface follow the `@ds` inline-comment grammar, which gives each state its own editable seam rather than a single hard-wired block. This keeps leaves editable without touching shared values. It is an invariant honored here that no security boundary changes during migration — the read-only-by-default surface and the revision-bound, fail-closed mutation ticket remain exactly as app-wide.

### The live catalog and visual verification

Each migrated surface is registered in a live design-system catalog (`Catalog.tsx` with its `registry.ts` and `previews.tsx`), which renders every migrated surface as a standalone visual index. This lets the operator see each state against the applied palette at a glance, with WCAG AA contrast and the ≥44px control minimum preserved as the acceptance targets.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/style.css` | Shared | Per-surface component-token blocks resolving to semantic roles |
| `apps/pi-remote-web/src/design-system/catalog/Catalog.tsx` | Component | Live catalog shell indexing every migrated surface |
| `apps/pi-remote-web/src/design-system/catalog/registry.ts` | Shared | Registry of catalog surfaces and their previews |
| `apps/pi-remote-web/src/design-system/catalog/previews.tsx` | Component | Per-surface catalog preview renders |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/contrast.test.tsx` | unit | Proves the applied palette across migrated surfaces stays WCAG-compliant (no dedicated catalog unit test) |

---

## 4. SOURCE METADATA

- Group: DESIGN-SYSTEM
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `design-system/component-migration.md`
- Current status: shipped

Related references:

- [token-library.md](token-library.md) - the semantic and per-surface token library every migrated surface resolves through
- [designer-editability.md](designer-editability.md) - the `@ds` per-state seam grammar applied across migrated surfaces
