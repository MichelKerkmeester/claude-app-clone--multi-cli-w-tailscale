# catalog/: bounded model, effort and surface data

---

## 1. OVERVIEW

`catalog/` owns the shared lookup and copy layer for model and effort controls plus the design-system surface registry. It is flat and intentionally data-oriented. Consumers can organize or describe a choice here, while runtime state owns whether a host change is allowed and confirmed.

Current state:

- `model-catalog.ts` groups `AvailableModelDto` values, ranks matches and keeps a retired current model visible.
- `effort.ts` maps known levels to local copy and bounds unknown advertised levels by their host-list position.
- `model-switcher-strings.ts` supplies picker copy, accessible names and typed runtime outcome messages.
- `catalog-registry.ts` indexes live and registry-only surfaces without importing Svelte components.

---

## 2. ARCHITECTURE

The four modules serve separate data paths and meet at their consuming controls:

```text
Host model catalog -> model-catalog.ts -> grouped and ranked model rows
Host effort list   -> effort.ts       -> bounded row and trigger copy
Runtime outcome    -> model-switcher-strings.ts -> status announcement
Design-system seams -> catalog-registry.ts -> surface index and preview filter
```

The catalog registry can describe a surface that needs a live host. `LIVE_SURFACE_IDS` only identifies entries marked `live`. It does not mount a component or provide a fake runtime.

---

## 3. PACKAGE TOPOLOGY

This folder has no barrel file and no internal subdirectories. Its import direction is narrow:

```text
Protocol DTO types -> model-catalog.ts
Protocol outcome types -> model-switcher-strings.ts
Consumers -> catalog modules
catalog-registry.ts -> no component or transport imports
```

Allowed ownership:

- Model controls use `model-catalog.ts` for identity, availability and ordering.
- Effort controls use `effort.ts` for all visible and accessible level copy.
- Runtime controls use `model-switcher-strings.ts` for typed outcome wording.
- A catalog browser reads `catalog-registry.ts` as data and decides whether a live renderer is available.

Disallowed ownership:

- These modules must not perform selection or runtime mutation.
- `catalog-registry.ts` must not import Svelte components, the app shell or a socket.
- Callers must not turn model ids, effort ids or server reason strings into unbounded UI text.

---

## 4. DIRECTORY TREE

The folder is flat. The direct files are:

| File | Responsibility |
|---|---|
| [`catalog-registry.ts`](./catalog-registry.ts) | Surface records, live preview ids and id lookup. |
| [`effort.ts`](./effort.ts) | Known effort records and bounded formatters. |
| [`model-catalog.ts`](./model-catalog.ts) | Model identity, grouping, availability and ranking. |
| [`model-switcher-strings.ts`](./model-switcher-strings.ts) | Model picker copy and outcome messages. |
| [`README.md`](./README.md) | Feature orientation for the catalog data. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`model-catalog.ts`](./model-catalog.ts) | Sanitizes display text, compares model identity, groups providers, retains a retired current model and ranks query matches. |
| [`effort.ts`](./effort.ts) | Preserves host-advertised order and creates local names, descriptions, trigger text and accessible names. |
| [`model-switcher-strings.ts`](./model-switcher-strings.ts) | Centralizes model picker labels and maps `RuntimeControlOutcome` to bounded copy. |
| [`catalog-registry.ts`](./catalog-registry.ts) | Records surface purpose, states, tokens, editability and preview kind as readonly data. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Host model values | Keep provider and id for identity, but sanitize labels and provider text before display. |
| Host effort values | Keep the advertised list order. Known ids use local labels. Unknown ids use a bounded ordinal or generic copy. |
| Runtime authority | Catalog helpers describe a requested choice. The runtime reducer and control lane decide whether it settles. |
| Surface preview | `live` entries can be selected by a browser. `registry-only` entries remain descriptive when a host or resource is required. |

Main flow:

```text
AvailableModelDto[] -> modelKey and availability checks -> provider groups -> search ranking -> picker rows
advertised effort ids -> ordinal lookup -> local names and descriptions -> effort rows and trigger
CatalogSurface[] -> preview kind filter -> live surface selection or registry-only explanation
RuntimeControlOutcome -> runtimeOutcomeMessage -> local status copy
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `modelKey` and `isSameModel` | Functions | Compare provider plus model id without relying on display labels. |
| `organizeModelCatalog` | Function | Group available models and retain the current model when it is no longer advertised. |
| `filterAndRankModels` | Function | Return deterministic search results with prefix, substring and subsequence tiers. |
| `effortRowName` and `effortRowAccessibleName` | Functions | Produce bounded visible and assistive copy for effort rows. |
| `runtimeOutcomeMessage` | Function | Map a typed runtime outcome to local picker copy. |
| `CATALOG_SURFACES` and `catalogSurfaceById` | Data and function | Expose the design-system surface registry and lookup. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The assigned folder is healthy when it has both documents and contributes no unresolved references. The scan can still report missing documents in folders owned by other workstreams.

---

## 9. RELATED

- [`README.md`](./README.md)
- [State documentation](../state/CODE.md)
- [Commands documentation](../commands/CODE.md)
- [Shared layer documentation](../CODE.md)
