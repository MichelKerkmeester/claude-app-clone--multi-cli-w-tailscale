# Iteration 003 — theme and design-token system

## Focus

Angle 2 [ease-of-use]: how OGAM structures, documents, and applies theme and design tokens so components remain consistent across light/dark modes and the brutalist terminal language.

## Actions Taken

1. Read the design-system source of truth in `specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md`, including the token tables, implementation example, component checklist, and anti-patterns.
2. Traced runtime theme resolution through `src/theme/index.ts`, `src/theme/useTheme.ts`, `src/theme/useThemedStyles.ts`, and `src/theme/palettes.ts`.
3. Traced theme-independent typography, font, and spacing ownership in `src/constants/index.ts`.
4. Cross-checked the documented architecture in `docs/standards/CODEBASE_GUIDE.md`, the palette tests, and representative chat styles.

## Findings

### F1 — Make the design language executable as a small semantic token vocabulary

OGAM defines a deliberately narrow language: brutalist/minimal, terminal-inspired, Menlo monospace, monochrome hierarchy, one emerald accent, crisp borders, and no decorative motion (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:3-40`). The design document then turns that language into explicit typography, spacing, and color tables rather than leaving it as aesthetic guidance (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:44-135`). The color system has a three-tier surface hierarchy—`background` → `surface` → `surfaceLight`—plus semantic text, border, focus, error, and overlay roles (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:103-134`).

Adopt for Pi Remote: define semantic tokens first (`background`, `surface`, `surfaceRaised`, `text`, `textMuted`, `accent`, `border`, `danger`) and document their intent and usage. Keep the visual language small enough that a new screen can be composed from existing roles instead of inventing colors.

### F2 — Separate theme-dependent roles from theme-independent geometry and type

OGAM keeps light/dark values in `src/theme/palettes.ts`, while `FONTS`, `TYPOGRAPHY`, and `SPACING` live in `src/constants/index.ts` (`specs/context/OGAM-main/docs/standards/CODEBASE_GUIDE.md:2102-2129`). The constants define one Menlo font and named type roles from `display`/`h1`/`h2`/`h3` through `body`, `label`, and `meta`, plus a six-step spacing scale from 4 to 32 (`specs/context/OGAM-main/src/constants/index.ts:160-242`). This keeps a theme switch from changing layout rhythm while still allowing contrast and surface semantics to change.

Adopt for Pi Remote: maintain separate modules for semantic color/elevation tokens and invariant typography/spacing tokens. Components should ask for role names, not raw hex values or arbitrary spacing values.

### F3 — Use a hook plus memoized style factory as the component seam

`useTheme()` resolves the persisted `appStore.themeMode`, falls back to the device color scheme for `system`, and memoizes `getTheme(resolvedMode)` (`specs/context/OGAM-main/src/theme/useTheme.ts:27-47`). The returned theme bundles `colors`, `shadows`, `elevation`, and `isDark` (`specs/context/OGAM-main/src/theme/useTheme.ts:20-25`). `useThemedStyles(factory)` passes typed colors and shadows to a factory and memoizes the resulting `StyleSheet` on the theme mode (`specs/context/OGAM-main/src/theme/useThemedStyles.ts:6-23`). The documented usage makes the seam explicit: components call the hook, styles consume `colors`/`shadows`, and non-hook code can use `getTheme(mode)` (`specs/context/OGAM-main/docs/standards/CODEBASE_GUIDE.md:2106-2127`).

Adopt for Pi Remote: expose one `useTheme()`/`createThemedStyles()` seam to Svelte components or CSS-variable adapters, and make non-component services resolve a theme through an explicit pure function. Memoize the derived style object by theme mode so streaming transcript updates do not rebuild styles on every token.

### F4 — Encode depth and state through semantic elevation, not ad hoc decoration

The palette exports theme-aware shadows (`small`, `medium`, `large`, `glow`) and `createElevation(colors)` provides reusable levels 0–4 plus a sheet handle (`specs/context/OGAM-main/src/theme/palettes.ts:90-169`). Elevation levels derive backgrounds and borders from semantic colors; higher levels also carry platform blur/overlay data (`specs/context/OGAM-main/src/theme/palettes.ts:124-169`). The design guide maps these roles to standard headers, cards, buttons, inputs, and state treatments (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:138-220`, `261-277`).

