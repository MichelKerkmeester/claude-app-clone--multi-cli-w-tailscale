# home/: routed session roster and device controls

---

## 1. OVERVIEW

`home/` owns the Home presentation layer for the authenticated root route. It receives session state
and shell callbacks, derives roster freshness and composes four small Svelte surfaces.

Current state:

- [`screen-home.svelte`](./screen-home.svelte) owns the hero, session cards, device footer and child-surface composition.
- [`empty-state.svelte`](./empty-state.svelte) and [`freshness.svelte`](./freshness.svelte) render roster state without owning the roster fetch.
- [`push-settings.svelte`](./push-settings.svelte) owns the notification preference request lifecycle and attention-class switches.
- The route adapter and shell own URL transitions, authentication, session fetching, Review and Inbox overlay state.

---

## 2. ARCHITECTURE

```text
routes/+page.svelte
        |
        v
screen-home.svelte
        |
        +--> empty-state.svelte
        +--> freshness.svelte
        +--> push-settings.svelte
        +--> shared Button and SessionStateIcon
        |
        v
session cards and device actions
```

The route adapter reads app state and app actions from the shell, then passes them to the screen.
The screen derives stale status from the connection and roster source. Push settings performs its
own preference request because notifications are a device concern rather than a roster concern.

---

## 3. PACKAGE TOPOLOGY

```text
routes/+page.svelte
        |
        v
screen-home.svelte
        |
        +--> presentational state: empty-state.svelte, freshness.svelte
        +--> device preference state: push-settings.svelte
        `--> shared format and primitive modules
```

Allowed dependency direction:

```text
route adapter → screen-home.svelte → local child surfaces
screen-home.svelte → shared format helpers and primitives
push-settings.svelte → shared attention transport and primitives
```

The Home screen does not fetch the session roster, mutate app state or render Review and Inbox. The
shell remains the owner of those boundaries.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`empty-state.svelte`](./empty-state.svelte) | Renders loading, empty and error roster copy. |
| [`empty-state.stories.ts`](./empty-state.stories.ts) | Exercises loading, empty and error states. |
| [`freshness.svelte`](./freshness.svelte) | Renders live or stale status and the last sync time. |
| [`freshness.stories.ts`](./freshness.stories.ts) | Exercises live and stale freshness states. |
| [`push-settings.svelte`](./push-settings.svelte) | Loads push config, subscribes, unsubscribes and updates attention preferences. |
| [`push-settings.stories.ts`](./push-settings.stories.ts) | Exercises push settings presentation states. |
| [`screen-home.svelte`](./screen-home.svelte) | Composes the full Home surface and forwards shell actions. |
| [`screen-home.stories.ts`](./screen-home.stories.ts) | Exercises the Home screen with roster and device inputs. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`screen-home.svelte`](./screen-home.svelte) | Derives stale state and maps session, device and action props into the surface. |
| [`freshness.svelte`](./freshness.svelte) | Keeps the live or stale label and time rendering in one component. |
| [`push-settings.svelte`](./push-settings.svelte) | Keeps notification support, subscription and attention-class preferences local to the device surface. |
| [Routes page](../../routes/+page.svelte) | Connects shell context to Home. |
| [Routes layout](../../routes/+layout.svelte) | Decides whether Home is shown or an auth or overlay branch takes over. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Route input | [Routes page](../../routes/+page.svelte) passes session, connection, cache, device and callbacks. |
| Roster ownership | The app shell fetches and stores the roster. Home only renders it. |
| Staleness | `screen-home.svelte` treats a cached roster or non-live connection as stale. |
| Push ownership | `push-settings.svelte` calls the attention preference helpers and keeps config and errors local. |
| Navigation | `onSelect` returns the session id to the shell. Home does not build the session URL. |
| Auth actions | `onLogout` and `onRevoke` return to the shell, which clears auth and device state. |

Main flow:

```text
app shell state and actions
            |
            v
      routes/+page.svelte
            |
            v
      screen-home.svelte
        /        \
       v          v
 session roster  device controls
       |
       +--> freshness.svelte
       +--> empty-state.svelte
       `--> session selection → shell navigation

push-settings.svelte → push config → subscribe or preferences → local status
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`screen-home.svelte`](./screen-home.svelte) | Svelte component | Mounted by the root route as the session roster surface. |
| `HomeProps` | Interface | Defines the state and shell callbacks accepted by Home. |
| [`push-settings.svelte`](./push-settings.svelte) | Svelte component | Mounted by Home for device attention preferences. |
| `FreshnessProps` | Interface | Defines stale and timestamp inputs for the freshness readout. |
| `EmptyStateProps` | Interface | Defines loading and error inputs for the roster state. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/home`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Routes page](../../routes/+page.svelte)
- [Routes layout](../../routes/+layout.svelte)
- [Inbox README](../inbox/README.md)
- [Review README](../review/README.md)
