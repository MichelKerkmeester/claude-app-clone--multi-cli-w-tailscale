# Catalog

The data behind model and effort selection, model display copy, and the design-system surface registry. It is separate from runtime state because these values organize and describe available choices; they do not establish host authority or perform a selection.

## What lives here

- **`model-catalog.ts`** — provider grouping, current-model retention, availability checks, capability labels, filtering, ranking, and safe model identity helpers.
- **`effort.ts`** — known effort labels and descriptions, bounded ordinals for host-defined levels, trigger text, status messages, and accessible names.
- **`model-switcher-strings.ts`** — model-switcher labels, empty/loading/error copy, accessible row names, and runtime outcome messages.
- **`catalog-registry.ts`** — the pure-data `CATALOG_SURFACES` index, editability notes, preview classification, `LIVE_SURFACE_IDS`, and `catalogSurfaceById` for the design-system catalog.

## Why it's shaped this way

- **Catalog data is not runtime authority.** The host advertises models and effort levels; `state/` decides whether a requested change is allowed and confirmed.
- **Unknown host values stay bounded.** Known effort ids use local copy, while unknown advertised values become ordinals or generic labels instead of raw host text.
- **Organization is deterministic.** Model identity, provider grouping, availability, filtering, and current-model retention are centralized so every switcher surface agrees.
- **The registry is data-only.** `catalog-registry.ts` can describe live and registry-only surfaces without importing components or coupling the catalog preview to the app shell.

Structure, lookup boundaries, and catalog do-nots are in `CODE.md`.
