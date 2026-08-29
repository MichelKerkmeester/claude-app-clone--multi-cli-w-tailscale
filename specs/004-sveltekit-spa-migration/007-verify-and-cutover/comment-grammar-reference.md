<!-- SPECKIT_TEMPLATE_SOURCE: freeform | reference -->
<!-- SPECKIT_LEVEL: 2 -->

# House comment grammar — the canonical reference (X0.3)

> The decided comment/section convention for `app-mobile/src`, grounded in the vocabulary already in the tree (measured 2026-08-22: `@ds slot` 595 · `state` 386 · `guardrail` 275 · `surface` 243 · `edit` 105 · `end` 60 · `variant` 2). **This is the payload 008 encodes into `sk-code` — 008 must not re-invent it (drift risk).** Nothing here changes a rendered value: it is comment structure only. Applying it is Phase B (comment-only source edits); this doc is the spec, authored in Phase 0 with zero source change.

---

## The four elements

Every source file carries these four, scaled to its size. Nothing more (no new toolchain, no mandated boilerplate on trivial files).

### 1. File-header purpose line
One banner at the top stating what this file *is* and why it exists — never a restatement of the code.
- **`.svelte` components:** an `@ds surface: <name> — <one-line purpose>` (or `@ds primitive:` / `@ds route:` for those classes) as the top comment **inside the top `<script>` block**. **NEVER place a header in `<style>`** — Svelte's scope-hash can shift and a comment there risks the guardrail-fence text diff.
- **`.svelte.ts` / `.ts` logic:** a `// MODULE: <Title>` banner + a short purpose paragraph. 8 of 14 `.svelte.ts` and 1 `shared/data` `.ts` currently lack one (census X0.1) — backfill in Phase B XB.2.
- The 27 marker-less `.svelte` files (census §1.3) get this header in Phase B: 13 primitives → `@ds primitive:`, 4 routes → `@ds route:`, 10 components → `@ds surface:`.

### 2. WHY-not-what inline comments
Inline comments explain **why**, never restate **what** the line does. The load-bearing example is the react-aria state shim: `.sel:global([data-hovered])` carries a WHY comment explaining the `use:hover`/`use:press` action pattern (not native `:hover`, which sticks after tap on touch). **These WHY comments are Claude-only judgment — no gate protects them; an executor must never delete a `.sel:global([data-*])` WHY.** Deleting one silently reintroduces the touch-sticky a11y regression.

### 3. The `@ds` marker vocabulary (design-system correlation grammar)
The existing marker set — use these keywords, no others (008's hook rejects `@ds` keywords outside this legend):

| Keyword | Means | Placement |
|---------|-------|-----------|
| `@ds surface: <name>` | a top-level component surface | file header + its CSS block |
| `@ds slot: <name>` | a named sub-region within a surface | markup + its CSS block |
| `@ds state: <a · b · c>` | the state variants a surface renders | above the state's CSS |
| `@ds edit: <area> — <note>` | a safe-to-edit area + guidance | above the editable block |
| `@ds variant: <name>` | a prop-driven visual variant | above the variant's CSS |
| `@ds guardrail: <why>` | a **do-not-edit** protected region (frozen value / a11y / security) | opens the fence |
| `@ds end <surface\|guardrail>` | closes a `surface`/`guardrail` block | after the block |

**Rules:** one `@ds surface:` **per distinct surface per file** — collapse the same-surface markup+HTML-comment+CSS echo to a canonical single marker (census §2.2: RuntimeStrip 7→3), but **keep distinct surfaces** in god-files (never collapse to once-per-file). The 275 `@ds guardrail:` fences are frozen text — the per-file fence-TEXT diff (64 files) proves none were altered.

### 4. One-line TSDoc on exports only
Each exported symbol under `shared/data` gets a one-line `/** … */`. Non-exported helpers do **not** need one — TSDoc is for the module's public surface, not internal churn. No presence-enforcement toolchain (svelte-check can't check doc presence; standing up eslint is out of scope for a re-host).

---

## Section segmentation (TOP PRIORITY — every file, scaled to size)

Segment every `.svelte` and `.svelte.ts` into labelled comment SECTIONS (sk-code / opencode style) so an editor can jump to a region. **Banner weight scales to file size** — the point is navigability, not ceremony:

- **Tiny / leaf files (<~80 lines):** a minimal structure — the file header (element 1) + inline `@ds slot`/`@ds state` markers are usually enough. Do NOT force full banners onto a 30-line primitive.
- **Mid files:** light section dividers between the logical blocks (imports · types · state · derived · effects · handlers for logic; script · markup · style for components).
- **God-files (the 13 with ≥3 distinct surfaces, e.g. RuntimeStrip, SessionComposer, ModelEffortSheet):** full section banners per surface + per major block. These files carry the most navigation cost and earn the heaviest structure.

**Placement:** section banners live in `<script>` and `<style>` region boundaries for components, but the FILE HEADER stays in `<script>`, never `<style>` (element 1 rule). Logic files use `// ───── SECTION ─────` style dividers.

---

## Comment hygiene (HARD — carried from the constitutional rule)
- **No ephemeral artifact labels** in code comments: no spec paths, packet/phase numbers, ADR/REQ/task/finding ids. Keep the durable WHY. (This doc — a spec doc — may reference them; code may not.)
- **No stale refs:** no `.tsx`/`style.css`/`SafeMarkdown.tsx` pointers to deleted files (census §2.1: ~20 now-false `style.css` claims to fix, ~85 provenance mentions to reword). An editor who greps a deleted filename should find zero live hits.
- **Trace before rewording:** never touch a `.react-aria-*` selector or a `data-*` attribute name — the `.react-aria-*` classes are a **live class-name shim**, not dead React (verify the real producer first).

---

## Explicitly NOT part of the grammar (council-trimmed — do not enshrine)
No eslint/TSDoc-presence toolchain · no bulk `prettier-plugin-svelte` reflow (byte-identity HARD STOP — plugin is format-on-save going-forward only) · no god-file splits (that is redesign, a gated post-cutover amendment — do NOT codify 1700-line files as "the convention") · no barrels · no factory/dir renames · no `@keyframes`-stub deletion · no `$primitives`/`$data` aliases (only `$shared`). Full rationale: `ai-council-007-ext-synthesis.md` "Deferred / rejected".

---

## Handoff
- **008 (`sk-code`)** encodes this reference verbatim + adds the ONE enforcement slice: extend the PostToolUse comment-hygiene hook to reject any `@ds` keyword outside the table above. It must NOT invent grammar.
- **009 (Storybook)** reads the taxonomy for free: `@ds surface:` header = the story-per-surface coverage key; `@ds primitive:` / `@ds route:` = the story-exempt allowlist.
