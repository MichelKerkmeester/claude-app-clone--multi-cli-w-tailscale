# Home screen

The app's landing screen at `/` — the **session roster**. Lists the active/recent agent sessions and lets you open one, with the device's push settings reachable from here.

## Structure

| File | Role |
|------|------|
| `screen-home.svelte` | The roster screen itself; receives sessions + actions from the shell. |
| `empty-state.svelte` | Shown when there are no sessions yet. |
| `freshness.svelte` | The "last updated" freshness indicator for the roster. |
| `push-settings.svelte` | Push-subscription controls (content-free push — a frozen security invariant). |

Rendered by `routes/+page.svelte`. State + actions come from shell context (`getAppState` / `getAppActions`), not direct fetches.