Adopt for Pi Remote: define a small surface/elevation ladder for chat canvas, message/tool rows, composer, popovers, and modal layers. Bind focus, pressed, disabled, loading, and error states to semantic tokens so state styling remains consistent across the PWA.

### F5 — Make token compliance reviewable with a component checklist, but do not assume it is enforced

The design document gives a concrete checklist: themed hooks, typography scale, spacing scale, theme-only colors and shadows, uppercase labels, metadata styles, standard buttons/cards, state styling, contrast, and touch targets of at least 44px (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:331-345`). Representative chat styles follow the intended pattern for message surfaces and typography, using `ThemeColors`, `TYPOGRAPHY`, and `SPACING` (`specs/context/OGAM-main/src/components/ChatMessage/styles.ts:1-3`, `116-135`, `208-220`). However, the rule is not universal in the inspected code: `ChatInput` still contains direct numeric padding/gap/radius/font values and a hardcoded warning color despite importing token modules (`specs/context/OGAM-main/src/components/ChatInput/styles.ts:1-18`, `19-32`, `183-191`). Palette tests cover elevation structure and light/dark blur selection, but not component-level absence of raw values (`specs/context/OGAM-main/__tests__/unit/theme/palettes.test.ts:11-81`).

Adopt for Pi Remote: keep the checklist as a PR/review gate and add a lint or grep-based check only if the team needs a hard guarantee. Treat raw values as deliberate exceptions that must be local, named, and justified; otherwise the architecture can drift while the documentation still claims full compliance.

### F6 — Keep documentation and runtime tokens synchronized as a tested contract

The codebase guide repeats the ownership and usage model and records persisted theme preference plus the Settings toggle (`specs/context/OGAM-main/docs/standards/CODEBASE_GUIDE.md:2102-2112`). There is nevertheless a concrete documentation/runtime drift: the design guide describes dark shadows as white opacity 0.08–0.12 with radius 1–3 (`specs/context/OGAM-main/docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:118-126`), while the executable dark palette uses opacity 0.18–0.25 and radii 6–10 (`specs/context/OGAM-main/src/theme/palettes.ts:108-120`). Existing tests validate blur mode and structure, not these documented shadow values (`specs/context/OGAM-main/__tests__/unit/theme/palettes.test.ts:15-42`, `60-81`).

Adopt for Pi Remote: choose the runtime token file as the authoritative implementation, generate or regularly verify the token table from it, and test the values that materially affect the product language. This avoids a design review approving one visual contract while the shipped UI implements another.

## Questions Answered

- [x] [ease-of-use] How is OGAM's theme + design-token system structured so components never hardcode color/spacing/typography and stay consistent under a documented brutalist/terminal language? A documented semantic token contract, split theme/invariant token modules, a memoized themed-style seam, elevation roles, and a review checklist provide the pattern; code inspection shows the no-hardcoding rule is guidance rather than an enforced invariant.

## Questions Remaining

- [ ] [logic] How does OGAM model a streaming assistant reply as a single-identity state machine from before-first-token through finalization?
- [ ] [architecture] How does OGAM enforce reactive-store-as-read-only-projection while a service owns the authoritative state machine, side-effects, and resources?
- [ ] [ux] How does OGAM render streaming transcript items, reasoning, and tool rows as fast, collapsible first-class surfaces?
- [ ] [ux] What mobile composer, keyboard, attachment, haptics, and failure-message ergonomics are directly adoptable?
- [ ] [other] How are long-session context budgets and prompt-injection defenses bounded?

## Next Focus

Angle 2 [architecture]: service-owned generation/session and compaction state versus reactive-store projections, including observable boundaries and persistence ownership.
