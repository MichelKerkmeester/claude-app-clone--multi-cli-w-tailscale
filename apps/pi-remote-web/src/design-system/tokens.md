# Token reference — Pi Remote design system

The app reads its design tokens from three layers inside
`apps/pi-remote-web/src/style.css`:

| Layer                    | Block                                                                                | What it holds                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme / design-scale** | `@theme`                                                                             | Type stacks, radius magnitudes, easing                                                                                                             |
| **Primitive (source)**   | `:root` + `:root[data-theme='dark']` + the `prefers-color-scheme: dark` system block | The frozen ink-on-parchment palette as raw `--pi-*` tokens, marked `@ds guardrail: do-not-edit — frozen source`                                    |
| **Semantic / role**      | the same three selectors                                                             | The role tokens the app reads (surfaces, inks, accents, lines, state colours, spacing, layout, motion), marked `@ds edit: tokens — semantic roles` |
| **Component**            | per-surface, in the surface's rules                                                  | Thin per-surface palettes (`--model-sheet-*`, `--slash-*`) that resolve to semantic roles, marked `@ds surface:` + `@ds edit: tokens`              |

Editing rules:

- **Retint the whole app** — change a primitive in the primitive block (frozen — only for a
  deliberate palette change) or a single semantic role on `:root`.
- **Retint one role** — change a semantic `@ds edit: tokens` row (`--canvas`, `--ink`, …).
- **Retint one surface** — change an `@ds edit: tokens` row in that component's block.
- **Do not edit** anything under `@ds guardrail`; those are the frozen contract.

---

## Theme / design-scale tokens (`@theme`)

These back the app's type sizing, radius, and easing. Same in light and dark.

| Token                  | Value                                                                        | Editing it changes                                  |
| ---------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `--font-sans`          | `Inter, system-ui, -apple-system, BlinkMacSystemFont,'Segoe UI', sans-serif` | The UI typeface stack                               |
| `--font-display`       | `'Source Serif 4', Charter, Georgia, Cambria,'Times New Roman', serif`       | The reading/display typeface stack (Source Serif 4) |
| `--font-mono`          | `'SFMono-Regular','Cascadia Code','Roboto Mono',Consolas, monospace`         | The code/mono typeface stack                        |
| `--radius-control`     | `0.625rem`                                                                   | Corner radius of small controls                     |
| `--radius-panel`       | `0.875rem`                                                                   | Corner radius of panels/cards                       |
| `--ease-out-interface` | `cubic-bezier(0.22, 1, 0.36, 1)`                                             | The interface easing curve                          |

---

## Primitive tokens (`--pi-*`) — frozen source

The raw ink-on-parchment palette. Theme-abstract names: each theme block re-declares the same
name with that theme's frozen value, so one semantic role can reference a primitive everywhere.
**These values are the frozen contract — do not change them here.** (Note: `--pi-accent-ui` has
no distinct dark value; the `--accent-strong` semantic role keeps its fixed value in both themes.)

| Token             | Light     | Dark             | What a designer changes by editing it   |
| ----------------- | --------- | ---------------- | --------------------------------------- |
| `--pi-bone`       | `#f8f8f6` | `#24221f` (page) | The parchment canvas stone / dark page  |
| `--pi-raised`     | `#ffffff` | `#2d2a26`        | The raised surface                      |
| `--pi-carbon`     | `#24221f` | `#f8f8f6` (text) | The ink / type colour                   |
| `--pi-muted`      | `#6c6a65` | `#9f998f`        | Muted secondary text                    |
| `--pi-clay`       | `#d97757` | `#d97757`        | The single accent                       |
| `--pi-accent-txt` | `#8a452f` | `#f0b19a`        | The AA text accent                      |
| `--pi-accent-ui`  | `#b85f42` | —                | The AA UI accent (fixed in both themes) |
| `--pi-selection`  | `#f3e4de` | `#3a2720`        | Soft selection / soft surfaces          |

---

## Semantic / role tokens (on `:root`)

The role tokens the app actually reads. Roles whose source is a primitive reference it
(`var(--pi-…)`); the remaining roles are the raw scales and stay literal.

### Colour roles

