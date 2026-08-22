# Shared chrome

Small chrome components used across more than one screen — the bits that frame the app rather than belonging to a single view. (Screen-specific chrome, like the chat composer, lives under that screen's folder instead.)

## Structure

| File | Role |
|------|------|
| `Header.svelte` | The app header frame. |
| `StatusPill.svelte` | Connection / status pill (the small live status badge). |
| `SessionStateIcon.svelte` | The session-agent status glyph. |
| `ThemeControl.svelte` | Light / dark theme toggle. |
| `RootErrorBoundary.svelte` | App-wide error boundary (`<svelte:boundary>`), the SvelteKit error surface. |

These are shared *renderers* (used by 2+ screens), so any CSS they own that is genuinely shared lives in `app.css`; state-specific styling stays scoped. Keep them presentational — they take props, they don't fetch.
