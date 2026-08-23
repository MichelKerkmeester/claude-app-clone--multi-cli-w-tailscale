# `catalog/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`model-catalog.ts`** — `modelKey`, `isSameModel`, `displayModelText`, `isModelAvailable`, `modelAvailabilityMessage`, `modelCapabilities`, `organizeModelCatalog`, `matchesModel`, and `filterAndRankModels`.
- **`effort.ts`** — `KNOWN_EFFORT_IDS`, `effortLevelInfo`, `effortOrdinal`, `effortRowName`, `effortRowDescription`, `effortTriggerText`, and the effort message/name helpers.
- **`model-switcher-strings.ts`** — `modelSwitcherStrings`, `modelTriggerName`, `modelCountMessage`, `noModelMatchMessage`, `modelSwitchedMessage`, `modelStatusAnnouncement`, `modelRowName`, and `runtimeOutcomeMessage`.
- **`catalog-registry.ts`** — `CatalogSurface`, `CATALOG_SURFACES`, `LIVE_SURFACE_IDS`, and `catalogSurfaceById`.

## Do-not

- **Don't use a raw model id as visible copy.** Pass model labels and provider values through `displayModelText`, and use the bounded availability messages for unavailable models.
- **Don't turn an effort id into a label by echoing it.** Use `effortRowName`, `effortRowDescription`, and `effortTriggerText`; unknown ids must remain bounded to a local ordinal or generic copy.
- **Don't silently reorder the host's effort list.** `effortOrdinal` respects the advertised order; callers decide whether model order should be preserved.
- **Don't make catalog helpers perform selection.** They organize and describe rows; runtime controls own the mutation and confirmation path.
- **Don't import components into `catalog-registry.ts`.** The registry is data only; live previews are identified by `preview: 'live'` and resolved by the catalog surface.
