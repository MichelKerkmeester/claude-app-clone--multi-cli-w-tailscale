# Model and surface catalogs

> The catalog turns host-advertised choices and design-system surfaces into bounded, consistent data for the app.

---

## 1. OVERVIEW

This folder supplies the data and copy behind model selection, thinking-effort selection and the design-system catalog. It helps a reader compare choices without letting a label, provider value or surface registry change host authority. The controls that request a change live with the consuming screen and the runtime state machine.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Four flat TypeScript modules |
| Model data | Provider grouping, availability, capabilities and search ranking |
| Effort data | Seven known levels plus bounded labels for host-defined levels |
| Surface data | Live and registry-only design-system entries |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Model identity | Builds stable provider and model keys and strips unsafe display characters. |
| Catalog organization | Groups models by provider, keeps the current model visible and ranks search matches. |
| Effort copy | Gives known levels local names and describes unknown advertised levels by position. |
| Outcome copy | Maps runtime control outcomes to bounded messages for rows and announcements. |
| Surface registry | Records purpose, states, tokens, editability and preview availability without importing components. |

Unknown host values stay readable without echoing raw identifiers. The catalog describes choices. It does not select a model, change effort or commit a runtime result.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Model input | `AvailableModelDto` values from the host | The organizer uses provider, id, label, availability and capability fields. |
| Effort input | The host-advertised effort list | Callers pass the original order so unknown values receive stable local ordinals. |
| Runtime outcome | `RuntimeControlOutcome` | `runtimeOutcomeMessage` turns the typed result into local copy. |
| Surface registry | `CatalogSurface` data | Registry entries remain safe to inspect without a live host or socket. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`model-catalog.ts`](./model-catalog.ts) | Model identity, display cleanup, availability, capabilities, grouping and ranking. |
| [`effort.ts`](./effort.ts) | Known effort labels, bounded unknown-level copy and accessible names. |
| [`model-switcher-strings.ts`](./model-switcher-strings.ts) | Model picker labels, row names and runtime outcome messages. |
| [`catalog-registry.ts`](./catalog-registry.ts) | Pure-data index of reusable surfaces and their preview classification. |
| [`CODE.md`](./CODE.md) | Module boundaries, lookup flow and editing guidance. |

---

## 5. USAGE EXAMPLES

| Situation | Read or call |
|---|---|
| A picker needs stable identity for the selected model | Use `modelKey` and `isSameModel` from [`model-catalog.ts`](./model-catalog.ts). |
| A provider list needs the current model first | Use `organizeModelCatalog` and keep the host order option explicit. |
| A search field needs ranked rows | Use `filterAndRankModels` after the caller has loaded the current catalog. |
| An effort row needs safe copy | Use `effortRowName`, `effortRowDescription` and `effortRowAccessibleName` from [`effort.ts`](./effort.ts). |
| A surface browser needs to know what it can render | Filter `CATALOG_SURFACES` by `preview` or use `catalogSurfaceById`. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| A model row shows control characters or raw provider text | The caller bypassed the display formatter. | Run labels and provider values through `displayModelText`. |
| An unknown effort id appears as an internal host string | The caller used the id as visible copy. | Use `effortRowName` with the advertised list. |
| The current model disappears after a refresh | The caller rendered only the available list. | Check `retiredCurrent` from `organizeModelCatalog` and show its bounded unavailable state. |
| A registry entry opens a blank live preview | The entry is `registry-only` or needs host-bound state. | Read its `previewReason` and keep the catalog read-only. |

---

## 7. FAQ

**Q: Does this folder perform a model or effort change?**

A: No. It prepares labels, groups and registry data. Runtime controls in [State documentation](../state/README.md) own the host-confirmed mutation path.

**Q: Why does the effort catalog keep unknown values?**

A: The host can advertise a level this client does not know. Keeping its position lets the UI describe the choice without exposing an unbounded identifier.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | How the catalog modules depend on protocol types and each other. |
| [State documentation](../state/README.md) | Host-confirmed runtime state and control outcomes. |
| [Commands documentation](../commands/README.md) | Host command catalogs and fail-closed command bindings. |
| [Shared layer documentation](../README.md) | The broader shared data and logic boundary. |
