# Settings

The `settings/` page folder contains device-run diagnostics and reachable relay or pairing guidance.

## What belongs here

- `screen-settings.svelte` — runs capability-gated diagnostics, streams each result, and offers the structured diagnostics copy action.
- `screen-settings.stories.ts` — shows the screen with no fabricated host or relay data.

Host inventory and probe callbacks remain caller-owned. When those capabilities are absent, the screen
reports them as unavailable instead of guessing.
