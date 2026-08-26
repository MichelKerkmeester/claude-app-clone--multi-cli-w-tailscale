# chrome/: shared navigation, status and recovery components

---

## 1. OVERVIEW

`chrome/` owns five small Svelte surfaces used by the app shell and session roster. The components receive typed values and callbacks. They do not load relay data, navigate routes or persist theme state.

Current state:

- `header.svelte` composes the wordmark, navigation callbacks, `ThemeControl` and `StatusPill`.
- `status-pill.svelte` maps every `ConnectionPhase` to a bounded live status label.
- `theme-control.svelte` owns pressed-state presentation and delegates theme persistence to its caller.
- `session-state-icon.svelte` maps a `SessionCardDto['status']` value to a glyph.
- `root-error-boundary.svelte` contains render failures and exposes reload and cache-reset recovery.

---

## 2. ARCHITECTURE

The header composes shared children while the recovery boundary stays independent of app state:

```text
Shell callbacks and typed state
            |
            v
      header.svelte
       |       |
       v       v
ThemeControl StatusPill
       |
       v
 shared interaction actions

App shell -> RootErrorBoundary -> children or failed recovery surface
Session card status -> SessionStateIcon -> status glyph
```

The header uses the shared Button primitive for navigation. `ThemeControl` uses the shared interaction actions for pointer, focus and focus-visible attributes. `RootErrorBoundary` reads theme colors only while rendering its failed state.

---

## 3. PACKAGE TOPOLOGY

This folder is a flat presentation package:

```text
Host route and shell -> header.svelte -> Button, ThemeControl, StatusPill
ThemeControl -> shared a11y interactions
Session card -> session-state-icon.svelte
App shell -> root-error-boundary.svelte
```

Allowed ownership:

- The host owns navigation callbacks, `reviewAvailable`, `ThemePreference` and `ConnectionPhase`.
- `header.svelte` owns composition and header layout.
- `status-pill.svelte` owns phase labels and status-region markup.
- `theme-control.svelte` owns option events and pressed-state markup.
- `root-error-boundary.svelte` owns only render recovery and browser cleanup before reload.

Disallowed ownership:

- Chrome components must not call relay endpoints or change reducer state directly.
- `ThemeControl` must not persist the selected theme. Its caller handles persistence.
- `SessionStateIcon` must not infer a session state from a timestamp or connection phase.

---

## 4. DIRECTORY TREE

The folder is flat. Story files exercise the corresponding component with real prop types:

| File | Responsibility |
|---|---|
| [`header.svelte`](./header.svelte) | Header composition and navigation callbacks. |
| [`header.stories.ts`](./header.stories.ts) | Header stories with Review available and unavailable. |
| [`root-error-boundary.svelte`](./root-error-boundary.svelte) | App-level failed render and recovery actions. |
| [`root-error-boundary.stories.ts`](./root-error-boundary.stories.ts) | Normal boundary pass-through story. |
| [`session-state-icon.svelte`](./session-state-icon.svelte) | Session status glyph mapping. |
| [`session-state-icon.stories.ts`](./session-state-icon.stories.ts) | Idle and running glyph stories. |
| [`status-pill.svelte`](./status-pill.svelte) | Connection phase label and dot. |
| [`status-pill.stories.ts`](./status-pill.stories.ts) | Connection phase stories. |
| [`theme-control.svelte`](./theme-control.svelte) | Auto, Light and Dark option control. |
| [`theme-control.stories.ts`](./theme-control.stories.ts) | Theme preference stories. |
| [`haptics.ts`](./haptics.ts) | No-op-safe selection, success, error and edge-bump vibration. |
| [`README.md`](./README.md) | Feature orientation for shared chrome. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`header.svelte`](./header.svelte) | Accepts callbacks and typed state, then composes navigation, theme and connection children. |
| [`status-pill.svelte`](./status-pill.svelte) | Maps `ConnectionPhase` values to local labels and exposes one status region. |
| [`theme-control.svelte`](./theme-control.svelte) | Keeps the three theme options in one group and only calls `onChange` for a new value. |
| [`session-state-icon.svelte`](./session-state-icon.svelte) | Applies a deterministic glyph mapping to session status. |
| [`root-error-boundary.svelte`](./root-error-boundary.svelte) | Renders children normally and offers Reload or Reset app data after an error. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Inputs | Props are the source of truth. No component reads route state or relay state directly. |
| Navigation | `Header` calls `onHome`, `onInbox` and `onReview`. It does not perform navigation itself. |
| Theme | `ThemeControl` calls `onChange` only. The shell decides how to save and apply the preference. |
| Status | `StatusPill` uses a local phase map and announces it through `role="status"`. |
| Recovery | `RootErrorBoundary` unregisters service workers and deletes caches only after the user selects Reset app data. |

Main flow:

```text
ConnectionPhase + ThemePreference + callbacks -> Header
Header -> Button navigation, ThemeControl and StatusPill
ThemeControl option press -> onChange(theme)
ConnectionPhase -> local label -> status region
Child render error -> RootErrorBoundary -> Reload or Reset app data -> page reload
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `Header` | Svelte component | Renders global navigation and shared status controls. |
| `StatusPill` | Svelte component | Renders a connection phase with bounded copy. |
| `ThemeControl` | Svelte component | Renders the theme preference options. |
| `SessionStateIcon` | Svelte component | Renders the session status glyph. |
| `RootErrorBoundary` | Svelte component | Wraps shell children and exposes failed-state recovery. |
| `HeaderProps` and `ThemeControlProps` | Interfaces | Define the callback and value contracts for the composed controls. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Button primitive](../primitives/button/README.md)
- [Accessibility helpers](../primitives/a11y/README.md)
- [State documentation](../state/CODE.md)
