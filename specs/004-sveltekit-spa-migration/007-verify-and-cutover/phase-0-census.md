<!-- SPECKIT_TEMPLATE_SOURCE: freeform | note -->
<!-- SPECKIT_LEVEL: 2 -->

# 007-EXT Phase 0 — Census & calibration (X0.1)

> Claude-only, read-only re-measurement of the current `app-mobile/src` tree, run 2026-08-22 before staffing Phase A/B. The AI council flagged its own sequencing counts as unreliable (1.5–2.4× off); this replaces the estimates with measured ground truth and surfaces three refinements to the plan. Measurement commands are reproducible `rg`/`find` over `app-mobile/src` (+ `app.css`), excluding `node_modules`.

## 1. Measured census vs council estimate

| Item | Council estimate | **Measured** | Delta / note |
|------|------------------|--------------|--------------|
| `.svelte` components | — | **95** | — |
| `.svelte.ts` logic factories | — | **14** | — |
| plain `.ts` (excl `.svelte.ts`/`.d.ts`) | — | **87** | — |
| **Marker-less `.svelte`** (no `@ds surface/primitive/route`, no `// MODULE:`) | ~26 | **27** | +1 — estimate was accurate. XB.2 tag target. |
| `@ds guardrail:` markers | ≥76 gate (176 total per WS-A) | **275 across 64 files** | Gate safe by a wide margin. Fences are single-line markers (no paired `-end`). |
| Missing `// MODULE:` banners (logic files) | 6 | **~9** | 8 of 14 `.svelte.ts` + 1 of 23 `shared/data` `.ts` lack one. `.svelte` components use `@ds surface` headers, not `// MODULE:` — MODULE is the **logic-file** convention. |
| Dead `style.css` references | ~86 lines / 59 files (council); ~150 (sequencing lens) | **105 occurrences / 67 files** | Between the two estimates — but NOT a uniform purge (see §2.1). |
| `@ds surface:` repeat files | "4-surface god-files" | **45 files with >1 marker; 30 with ≥3** | Repeats are same-surface echoes, NOT distinct surfaces (see §2.2). |

### The 27 marker-less `.svelte` files (XB.2 tagging target)
- **13 primitives** (`shared/primitives/`): Button, Collapsible, Menu + MenuContent/Item/Trigger, RadioGroup + RadioGroupItem, Sheet + SheetClose/Content/Title, ToggleGroup + ToggleGroupItem → tag `@ds primitive:`.
- **4 routes** (`routes/`): `+layout`, `+page`, `attention/[lookupId]/+page`, `session/[id]/+page` → tag `@ds route:`.
- **10 components:** artifacts (ArtifactDetails, ImagePlaceholder, InboundImageBlockView, SecureImagePreview), attachments (AttachmentDraftProvider), chrome (EffortRadioGroup), rich-content (RedactionBadge), transcript (NormalizedTranscriptBlockView), `shared/chrome/RootErrorBoundary` → tag `@ds surface:` header.

## 2. Three refinements to the council plan

### 2.1 The `style.css` "purge" is a 2-class classified pass, not find/replace
The 105 references split by truth-value, not uniformly:
- **~20 now-FALSE present-tense claims** — e.g. `Home.svelte:116` *"forced-colors / reduced-motion .session-card groups stay GLOBAL in style.css (unchanged)"*. `style.css` is deleted (`be76d77`), so these **actively mislead an editor**. → **MUST fix** (reword to current reality).
- **~85 provenance mentions** — `@ds surface:` headers reading *"Decomposed from style.css; …"*. Historically true, harmless, but point at a deleted file. → **Decision needed** (§3): drop the dead-file pointer while keeping the "decomposed" WHY, or keep verbatim as history.
- A few in `src/README.md` (a table row listing `style.css` as a live file → Phase A doc rewrite, XA.1) and one test.

A blind `style.css` find/replace would rewrite provenance and false-claims identically and could fabricate wrong statements — exactly the failure XA.1 warns of. Phase B XB.3 must classify first.

### 2.2 `@ds surface:` collapse scope corrected — preserve distinct surfaces
The "45 files with >1 marker" is NOT the collapse count. Within a file, one surface is echoed across **markup + HTML-comment + CSS `/* */`**. Distinct surfaces per god-file:

| File | Occurrences | Distinct surfaces |
|------|-------------|-------------------|
| `RuntimeStrip.svelte` | 7 | **3** (runtime-strip, effort-trigger, build-plan-toggle) |
| `Block.svelte` | 5 | **2** |
| `ModelEffortSheet.svelte` | 4 | **2** |

Collapse target = the redundant **same-surface** repeats (markup/comment/CSS echo) → a canonical once-per-surface. **Distinct surfaces stay** — collapsing to once-per-*file* would wrongly merge them. The council's "NOT once-per-file — breaks the 4-surface god-files" warning is **validated by measurement**.

### 2.3 Per-file fence-text-diff gate scope = 64 files
The council's per-file unchanged-fence-TEXT diff (the gate that closes token-identity's fence-content blindness) must cover **all 64 fence-bearing files**, not the ~39 the synthesis assumed. **Phase 0 prerequisite:** capture the 64-file fence-text baseline **before** any Phase B edit, so the diff has a pre-edit oracle. (Add as X0.4.)

## 3. Open decision for Phase B kickoff
**`style.css` provenance mentions (~85):** drop the dead-file pointer (keep "Decomposed …" WHY without the stale path), or keep verbatim as durable history? Recommendation: **reword to keep the WHY, drop the dead pointer** — an editor who greps `style.css` should find zero live hits, so the file reads as truly gone. Confirm at Phase B staffing.

## 4. Status
X0.1 **DONE** (measured, this doc). Downstream: X0.2 ✅ (React-completion, `0757d83`); X0.3 (grammar reference) + X0.4 (fence-text baseline capture) remain in Phase 0. Numbers here supersede the council's estimates for Phase A/B staffing.
