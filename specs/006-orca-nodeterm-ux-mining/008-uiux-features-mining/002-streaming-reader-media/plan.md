---
title: "Phase 2 plan - streaming/reader/media over real files, quick-wins first, fail-closed"
description: "Sequenced approach for the transcript-clarity, reader, and media findings: land the streaming-clarity batch (SP-1, SP-2, SP-4) and the media quick-wins (MA-1, MA-4, MA-2) first, then the reader gestures and safety gates (TE-1, TE-2, TE-4, TE-5), the artifact-find stepper (MA-5), and the reusable primitives (MI-4 then MI-2). Proven by token-identity 0-diff, test:web, a11y-parity from the final state."
trigger_phrases:
  - "streaming reader media plan approach"
  - "streaming reader media phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/002-streaming-reader-media"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the streaming/reader/media plan; streaming-clarity batch sequenced first."
    next_safe_action: "Await operator go, then build SP-1, SP-2, SP-4 together."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 plan - streaming/reader/media

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | None; all findings read existing DTO fields or are pure rendering/local state |
| **Testing** | Vitest (`test:web`), token-identity CSS resolver |

### Overview
Make the streaming transcript legible and render diffs, images, and mermaid correctly, then add the reader gestures, fail-closed path/scheme handling, in-app browser, artifact-find stepper, and the two reusable primitives. The streaming-clarity batch and media quick-wins ship first; the reusable excerpt helper is built before the injection-guard string that rides it.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ in spec.md with acceptance criteria.
- [ ] The transcript/artifact token-identity and test:web baseline is captured before any change.
- [ ] The mermaid offline-engine bundling and isolation decision is made before MA-2 starts.

### Definition of Done
- [ ] The six Wave-1 P0 findings each pass their acceptance test.
- [ ] MA-2 falls back to the code block on parse/CSP failure; TE-2 detection ships without the TE-3 open action.
- [ ] token-identity 0-diff on unchanged transcript/artifact CSS, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The transcript renders through `rich-content-router.svelte` and `transcript-list.svelte`; artifacts render through the `artifacts/` previews; untrusted agent markdown routes through `safe-markdown.svelte` and `prose-link.ts`. These findings sit on those seams and read only existing DTO fields.

**Streaming clarity (SP-1, SP-2, SP-4).** SP-1 adds a dedicated thinking branch in `rich-content-router.svelte` before the activity `RichBlockFrame`, with an always-expanded disclosure default in `transcript-disclosure.svelte.ts`. SP-2 renders live elapsed in `transcript-list.svelte` from the existing 1 second `stallClock` (stallClock minus mostRecentBlockAt), surfaced via `runtime-status-region.svelte`. SP-4 adds a local `workingInterrupted` flag in `screen-chat.svelte`/`streaming-derivations.ts`, set on Stop and cleared only when `transcript.epoch` advances. All three touch the running/streaming presentation and land together.

**Media (MA-1, MA-4, MA-2).** MA-1 parses the `@@` hunk headers already in `patch` into a file header, a per-line gutter, and a +N/-M stat in `diff-preview.svelte`; the raw `<pre>` diff branch in `rich-content-router.svelte` shares the parse. MA-4 keeps the naturalWidth/Height the existing onload already computes in `image-preview.svelte` for a W×H chip, and adds a checkerboard backdrop. MA-2 renders a mermaid fence in `safe-markdown.svelte` through a new sandboxed renderer under `rich-content/`: a sandboxed iframe plus a bundled offline engine, escaping then falling back to the inert code block on parse error or CSP block.

**Reader (TE-1, TE-2, TE-4, TE-5).** TE-1 adds a `use:` pinch gesture action under `shared/primitives/` over the virtualized scroll host in `transcript-list.svelte`, transient scale 0.8x to 1.8x, composed to work mid-scroll. TE-2 extends `renderInlineParts` in `safe-markdown.svelte` and `isFilePathToken` in `prose-link.ts` to classify bare-prose and code-span file paths, fail-closed; the open action is TE-3 (host-gated, phase 006). TE-4 hardens `hasUnsafeOrLocalScheme` and `isUnsafeMarkdown` into one fail-closed scheme gate. TE-5 routes a tapped external URL through a new lightweight in-app WebView/iframe overlay under `artifacts/` instead of the OS browser.

**Artifact find (MA-5).** MA-5 adds a match count and next/prev stepper in `preview-controls.svelte` and `code-preview.svelte`, reusing the `findParts` boundaries in `transcript-find-index.ts`.