| Token                 | Light                        | Dark                          | Editing it changes                 |
| --------------------- | ---------------------------- | ----------------------------- | ---------------------------------- |
| `--canvas`            | `#f8f8f6`                    | `#24221f`                     | Page background                    |
| `--canvas-subtle`     | `#efeeeb`                    | `#1f1e1b`                     | Subtle page wells                  |
| `--surface`           | `#ffffff`                    | `#2d2a26`                     | Card/surface fill                  |
| `--surface-raised`    | `#ffffff`                    | `#2d2a26`                     | Raised overlay fill                |
| `--surface-muted`     | `#efeeeb`                    | `#302e2a`                     | Muted surface fill                 |
| `--surface-code`      | `#24221f`                    | `#24221f`                     | Code/terminal well (fixed in both) |
| `--ink`               | `#24221f`                    | `#f8f8f6`                     | Primary text                       |
| `--ink-secondary`     | `#24221f`                    | `#f8f8f6`                     | Secondary text                     |
| `--ink-muted`         | `#6c6a65`                    | `#9f998f`                     | Muted/tertiary text                |
| `--ink-tertiary-safe` | `#6c6a65`                    | `#9f998f`                     | Safe tertiary text                 |
| `--ink-disabled`      | `#6c6a65`                    | `#9f998f`                     | Disabled text                      |
| `--placeholder`       | `#6c6a65`                    | `#9f998f`                     | Placeholder text                   |
| `--ink-inverse`       | `#f8f8f6`                    | `#24221f`                     | Text on inverse/code surfaces      |
| `--line`              | `#e7e6e1`                    | `#3b3934`                     | Hairline/divider                   |
| `--line-hairline`     | `#b7b7b5`                    | `#4a4741`                     | Stronger hairline                  |
| `--control-border`    | `#7b7974`                    | `#807a70`                     | Visible control borders            |
| `--line-strong`       | `#7b7974`                    | `#807a70`                     | Strong borders                     |
| `--decoration-low`    | `#9c9a92`                    | `#777168`                     | Low-emphasis decoration            |
| `--accent`            | `#d97757`                    | `#d97757`                     | The clay accent                    |
| `--accent-strong`     | `#b85f42`                    | `#b85f42`                     | Strong/UI accent (fixed in both)   |
| `--accent-soft`       | `#f3e4de`                    | `#3a2720`                     | Soft accent fill                   |
| `--accent-ink`        | `#8a452f`                    | `#f0b19a`                     | Text on accent                     |
| `--action-bg`         | `#24221f`                    | `#f8f8f6`                     | Primary action background          |
| `--action-fg`         | `#f8f8f6`                    | `#24221f`                     | Primary action foreground          |
| `--success`           | `#37624a`                    | `#8fc4a4`                     | Success text                       |
| `--success-soft`      | `#e7eee9`                    | `#203129`                     | Soft success fill                  |
| `--warning`           | `#8a452f`                    | `#f0b19a`                     | Warning text                       |
| `--warning-soft`      | `#f3e4de`                    | `#3a2720`                     | Soft warning fill                  |
| `--danger`            | `#8d382e`                    | `#ee9b91`                     | Danger text                        |
| `--danger-soft`       | `#f4e7e4`                    | `#3a2522`                     | Soft danger fill                   |
| `--focus`             | `#121212`                    | `#f8f8f6`                     | Focus ring                         |
| `--diff-add`          | `#e4eee7`                    | `#203129`                     | Diff-added background              |
| `--diff-remove`       | `#f3e5e2`                    | `#3a2522`                     | Diff-removed background            |
| `--shadow-raised`     | `0 4px 20px rgb(0 0 0 / 4%)` | `0 4px 20px rgb(0 0 0 / 24%)` | Raised overlay shadow              |

### Spacing / layout roles

| Token             | Value (both themes)      | Editing it changes       |
| ----------------- | ------------------------ | ------------------------ |
| `--space-1`       | `0.25rem`                | 4px step                 |
| `--space-2`       | `0.5rem`                 | 8px step                 |
| `--space-3`       | `0.75rem`                | 12px step                |
| `--space-4`       | `1rem`                   | 16px step                |
| `--space-6`       | `1.5rem`                 | 24px step                |
| `--space-8`       | `2rem`                   | 32px step                |
| `--space-12`      | `3rem`                   | 48px step                |
| `--space-16`      | `4rem`                   | 64px step                |
| `--page-gutter`   | `clamp(1rem, 4vw, 3rem)` | Page edge padding        |
| `--content-width` | `76rem`                  | Max content column width |
| `--reading-width` | `66ch`                   | Reading-measure width    |

### Radius / motion roles

| Token              | Value (both themes)              | Editing it changes        |
| ------------------ | -------------------------------- | ------------------------- |
| `--radius-sm`      | `0.5rem`                         | Small corner radius       |
| `--radius-md`      | `0.75rem`                        | Medium corner radius      |
| `--radius-lg`      | `1rem`                           | Large corner radius       |
| `--duration-fast`  | `120ms`                          | Fast motion duration      |
| `--duration-state` | `220ms`                          | State-transition duration |
| `--ease-out`       | `cubic-bezier(0.22, 1, 0.36, 1)` | Easing for transitions    |

---

## Component tokens (per-surface)

Component tokens are **thin aliases to semantic roles**: a designer retints one surface here
without touching the global roles. The existing sets stay literal because re-pointing must be
pixel-identical in every theme first; they resolve to the semantic values documented above.

### Model sheet (`--model-sheet-*`, surface `model-sheet`)

| Token                     | Light     | Dark      |
| ------------------------- | --------- | --------- |
| `--model-sheet-raised`    | `#ffffff` | `#2d2a26` |
| `--model-sheet-ink`       | `#24221f` | `#f8f8f6` |
| `--model-sheet-muted`     | `#6c6a65` | `#9f998f` |
| `--model-sheet-accent`    | `#8a452f` | `#f0b19a` |
| `--model-sheet-ui-accent` | `#b85f42` | `#f0b19a` |
| `--model-sheet-selection` | `#f3e4de` | `#3a2720` |

### Slash panel (`--slash-*`, surface `slash-panel`)

| Token               | Light     | Dark      |
| ------------------- | --------- | --------- |
| `--slash-raised`    | `#ffffff` | `#2d2a26` |
| `--slash-ink`       | `#24221f` | `#f8f8f6` |
| `--slash-muted`     | `#6c6a65` | `#9f998f` |
| `--slash-accent`    | `#8a452f` | `#f0b19a` |
| `--slash-ui-accent` | `#b85f42` | `#f0b19a` |
| `--slash-selection` | `#f3e4de` | `#3a2720` |
