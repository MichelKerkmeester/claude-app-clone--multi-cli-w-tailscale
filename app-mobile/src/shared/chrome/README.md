# Shared chrome

Small chrome components used across more than one screen — the bits that frame the app rather than belonging to a single view. (Screen-specific chrome, like the chat composer, lives under that screen's folder instead.)

## Structure

| File | Role |
|------|------|
| `header.svelte` | The app header frame. |
| `status-pill.svelte` | Connection / status pill (the small live status badge). |
| `session-state-icon.svelte` | The session-agent status glyph. |
| `theme-control.svelte` | Light / dark theme toggle. |
| `root-error-boundary.svelte` | App-wide error boundary (`<svelte:boundary>`), the SvelteKit error surface. |

These are shared *renderers* (used by 2+ screens), so any CSS they own that is genuinely shared lives in `app.css`; state-specific styling stays scoped. Keep them presentational — they take props, they don't fetch.
