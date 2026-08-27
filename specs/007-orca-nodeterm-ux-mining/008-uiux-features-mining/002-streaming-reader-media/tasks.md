---
title: "Phase 2 tasks - streaming/reader/media ledger (SP, MA, TE, MI findings)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/002-streaming-reader-media"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the streaming/reader/media task ledger; all tasks open."
    next_safe_action: "Await operator go, then start the streaming-clarity batch."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 tasks - streaming/reader/media

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN - this packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: STREAMING-CLARITY BATCH + MEDIA QUICK-WINS

- [ ] T1.1 [SP-1 → REQ-001] Add a dedicated always-expanded thinking branch before the activity `RichBlockFrame` in `pages/chat/rich-content/rich-content-router.svelte` (~L52-79, ~L158-165); set the expanded disclosure default in `shared/state/transcript-disclosure.svelte.ts`. Done: thinking renders as a muted-prose row without a tap; test asserts branch order.
- [ ] T1.2 [SP-2 → REQ-002] Render live "Working - m:ss" from the existing 1s `stallClock` (stallClock minus mostRecentBlockAt) in `pages/chat/transcript/transcript-list.svelte` (~L365-400), surfaced via `pages/chat/transcript/runtime-status-region.svelte`. Done: label ticks per second; test drives the clock.
- [ ] T1.3 [SP-4 → REQ-003] Add a local `workingInterrupted` flag in `pages/chat/screen-chat.svelte` (running ~L261-274, stopRun ~L418-430) plus a helper in `shared/state/streaming-derivations.ts`; clear only when `transcript.epoch` advances. Done: Stop hides working immediately; new epoch re-arms.
- [ ] T1.4 [MA-1 → REQ-004] Parse `@@` hunk headers in `pages/chat/artifacts/diff-preview.svelte` (~L15-22) into a file header, per-line gutter, and +N/-M stat; share the parse with the raw `<pre>` branch in `rich-content-router.svelte` (~L166-170). Done: multi-hunk patch renders correct line numbers and stat. Built first (phase-006 CR-4 reuses).
- [ ] T1.5 [MA-4 → REQ-005] Keep naturalWidth/Height from the existing onload in `pages/chat/artifacts/image-preview.svelte` (~L115-118) for a W×H chip; add a checkerboard backdrop (~L178-195). Done: dimensions shown, transparent PNG reads correctly.
- [ ] T1.6 [MA-2 → REQ-006] Render a mermaid fence in `pages/chat/rich-content/safe-markdown.svelte` (fence ~L487-503, allowlist ~L384-406) via a new sandboxed renderer under `pages/chat/rich-content/`: sandboxed iframe + bundled offline engine, escape-then-fallback to the code block. Done: valid fence renders, invalid falls back, both tested under CSP.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: READER GESTURES, SAFETY GATES, ARTIFACT FIND, PRIMITIVES

- [ ] T2.1 [TE-1 → REQ-007] Add a `use:` pinch gesture action under `shared/primitives/` over the virtualized scroll host in `pages/chat/transcript/transcript-list.svelte` (~L380-424); transient scale 0.8x-1.8x, composed to work mid-scroll. Done: pinch scales within bounds without hijacking scroll.
- [ ] T2.2 [TE-2 → REQ-008] Extend `renderInlineParts` in `pages/chat/rich-content/safe-markdown.svelte` (~L223-267) and `isFilePathToken` in `pages/chat/rich-content/prose-link.ts` to classify bare-prose and code-span file paths (whitelisted extensions, URL-guarded, fail-closed). Done: `path/file.ts:42` detected in prose and code-span; URL not misclassified. Open action is TE-3 (phase 006).
- [ ] T2.3 [TE-4 → REQ-009] Harden `hasUnsafeOrLocalScheme` in `pages/chat/rich-content/prose-link.ts` and `isUnsafeMarkdown` in `safe-markdown.svelte` (~L270-286) into one fail-closed scheme gate (web/mailto external, file/scheme-less preview, reject javascript:/tel:/custom). Done: scheme table test green.
- [ ] T2.4 [TE-5 → REQ-010] Route a tapped external URL through a new lightweight in-app WebView/iframe overlay under `pages/chat/artifacts/` instead of `target="_blank"` in `safe-markdown.svelte` (~L450). Done: in-app overlay opens, chat not backgrounded, PWA caveat documented in the component.
- [ ] T2.5 [MA-5 → REQ-011] Add a match count and next/prev stepper in `pages/chat/artifacts/preview-controls.svelte` (~L105-110) and `pages/chat/artifacts/code-preview.svelte`, reusing `findParts` in `pages/chat/transcript/transcript-find-index.ts`. Done: {i}/{count} shown, jump works, highlight-all preserved.
- [ ] T2.6 [MI-4 → REQ-013] Build a pure tail-preserving budget-capped excerpt module under `shared/format/` near `format.ts`: keep the newest content, insert `[Earlier … omitted: N characters]`, never silent truncation. Done: unit test covers over-budget, under-budget, and the omission marker. Built before MI-2.
- [ ] T2.7 [MI-2 → REQ-012] Add a single prompt-injection-guard const under `shared/commands/` or `shared/state/`; consume it wherever a quote/continue draft re-feeds transcript into a live turn. Done: const exists once, imported at each re-feed site, test asserts the guard is prepended. Rides MI-4.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] T3.1 [fail-closed] Assert MA-2 falls back to the inert code block on parse/CSP failure; TE-2 detection ships with no open action; TE-4 rejects unsafe schemes. Done: each fail-closed path tested.
- [ ] T3.2 [token-identity + test:web] token-identity 0-diff on unchanged transcript/artifact CSS; `test:web` green from the final state. Done: both captured.
- [ ] T3.3 [a11y-parity] Transcript live regions, artifact-find roles, in-app browser overlay dialog semantics, focus return preserved. Done: a11y-parity check green.
- [ ] T3.4 [traceability] Every task cites a finding id and a real file; each REQ has a covering task. Done: no traceless task.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] All P0 findings (SP-1, SP-2, SP-4, MA-1, MA-4, MA-2) implemented with acceptance tests green.
- [ ] All P1 findings (TE-1, TE-2, TE-4, TE-5, MA-5, MI-2, MI-4) implemented; MI-4 built before MI-2; TE-2 without the TE-3 open action.
- [ ] No `[B]` blocked task remains; MA-2 fallback and TE-4 reject paths proven.
- [ ] token-identity, test:web, a11y-parity green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements and acceptance criteria.
- `plan.md` - the sequenced approach and the streaming-clarity, excerpt, and diff-reuse batches.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 1, §5.2, §5.3, §5.4.
- `../006-host-usage-search-review/` - TE-3 open action and MI-1 both ride primitives built here.
<!-- /ANCHOR:cross-refs -->
