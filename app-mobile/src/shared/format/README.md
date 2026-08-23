# Format

Presentation helpers for time, numbers, artifact sizes, view labels, attention copy, and push configuration. This folder is separate because display transformations and attention-facing copy change independently of reducers and transport payloads.

Most helpers here are pure. **`attention.ts` is the deliberate boundary exception:** it owns the attention and Web Push endpoint calls needed by the inbox and notification settings, while keeping their response validation and local types together.

## What lives here

- **`format.ts`** — `formatTime`, `formatNumber`, `formatCost`, and `formatArtifactSize` for compact, user-facing values.
- **`view-helpers.ts`** — theme preference, route id parsing, approval loading, attention labels and icons, session status labels, compact ids, relative time, error copy, and countdown text.
- **`attention.ts`** — attention inbox reads and hint opening, push configuration, subscription and preference updates, foreground state, and protocol response guards.

## Why it's shaped this way

- **Presentation stays out of reducers.** State stores typed values and phases; this folder turns them into labels, names, timestamps, and compact readouts.
- **Visible copy is centralized.** Attention, session, theme, and model-adjacent view wording should not drift between screens.
- **The exception is visible.** Push and attention need network calls, so their client boundary is kept in `attention.ts` rather than pretending those operations are pure formatters.

Structure, helper ownership, and format do-nots are in `CODE.md`.