**Reusable primitives (MI-4, MI-2).** MI-4 is a pure tail-preserving budget-capped excerpt module under `shared/format/` near `format.ts`: keep the newest content, insert `[Earlier … omitted: N characters]`, never silent truncation. MI-2 is a single prompt-injection-guard const under `shared/commands/` or `shared/state/`, consumed wherever a quote or continue draft re-feeds transcript into a live turn. Build MI-4 first; MI-2 rides it.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · streaming-clarity batch and media quick-wins
Land SP-1, SP-2, SP-4 together (the running/streaming presentation batch). Then MA-1 (diff enrichment, built first because phase-006 CR-4 reuses it), MA-4 (image dimensions plus checkerboard), and MA-2 (mermaid, the one L-effort item) after the offline-engine decision. Capture the transcript/artifact token-identity and test:web baseline first.

### Phase 2 · reader gestures, safety gates, artifact find, primitives
Land TE-1 (pinch), TE-2 (path detection, no open action), TE-4 (fail-closed scheme gate), TE-5 (in-app browser), and MA-5 (find stepper). Build MI-4 (excerpt helper) then MI-2 (injection-guard const riding MI-4).

### Phase 3 · verification
Run token-identity on unchanged transcript/artifact CSS, the per-finding regression tests, the MA-2 fallback test, the TE-4 scheme table, test:web, and the a11y-parity check. Confirm every task traces to a finding. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Streaming clarity batch** - SP-1, SP-2, SP-4 all touch the running/streaming presentation (`rich-content-router.svelte`, `transcript-list.svelte`, `screen-chat.svelte` running). Land together.
- **Excerpt primitive** - MI-4 is the load-bearing helper behind MI-2 (and phase-006 MI-1). Build MI-4 first; MI-2 rides it immediately.
- **Diff reuse** - MA-1's `@@`-header parse enriches `diff-preview.svelte`, which phase-006 CR-4 later reuses for the change-review changed-files diff. Build MA-1 first (cross-phase dependency).

| Finding | Depends On | Blocks |
|---------|------------|--------|
| SP-1 | None | None |
| SP-2 | None | None |
| SP-4 | None | None |
| MA-1 | None | Phase-006 CR-4 (reuses diff-preview) |
| MA-4 | None | None |
| MA-2 | Offline-engine decision | None |
| TE-1 | None | None |
| TE-2 | None | Phase-006 TE-3 (open action) |
| TE-4 | None | Phase-006 TE-3 |
| TE-5 | None | None |
| MA-5 | None | None |
| MI-4 | None | MI-2, phase-006 MI-1 |
| MI-2 | MI-4 | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Streaming batch + media quick-wins | Med/High | SP-1 M, SP-2 S/M, SP-4 S/M, MA-1 M, MA-4 M, MA-2 L |
| Reader + primitives | Med | TE-1 M, TE-2 M, TE-4 S/M, TE-5 M, MA-5 M, MI-4 M, MI-2 S |
| Verification | Low/Med | token-identity, per-finding tests, a11y-parity |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | MI-4 excerpt boundaries; MA-1 hunk parse; TE-2 path classifier; TE-4 scheme table | Vitest |
| Interaction | SP-2 live tick; SP-4 epoch re-arm; TE-1 pinch bounds; MA-5 stepper | `test:web` |
| Fail-closed | MA-2 parse/CSP fallback to code block; TE-4 unsafe-scheme reject | Vitest |
| Visual | token-identity 0-diff on unchanged transcript/artifact CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `rich-content-router.svelte`, `transcript-list.svelte` seams | Internal | Green | Streaming batch pivots on them |
| Bundled offline mermaid engine | External (bundle) | Yellow | MA-2 needs a CSP-safe engine decision |
| `findParts` in `transcript-find-index.ts` | Internal | Green | MA-5 reuses it |
| `prose-link.ts` classifier | Internal | Green | TE-2 and TE-4 extend it |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A token-identity diff on unchanged transcript/artifact CSS, a mermaid CSP violation, or a reader-gesture regression.
- **Procedure**: All changes are confined to `app-mobile/src/pages/chat/**` and `app-mobile/src/shared/{state,primitives,commands,format}/**` plus new sibling modules. `git checkout -- app-mobile` restores the prior transcript and artifact rendering. No host contract is created and no data migration exists, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
