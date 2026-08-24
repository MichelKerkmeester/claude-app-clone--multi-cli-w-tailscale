---
title: "Phase B implementation summary — comment structure"
description: "55 .svelte files converged on one section-banner vocabulary and order, proven a pure comment-and-reorder pass by an identical per-file code-line multiset, fences held at 277 and @ds held at 1030, and green across the whole gate."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/002-comment-structure"
    last_updated_at: "2026-08-24T11:01:11Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "55 files harmonized; fences 277; @ds 1030; whole gate green."
    next_safe_action: "Proceed to Phase C (update the sk-code-mobile-cli skill)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

55 `.svelte` files now name their script sections with one canonical vocabulary and order:
`IMPORTS → PROPS → LOCAL STATE → DERIVED STATE → EFFECTS → HANDLERS → HELPERS`, plus `TYPES` and
`CONSTANTS` for `<script module>` sections. The synonyms are gone — a grep for `PUBLIC PROPS`,
`RENDER STATE`, `PROPS AND STATE` and `CAPABILITY STATE` returns zero. Bannered files rose from 51 to
65: the 14 significant bare files gained banners; the 31 trivial pass-through primitives (menu, sheet,
choice items, `+page.svelte`, small chrome) stayed bare on purpose.

Six genuinely domain-specific section names were preserved rather than flattened — `MARKDOWN MODEL`,
`BOUNDED PARSER`, `LIVE REGION STATE`, `LIFECYCLE STATES`, `STATUS DEFINITIONS`, `STATUS MESSAGE` — each
naming what that one file actually does.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Seven disjoint directory batches ran on cli-codex, gpt-5.6-luna, xhigh, fast, after a four-file pilot
proved the pipeline safe. Claude owned the barrier: the fence count, the `@ds` set, the code-line
multiset, and every gate. A pilot gap — the synonym map wrongly flattened a module-script exported
interface (`PUBLIC PROPS`) to `PROPS` — was fixed by hand and closed in the contract with a module-script
rule (`<script module>` sections are `TYPES`/`CONSTANTS`, never `PROPS`/`STATE`).

The pass was gated as a pure comment-and-reorder change: for every one of the 55 files, the multiset of
non-comment, non-blank lines is byte-identical between `HEAD` and the result, so no executable, markup or
style line changed — only comments moved or were added, and whole section blocks reordered. One `@ds
guardrail` comment (the deterministic-ranker note in `command-palette`) moved with its `const ranked`
derivation during a canonical reorder; it still sits directly above the code it guards and the fence
count held at 277.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**A section reorders only when it introduces no forward reference.** Two files kept `DERIVED STATE`
before `LOCAL STATE` against the canonical order because a later local declaration reads the earlier
derived — `card-code`'s `previewTokens` reads `preview`, and `attachment-draft-provider`'s `draftState`
initializer reads `mediaAvailable`. Reordering either would forward-reference a rune and break at the
temporal dead zone, so they were left and are recorded here.

**Module scripts have their own vocabulary.** A `<script module>` holds exported types, constants and
helpers, not component props, so it uses `TYPES`, `CONSTANTS`, `HELPERS` or a preserved domain name and
is numbered continuously with the instance script — never labeled `PROPS` or `STATE`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Code-line multiset per file | Identical across all 55 files (comment/reorder only) |
| `@ds guardrail` fences | 277, preserved |
| Total `@ds` lines | 1030, unchanged |
| Synonym grep | Zero remaining |
| Build | RC 0 |
| Typecheck | 1124 files, 0 errors |
| `npm run test:web` | 68 files / 545 passed + 3 skipped and 17 files / 189 passed, RC 0 |
| Token identity | 0 changed / 0 vanished / 0 added across light, dark, system |
| Catalog smoke | 267 stories × 2 themes = 534 frames, 0 throws |
| `validate.sh --strict` | exit 0 through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Two files remain `DERIVED STATE` before `LOCAL STATE`.** `card-code` and `attachment-draft-provider`
are held that way by a real data dependency, not an oversight; the canonical order is the rule
everywhere it is safe. **A handful of files carry two `IMPORTS` sections** — one in the module script,
one in the instance script — which is accurate (both import) if slightly redundant. The 31 trivial
primitives stay bare by design; a banner set there would be boilerplate over a ten-line component.
<!-- /ANCHOR:limitations -->
